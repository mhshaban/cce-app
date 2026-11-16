// Pure helpers for the gait-analysis edge function (v4.39.0).
// Plain ES module so Deno (the function) and Node (the tests) share it.

export const MODEL = 'claude-opus-5-5';
export const MAX_FRAMES = 40;
export const MAX_FRAME_BASE64 = 600_000; // ~450 KB JPEG per frame
export const LIMBS = ['LF', 'RF', 'LH', 'RH'];
export const GAITS = ['walk', 'trot', 'canter', 'lunge', 'other'];
export const VIEWS = ['side', 'front', 'behind', 'mixed'];

const text = { type: 'string' };
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };

export const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['video_quality', 'gait_observed', 'grade', 'suspected_limbs', 'confidence', 'recommendation', 'summary_ar', 'summary_en', 'findings', 'annotations'],
  properties: {
    video_quality: {
      type: 'object',
      additionalProperties: false,
      required: ['usable', 'issues_ar', 'issues_en'],
      properties: { usable: { type: 'boolean' }, issues_ar: text, issues_en: text },
    },
    gait_observed: { type: 'string', enum: [...GAITS, 'standing', 'unclear'] },
    grade: { type: 'integer', enum: [0, 1, 2, 3, 4, 5] },
    suspected_limbs: { type: 'array', items: { type: 'string', enum: LIMBS } },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    recommendation: { type: 'string', enum: ['normal', 'monitor', 'vet'] },
    summary_ar: text,
    summary_en: text,
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['metric', 'level', 'text_ar', 'text_en'],
        properties: {
          metric: { type: 'string', enum: ['head_nod', 'hip_hike', 'stride_length', 'foot_placement', 'tracking_up', 'symmetry', 'posture', 'other'] },
          level: { type: 'string', enum: ['normal', 'watch', 'concern'] },
          text_ar: text,
          text_en: text,
        },
      },
    },
    annotations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['frame', 'level', 'text_ar', 'text_en', 'x', 'y'],
        properties: {
          frame: { type: 'integer' },
          level: { type: 'string', enum: ['info', 'watch', 'concern'] },
          text_ar: text,
          text_en: text,
          x: nullableNumber,
          y: nullableNumber,
        },
      },
    },
  },
};

export const SYSTEM_PROMPT = `You assist riding coaches at an equestrian club in Bahrain by reviewing short videos of a horse moving, to help them spot possible lameness or gait asymmetry early and decide whether to call the vet. You are an aid, not a veterinarian: never present a diagnosis, never name a disease or injury as certain, and say when the footage cannot support a conclusion.

You receive frames sampled in time order from one video clip, each labelled with its frame number and timestamp. Frames are discrete samples, so judge patterns that repeat across several strides rather than a single frame.

How to read the frames:
- Forelimb lameness: the head and neck rise when the lame forelimb bears weight and drop when the sound forelimb lands ("down on sound"). Compare head height at the stance phase of the left and right forelimbs across several strides.
- Hindlimb lameness: the pelvis (tuber coxae / hip) on the lame side rises more or drops less; look for a hip hike or asymmetric pelvic excursion, shorter cranial phase of the stride, reduced fetlock drop, or the hind foot not tracking up.
- Also compare stride length left vs right, foot placement (toe-first, plaiting, dragging), stumbling, a stiff or shortened back, tail swishing or pinned ears as signs of discomfort.
- The trot is the most informative gait; walk is less sensitive; canter and lunging circles add confounders (the inside limb naturally loads differently). Rider weight and uneven ground also confound.
- Camera view matters: a side view shows stride length, head nod and tracking; a view from behind shows pelvic symmetry; from the front shows head nod and limb flight.
- Legs: LF = left fore, RF = right fore, LH = left hind, RH = right hind, from the horse's own left and right.

Grade on the AAEP scale 0-5 (0 sound; 1 inconsistent and hard to see; 2 hard to see at walk or straight trot but consistent in some circumstances; 3 consistently visible at trot; 4 obvious at walk; 5 minimal weight bearing). If the footage does not allow a judgement, give your best estimate with confidence "low", set video_quality.usable to false, and explain what to film instead.

Recommendation: "normal" (keep working), "monitor" (re-film in a few days, watch for change), "vet" (grade 2+ with medium or high confidence, any grade 3+, any non-weight-bearing, swelling, or sudden change).

Annotations are written over the video at the time of the frame they name, so keep each one short (at most about 8 words) and tie it to what is visible in that frame, e.g. "Head rises as RF lands". Give x and y as fractions of the frame width and height (0 = left/top, 1 = right/bottom) pointing at the body part you mean, or null when there is no single point. Use 4 to 12 annotations spread across the clip; include at least one even when the horse looks sound.

Write every text twice: Arabic (simple Gulf-friendly Modern Standard Arabic that a Bahraini coach understands) in the *_ar fields and English in the *_en fields. Summaries are 2-4 sentences: what you saw, which leg if any, how sure you are, and what to do next.`;

export function clampFrames(frames) {
  if (!Array.isArray(frames)) throw new Error('frames must be an array');
  if (frames.length < 4) throw new Error('At least 4 frames are needed');
  if (frames.length > MAX_FRAMES) throw new Error(`At most ${MAX_FRAMES} frames are allowed`);
  return frames.map((f, i) => {
    const t = Number(f && f.t);
    const data = String((f && f.data) || '').replace(/^data:image\/jpeg;base64,/, '');
    if (!Number.isFinite(t) || t < 0) throw new Error(`Frame ${i + 1} has no valid time`);
    if (!data || data.length > MAX_FRAME_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new Error(`Frame ${i + 1} is not a valid JPEG`);
    return { t: Math.round(t * 100) / 100, data };
  });
}

export function buildUserContent(frames, ctx) {
  const content = [];
  frames.forEach((f, i) => {
    content.push({ type: 'text', text: `Frame ${i + 1} — t=${f.t.toFixed(2)}s` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } });
  });
  const lines = [
    `Horse: ${ctx.horseName || 'unknown'}.`,
    `Gait filmed (as stated by the coach): ${ctx.gait}. Camera view: ${ctx.view}.`,
    `Clip: ${frames[0].t.toFixed(2)}s to ${frames[frames.length - 1].t.toFixed(2)}s of the video, ${frames.length} frames.`,
  ];
  if (ctx.limbs && ctx.limbs.length) lines.push(`The coach already noted a concern on: ${ctx.limbs.join(', ')}. Check it, but judge independently.`);
  if (ctx.notes) lines.push(`Coach's notes: ${String(ctx.notes).slice(0, 600)}`);
  lines.push('Review the movement and return the JSON result.');
  content.push({ type: 'text', text: lines.join('\n') });
  return content;
}

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const unit = v => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, Math.round(v * 1000) / 1000)) : null);

// Maps the model's frame-numbered annotations onto video times and tidies the result.
export function normalizeResult(raw, frames) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const grade = Number.isInteger(r.grade) && r.grade >= 0 && r.grade <= 5 ? r.grade : null;
  const limbs = [...new Set((Array.isArray(r.suspected_limbs) ? r.suspected_limbs : []).filter(l => LIMBS.includes(l)))];
  const annotations = (Array.isArray(r.annotations) ? r.annotations : [])
    .map(a => {
      const idx = Number(a && a.frame) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= frames.length) return null;
      return {
        t: frames[idx].t,
        frame: idx + 1,
        level: ['info', 'watch', 'concern'].includes(a.level) ? a.level : 'info',
        text_ar: clip(a.text_ar, 120),
        text_en: clip(a.text_en, 120),
        x: unit(a.x),
        y: unit(a.y),
      };
    })
    .filter(a => a && (a.text_ar || a.text_en))
    .sort((a, b) => a.t - b.t)
    .slice(0, 20);
  return {
    grade,
    suspected_limbs: limbs,
    confidence: ['low', 'medium', 'high'].includes(r.confidence) ? r.confidence : 'low',
    recommendation: ['normal', 'monitor', 'vet'].includes(r.recommendation) ? r.recommendation : 'monitor',
    summary_ar: clip(r.summary_ar, 1200),
    summary_en: clip(r.summary_en, 1200),
    result: {
      gait_observed: clip(r.gait_observed, 20),
      video_quality: {
        usable: !!(r.video_quality && r.video_quality.usable),
        issues_ar: clip(r.video_quality && r.video_quality.issues_ar, 500),
        issues_en: clip(r.video_quality && r.video_quality.issues_en, 500),
      },
      findings: (Array.isArray(r.findings) ? r.findings : []).slice(0, 12).map(f => ({
        metric: clip(f && f.metric, 30),
        level: ['normal', 'watch', 'concern'].includes(f && f.level) ? f.level : 'watch',
        text_ar: clip(f && f.text_ar, 300),
        text_en: clip(f && f.text_en, 300),
      })),
    },
    annotations,
  };
}

export function mediaListed(media, path) {
  return Array.isArray(media) && media.some(m => m && m.path === path && m.type === 'video');
}
