// gait-analysis (v4.39.0): AI review of a horse movement video.
// The browser samples JPEG frames from a video already attached to a
// movement observation or ride check and posts them here. The function
// checks the caller may record movement, asks Claude for a structured gait
// review, and saves it to horse_gait_analyses with the caller's own session
// (RLS and the author stamp apply). An aid for coaches, not a diagnosis.
//
// Secrets: ANTHROPIC_API_KEY (Edge Function secret). SUPABASE_URL and the
// publishable key are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0'
import { MODEL, GAITS, VIEWS, SYSTEM_PROMPT, RESULT_SCHEMA, clampFrames, buildUserContent, normalizeResult, mediaListed } from './gait-core.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
})
const fail = (message: string, status = 400) => json({ error: message }, status)

const firstNamedKey = (envName: string) => {
  try {
    const values = JSON.parse(Deno.env.get(envName) ?? '{}') as Record<string, string>
    return values.default ?? Object.values(values)[0] ?? ''
  } catch { return '' }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Method not allowed', 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? firstNamedKey('SUPABASE_PUBLISHABLE_KEYS')
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
  const authorization = req.headers.get('Authorization') ?? ''
  if (!supabaseUrl || !publicKey) return fail('Supabase function secrets are not configured', 500)
  if (!anthropicKey) return fail('ANTHROPIC_API_KEY is not configured', 503)
  if (!authorization.startsWith('Bearer ')) return fail('Missing member session', 401)

  const db = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await db.auth.getUser()
  if (authError || !authData.user) return fail('Invalid or expired member session', 401)
  const { data: canRecord, error: permError } = await db.rpc('cce_movement_can_record')
  if (permError || canRecord !== true) return fail('Missing permission: horse_care.manage', 403)

  let input: Record<string, any>
  try { input = await req.json() } catch { return fail('Invalid JSON body') }

  const kind = input.kind === 'check' ? 'check' : 'log'
  const recordId = Number(input.record_id)
  const mediaPath = String(input.media_path ?? '')
  const gait = GAITS.includes(input.gait) ? input.gait : 'trot'
  const view = VIEWS.includes(input.view) ? input.view : 'side'
  if (!Number.isInteger(recordId) || recordId <= 0) return fail('record_id is required')
  if (!mediaPath.startsWith('movement/')) return fail('media_path is invalid')

  let frames
  try { frames = clampFrames(input.frames) } catch (e) { return fail((e as Error).message) }

  // The video must belong to the record the caller can see.
  const table = kind === 'check' ? 'horse_ride_checks' : 'horse_movement_logs'
  const columns = kind === 'check' ? 'id,horse_id,media,notes' : 'id,horse_id,media,notes,limbs'
  const { data: record, error: recordError } = await db.from(table).select(columns).eq('id', recordId).maybeSingle()
  if (recordError || !record) return fail('Record not found', 404)
  const rec = record as Record<string, any>
  if (!mediaListed(rec.media, mediaPath)) return fail('This video is not attached to the record', 400)
  const { data: horses } = await db.rpc('cce_movement_horses')
  const horseName = (Array.isArray(horses) ? horses : []).find((h: any) => Number(h.id) === Number(rec.horse_id))?.horse_name ?? ''

  const base = {
    horse_id: rec.horse_id,
    movement_log_id: kind === 'log' ? recordId : null,
    ride_check_id: kind === 'check' ? recordId : null,
    media_path: mediaPath,
    gait,
    view,
    clip_start: frames[0].t,
    clip_end: frames[frames.length - 1].t,
    frame_count: frames.length,
    model: MODEL,
  }

  const client = new Anthropic({ apiKey: anthropicKey })
  let row: Record<string, unknown>
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema: RESULT_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserContent(frames, { horseName, gait, view, limbs: rec.limbs, notes: rec.notes }) as Anthropic.Beta.BetaContentBlockParam[] }],
    })
    const usage = { input_tokens: response.usage?.input_tokens ?? null, output_tokens: response.usage?.output_tokens ?? null, model: response.model ?? MODEL }
    if (response.stop_reason === 'refusal') throw Object.assign(new Error('The model declined to review this video.'), { usage })
    if (response.stop_reason === 'max_tokens') throw Object.assign(new Error('The review was cut short. Try a shorter clip.'), { usage })
    const textBlock = response.content.find((b: any) => b.type === 'text') as { text: string } | undefined
    if (!textBlock) throw Object.assign(new Error('The model returned no result.'), { usage })
    const parsed = normalizeResult(JSON.parse(textBlock.text), frames)
    row = { ...base, ...usage, status: 'done', ...parsed }
  } catch (e) {
    const err = e as Error & { usage?: Record<string, unknown>, status?: number }
    console.error('gait-analysis failed', err?.status ?? '', err?.message)
    const message = err instanceof Anthropic.RateLimitError ? 'The analysis service is busy. Try again in a minute.'
      : err instanceof Anthropic.AuthenticationError ? 'The analysis service key is invalid.'
      : err instanceof Anthropic.APIError ? `Analysis service error (${err.status ?? 'network'}).`
      : (err?.message || 'Analysis failed')
    row = { ...base, ...(err?.usage ?? {}), status: 'failed', error: message.slice(0, 500) }
  }

  const { data: saved, error: saveError } = await db.from('horse_gait_analyses').insert(row).select('*').single()
  if (saveError) return fail(`Could not save the analysis: ${saveError.message}`, 500)
  return json({ analysis: saved }, row.status === 'done' ? 200 : 502)
})
