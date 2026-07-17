import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { staff_member_id } = await req.json();
    if (!staff_member_id) {
      return new Response(
        JSON.stringify({ error: 'staff_member_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Service role client — needed for auth.admin.inviteUserByEmail
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Load staff member
    const { data: sm, error: smErr } = await supabase
      .from('staff_members')
      .select('id, name, email, app_role, owner_id, status')
      .eq('id', staff_member_id)
      .maybeSingle();

    if (smErr || !sm) {
      return new Response(
        JSON.stringify({ error: 'Staff member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!sm.email) {
      return new Response(
        JSON.stringify({ error: 'Staff member has no email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!sm.app_role) {
      return new Response(
        JSON.stringify({ error: 'Staff member has no app role — cannot invite' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Load owner org name for the invite context
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, org_name')
      .eq('id', sm.owner_id)
      .maybeSingle();

    const orgName = ownerProfile?.org_name ?? ownerProfile?.full_name ?? 'PXF Hockey';

    // 3. Send invite via Supabase Auth Admin
    // The metadata is written into raw_user_meta_data on the new user,
    // which the handle_new_user trigger reads to set role + staff_member_id.
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      sm.email,
      {
        data: {
          role:            'staff',
          staff_member_id: sm.id,
          full_name:       sm.name,
          org_name:        orgName,
        },
        // Deep-link back into the app after the user sets their password
        redirectTo: 'https://pxfhockey.com/staff-accept',
      },
    );

    if (inviteErr) {
      console.error('Invite error:', inviteErr);
      return new Response(
        JSON.stringify({ error: inviteErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Mark staff member as invited
    await supabase
      .from('staff_members')
      .update({
        status:     'invited',
        invited_at: new Date().toISOString(),
      })
      .eq('id', staff_member_id);

    console.log(`Invited staff member ${sm.name} (${sm.email}) to org: ${orgName}`);

    return new Response(
      JSON.stringify({ ok: true, message: `Invite sent to ${sm.email}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
