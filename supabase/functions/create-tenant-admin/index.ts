import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        // 2. Authenticate the caller (Must be a Super Admin)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
            authHeader.replace('Bearer ', '')
        )

        if (authError || !user) throw new Error('Invalid token')

        // Check if user is super_admin in profiles table
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError || profile?.role !== 'super_admin') {
            throw new Error('Unauthorized: Only Super Admins can create tenant admins')
        }

        // 3. Parse Request Body
        const { action = 'create', email, password, tenant_id, user_id } = await req.json()

        if (action === 'create') {
            if (!email || !password || !tenant_id) {
                throw new Error('Missing required fields for create: email, password, tenant_id')
            }

            // 4. Create the User in Supabase Auth
            const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    role: 'tenant_admin',
                    tenant_id: tenant_id
                }
            })

            if (createError) throw createError

            return new Response(
                JSON.stringify({ message: 'Tenant admin created successfully', user: userData.user }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else if (action === 'update') {
            if (!user_id) {
                throw new Error('Missing required field for update: user_id')
            }

            const updateData: any = {}
            if (email) updateData.email = email
            if (password) updateData.password = password

            if (Object.keys(updateData).length === 0) {
                throw new Error('No fields provided to update (email or password)')
            }

            // Update the User in Supabase Auth
            const { data: userData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                user_id,
                updateData
            )

            if (updateError) throw updateError

            return new Response(
                JSON.stringify({ message: 'Tenant admin updated successfully', user: userData.user }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else {
            throw new Error(`Invalid action: ${action}`)
        }

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
