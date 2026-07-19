import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {...corsHeaders, 'Content-Type': 'application/json; charset=utf-8'},
})

const fail = (message: string, status = 400) => json({error: message}, status)

const normalizeUsername = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '')
const validUsername = (value: string) => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value)
const internalEmailFor = (username: string) => `${username}@members.countryclubequestrian.com`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders})
  if (req.method !== 'POST') return fail('Method not allowed', 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const firstNamedKey = (envName: string) => {
    try {
      const values = JSON.parse(Deno.env.get(envName) ?? '{}') as Record<string,string>
      return values.default ?? Object.values(values)[0] ?? ''
    } catch { return '' }
  }
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY')
    ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    ?? firstNamedKey('SUPABASE_PUBLISHABLE_KEYS')
  const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    ?? Deno.env.get('SUPABASE_SECRET_KEY')
    ?? firstNamedKey('SUPABASE_SECRET_KEYS')
  const authorization = req.headers.get('Authorization') ?? ''
  if (!supabaseUrl || !publicKey || !secretKey) return fail('Supabase function secrets are not configured', 500)
  if (!authorization.startsWith('Bearer ')) return fail('Missing member session', 401)

  const userClient = createClient(supabaseUrl, publicKey, {
    global: {headers: {Authorization: authorization}},
    auth: {persistSession: false, autoRefreshToken: false},
  })
  const admin = createClient(supabaseUrl, secretKey, {
    auth: {persistSession: false, autoRefreshToken: false},
  })

  const {data: authData, error: authError} = await userClient.auth.getUser()
  if (authError || !authData.user) return fail('Invalid or expired member session', 401)
  const caller = authData.user
  const {data: callerAccessRaw, error: callerAccessError} = await userClient.rpc('cce_my_access')
  const callerAccess = Array.isArray(callerAccessRaw) ? callerAccessRaw[0] : callerAccessRaw
  if (callerAccessError || !callerAccess?.profile?.is_active) return fail('This member account is inactive or has no application profile', 403)
  const callerPermissions = new Set<string>(Array.isArray(callerAccess.permissions) ? callerAccess.permissions : [])
  const canManageRoles = callerPermissions.has('roles.manage')

  let input: Record<string, any>
  try { input = await req.json() } catch { return fail('Invalid JSON body') }
  const action = String(input.action ?? '')

  const can = async (permission: string) => {
    const {data, error} = await userClient.rpc('cce_has_permission', {p_permission: permission})
    return !error && data === true
  }
  const requirePermission = async (permission: string) => {
    if (!await can(permission)) throw new Response(JSON.stringify({error: `Missing permission: ${permission}`}), {status: 403, headers: {...corsHeaders, 'Content-Type':'application/json'}})
  }
  const audit = async (name: string, recordId: string, beforeData: unknown = null, afterData: unknown = null) => {
    await admin.from('audit_logs').insert({
      actor: `User: ${caller.email ?? caller.id}`,
      action: name,
      table_name: 'access_control',
      record_id: recordId,
      before_data: beforeData,
      after_data: afterData,
    })
  }
  const safeRows = async (table: string, columns = '*') => {
    const result = await admin.from(table).select(columns)
    if (result.error) return []
    return result.data ?? []
  }
  const deny = (message: string) => { throw new Response(JSON.stringify({error: message}), {status: 403, headers: {...corsHeaders, 'Content-Type':'application/json'}}) }
  const rolePermissionCodes = async (roleId: string) => {
    const {data: role, error: roleError} = await admin.from('app_roles').select('id,code').eq('id', roleId).maybeSingle()
    if (roleError || !role) return null
    if (role.code === 'super_admin') {
      const {data, error} = await admin.from('app_permissions').select('code')
      if (error) throw error
      return new Set<string>((data ?? []).map((item: any) => String(item.code)))
    }
    const {data, error} = await admin.from('role_permissions').select('permission_code,allowed').eq('role_id', roleId)
    if (error) throw error
    return new Set<string>((data ?? []).filter((item: any) => item.allowed !== false).map((item: any) => String(item.permission_code)))
  }
  const ensurePermissionSubset = (codes: Iterable<string>, message: string) => {
    if (canManageRoles) return
    for (const code of codes) if (!callerPermissions.has(code)) deny(message)
  }
  const ensureAssignableUser = async (user: Record<string, any>) => {
    const roleId = String(user.role_id ?? '')
    if (!roleId) return fail('Role is required')
    const roleCodes = await rolePermissionCodes(roleId)
    if (!roleCodes) return fail('Selected role does not exist', 404)
    ensurePermissionSubset(roleCodes, 'You cannot assign a role containing permissions that you do not have')
    const allowedOverrides = (Array.isArray(user.permission_overrides) ? user.permission_overrides : [])
      .filter((item: any) => item?.allowed === true)
      .map((item: any) => String(item.permission_code ?? ''))
      .filter(Boolean)
    ensurePermissionSubset(allowedOverrides, 'You cannot grant an individual permission that you do not have')
    return null
  }
  const effectivePermissionCodes = async (userId: string) => {
    const {data: profile, error: profileError} = await admin.from('profiles').select('role_id').eq('id', userId).maybeSingle()
    if (profileError) throw profileError
    if (!profile) return new Set<string>()
    const permissions = await rolePermissionCodes(profile.role_id)
    const result = permissions ?? new Set<string>()
    const {data: overrides, error: overrideError} = await admin.from('user_permissions').select('permission_code,allowed').eq('user_id', userId)
    if (overrideError) throw overrideError
    for (const item of overrides ?? []) item.allowed ? result.add(item.permission_code) : result.delete(item.permission_code)
    return result
  }
  const ensureManageableTarget = async (userId: string) => {
    if (canManageRoles || userId === caller.id) return
    const targetPermissions = await effectivePermissionCodes(userId)
    ensurePermissionSubset(targetPermissions, 'You cannot manage an account with permissions above your own')
  }

  try {
    if (action === 'bootstrap') {
      if (!await can('users.manage') && !await can('roles.manage')) return fail('You cannot manage access settings', 403)
      const [authUsersResult, profiles, roles, permissions, rolePermissions, userPermissions, instructors, horseRows] = await Promise.all([
        admin.auth.admin.listUsers({page: 1, perPage: 1000}),
        safeRows('profiles'), safeRows('app_roles'), safeRows('app_permissions'),
        safeRows('role_permissions'), safeRows('user_permissions'),
        safeRows('instructors', 'id,name,active'), safeRows('horses', 'owner'),
      ])
      if (authUsersResult.error) return fail(authUsersResult.error.message, 500)
      const profileMap = new Map((profiles as any[]).map(profile => [profile.id, profile]))
      const roleMap = new Map((roles as any[]).map(role => [role.id, role]))
      const users = authUsersResult.data.users.map(user => {
        const profile = profileMap.get(user.id) ?? null
        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          profile,
          role: profile ? roleMap.get(profile.role_id) ?? null : null,
        }
      })
      const owners = [...new Set((horseRows as any[]).map(row => String(row.owner ?? '').trim()).filter(value => value && value.toUpperCase() !== 'CC'))].sort()
      return json({users, roles, permissions, role_permissions: rolePermissions, user_permissions: userPermissions, instructors, owners})
    }

    if (['create_user','update_user','reset_password','set_active'].includes(action)) await requirePermission('users.manage')
    if (['create_role','update_role'].includes(action)) await requirePermission('roles.manage')

    if (action === 'create_user') {
      const user = input.user ?? {}
      const username = normalizeUsername(user.username)
      const requestedEmail = String(user.email ?? '').trim().toLowerCase()
      const email = requestedEmail || internalEmailFor(username)
      const password = String(user.password ?? '')
      const fullName = String(user.full_name ?? '').trim()
      if (!validUsername(username) || !fullName || password.length < 8 || !user.role_id) return fail('Name, a valid username, role and a password of at least 8 characters are required')
      const {data: usernameOwner, error: usernameReadError} = await admin.from('profiles').select('id').ilike('username', username).maybeSingle()
      if (usernameReadError) return fail(usernameReadError.message, 500)
      if (usernameOwner) return fail('This username is already in use', 409)
      const assignmentError = await ensureAssignableUser(user)
      if (assignmentError) return assignmentError
      const {data: created, error: createError} = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {full_name: fullName, username},
      })
      if (createError || !created.user) return fail(createError?.message ?? 'Could not create Auth user')
      const userId = created.user.id
      const profile = {
        id: userId, email, username, full_name: fullName, phone: user.phone || null, role_id: user.role_id,
        is_active: user.is_active !== false, owner_name: user.owner_name || null,
        instructor_id: user.instructor_id ? Number(user.instructor_id) : null,
      }
      const {error: profileError} = await admin.from('profiles').upsert(profile)
      if (profileError) {
        await admin.auth.admin.deleteUser(userId)
        return fail(profileError.message)
      }
      const overrides = Array.isArray(user.permission_overrides) ? user.permission_overrides : []
      if (overrides.length) await admin.from('user_permissions').insert(overrides.map((item: any) => ({user_id:userId, permission_code:item.permission_code, allowed:item.allowed === true})))
      await audit('create_user', userId, null, {...profile, password:'[protected]'})
      return json({ok:true, user_id:userId})
    }

    if (action === 'update_user') {
      const userId = String(input.user_id ?? '')
      const user = input.user ?? {}
      const username = normalizeUsername(user.username)
      if (!userId || !user.role_id || !String(user.full_name ?? '').trim() || !validUsername(username)) return fail('User id, name, valid username and role are required')
      await ensureManageableTarget(userId)
      const {data: usernameOwner, error: usernameReadError} = await admin.from('profiles').select('id').ilike('username', username).neq('id', userId).maybeSingle()
      if (usernameReadError) return fail(usernameReadError.message, 500)
      if (usernameOwner) return fail('This username is already in use', 409)
      const assignmentError = await ensureAssignableUser(user)
      if (assignmentError) return assignmentError
      const {data: oldProfile} = await admin.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (userId === caller.id && (user.is_active === false || user.role_id !== oldProfile?.role_id)) return fail('You cannot deactivate yourself or change your own role', 409)
      const authUpdate: Record<string, unknown> = {user_metadata:{full_name:String(user.full_name).trim(), username}}
      if (user.email) authUpdate.email = String(user.email).trim().toLowerCase()
      const {error: authUpdateError} = await admin.auth.admin.updateUserById(userId, authUpdate)
      if (authUpdateError) return fail(authUpdateError.message)
      const profile = {
        email: user.email ? String(user.email).trim().toLowerCase() : oldProfile?.email,
        username,
        full_name: String(user.full_name).trim(), phone:user.phone || null, role_id:user.role_id,
        is_active:user.is_active !== false, owner_name:user.owner_name || null,
        instructor_id:user.instructor_id ? Number(user.instructor_id) : null,
      }
      const {error: updateError} = await admin.from('profiles').update(profile).eq('id', userId)
      if (updateError) return fail(updateError.message)
      await admin.from('user_permissions').delete().eq('user_id', userId)
      const overrides = Array.isArray(user.permission_overrides) ? user.permission_overrides : []
      if (overrides.length) {
        const {error} = await admin.from('user_permissions').insert(overrides.map((item: any) => ({user_id:userId,permission_code:item.permission_code,allowed:item.allowed === true})))
        if (error) return fail(error.message)
      }
      await audit('update_user', userId, oldProfile, profile)
      return json({ok:true})
    }

    if (action === 'reset_password') {
      const userId = String(input.user_id ?? '')
      const password = String(input.password ?? '')
      if (!userId || password.length < 8) return fail('A password of at least 8 characters is required')
      await ensureManageableTarget(userId)
      const {error} = await admin.auth.admin.updateUserById(userId, {password})
      if (error) return fail(error.message)
      await audit('reset_password', userId, null, {password:'[protected]'})
      return json({ok:true})
    }

    if (action === 'set_active') {
      const userId = String(input.user_id ?? '')
      const isActive = input.is_active === true
      if (!userId) return fail('User id is required')
      await ensureManageableTarget(userId)
      if (userId === caller.id && !isActive) return fail('You cannot deactivate your own account', 409)
      const {data: oldProfile, error: readError} = await admin.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (readError) return fail(readError.message)
      const {error} = await admin.from('profiles').update({is_active:isActive}).eq('id', userId)
      if (error) return fail(error.message)
      await audit(isActive ? 'activate_user':'deactivate_user', userId, oldProfile, {...oldProfile,is_active:isActive})
      return json({ok:true})
    }

    if (action === 'create_role') {
      const role = input.role ?? {}
      const code = String(role.code ?? '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_')
      if (!code || !String(role.name_en ?? '').trim()) return fail('Role code and English name are required')
      const {data: created, error} = await admin.from('app_roles').insert({
        code, name_en:String(role.name_en).trim(), name_ar:String(role.name_ar ?? '').trim() || null,
        description:String(role.description ?? '').trim() || null, is_system:false,
      }).select('*').single()
      if (error || !created) return fail(error?.message ?? 'Could not create role')
      const permissions = Array.isArray(role.permissions) ? role.permissions : []
      if (permissions.length) {
        const {error: permissionError} = await admin.from('role_permissions').insert(permissions.map((permissionCode: string) => ({role_id:created.id,permission_code:permissionCode,allowed:true})))
        if (permissionError) return fail(permissionError.message)
      }
      await audit('create_role', created.id, null, created)
      return json({ok:true, role:created})
    }

    if (action === 'update_role') {
      const roleId = String(input.role_id ?? '')
      const role = input.role ?? {}
      if (!roleId || !String(role.name_en ?? '').trim()) return fail('Role id and English name are required')
      const {data: oldRole, error: readError} = await admin.from('app_roles').select('*').eq('id', roleId).maybeSingle()
      if (readError || !oldRole) return fail(readError?.message ?? 'Role not found', 404)
      const update: Record<string, unknown> = {
        name_en:String(role.name_en).trim(), name_ar:String(role.name_ar ?? '').trim() || null,
        description:String(role.description ?? '').trim() || null,
      }
      if (!oldRole.is_system && role.code) update.code = String(role.code).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_')
      const {error: updateError} = await admin.from('app_roles').update(update).eq('id', roleId)
      if (updateError) return fail(updateError.message)
      await admin.from('role_permissions').delete().eq('role_id', roleId)
      const permissions = Array.isArray(role.permissions) ? role.permissions : []
      if (permissions.length) {
        const {error} = await admin.from('role_permissions').insert(permissions.map((permissionCode: string) => ({role_id:roleId,permission_code:permissionCode,allowed:true})))
        if (error) return fail(error.message)
      }
      await audit('update_role', roleId, oldRole, {...update,permissions})
      return json({ok:true})
    }

    return fail('Unknown action', 404)
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return fail(error instanceof Error ? error.message : 'Unexpected server error', 500)
  }
})
