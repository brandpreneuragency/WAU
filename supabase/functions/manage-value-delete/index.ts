import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    // Authenticate caller via Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    // Validate caller token using normal supabase client (admin) to look up profile
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (getUserError || !user) throw new Error('Invalid token')

    // Fetch profile to check role and tenant
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw new Error('Unauthorized')

    const body = await req.json()
    const { tenant_id, type, old_value, new_value = null, action = 'unassign' } = body || {}

    if (!tenant_id || !type || !old_value) {
      throw new Error('Missing required fields: tenant_id, type, old_value')
    }

    if (!['department', 'position'].includes(type)) {
      throw new Error('Invalid type. Must be "department" or "position"')
    }

    // Authorization: super_admin can operate on any tenant; tenant_admin can only operate on their tenant
    if (profile.role !== 'super_admin' && profile.role !== 'tenant_admin') {
      throw new Error('Unauthorized: insufficient role')
    }

    if (profile.role === 'tenant_admin' && profile.tenant_id !== tenant_id) {
      throw new Error('Unauthorized: tenant mismatch')
    }

    const field = type === 'department' ? 'department' : 'position'

    // Preview affected rows
    const { data: staffAffected } = await supabaseAdmin
      .from('staff')
      .select('id, full_name')
      .eq('tenant_id', tenant_id)
      .eq(field, old_value)
      .limit(50)

    const { data: inventoryAffected } = await supabaseAdmin
      .from('inventory')
      .select('id, item_name')
      .eq('tenant_id', tenant_id)
      .eq(field, old_value)
      .limit(50)

    // If action is preview only, return sample counts
    if (body.action === 'preview') {
      const { count: staffCount } = await supabaseAdmin
        .from('staff')
        .select('id', { count: 'exact', head: false })
        .eq('tenant_id', tenant_id)
        .eq(field, old_value)

      const { count: invCount } = await supabaseAdmin
        .from('inventory')
        .select('id', { count: 'exact', head: false })
        .eq('tenant_id', tenant_id)
        .eq(field, old_value)

      return new Response(JSON.stringify({ staffCount, invCount, staffSample: staffAffected, inventorySample: inventoryAffected }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Perform the chosen update (reassign or unassign). Use a simple approach: perform updates sequentially.
    const newVal = action === 'reassign' && new_value ? new_value : (action === 'unassign' ? 'Unassigned' : new_value)

    // Update staff
    const { data: updatedStaff, error: staffError } = await supabaseAdmin
      .from('staff')
      .update({ [field]: newVal })
      .eq('tenant_id', tenant_id)
      .eq(field, old_value)

    if (staffError) throw staffError

    // Update inventory
    const { data: updatedInventory, error: inventoryError2 } = await supabaseAdmin
      .from('inventory')
      .update({ [field]: newVal })
      .eq('tenant_id', tenant_id)
      .eq(field, old_value)

    if (inventoryError2) throw inventoryError2

    // Return counts and sample rows
    const { count: staffCountFinal } = await supabaseAdmin
      .from('staff')
      .select('id', { count: 'exact', head: false })
      .eq('tenant_id', tenant_id)
      .eq(field, newVal)

    const { count: invCountFinal } = await supabaseAdmin
      .from('inventory')
      .select('id', { count: 'exact', head: false })
      .eq('tenant_id', tenant_id)
      .eq(field, newVal)

    return new Response(
      JSON.stringify({ message: 'Updated successfully', staffUpdated: updatedStaff?.length || 0, inventoryUpdated: updatedInventory?.length || 0, staffCountFinal, invCountFinal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
