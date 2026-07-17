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
    const { parent_email, player_name, team_id } = await req.json();

    if (!parent_email) {
      return new Response(
        JSON.stringify({ error: 'parent_email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load team + coach info for the invite context
    let teamName = 'your team';
    let coachName = 'Your coach';
    if (team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('name, coach_id')
        .eq('id', team_id)
        .maybeSingle();

      if (team) {
        teamName = team.name;
        const { data: coach } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', team.coach_id)
          .maybeSingle();
        if (coach?.full_name) coachName = coach.full_name;
      }
    }

    // Check if user already exists — if so, just link them (no re-invite needed)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some(u => u.email === parent_email);
    if (alreadyExists) {
      return new Response(
        JSON.stringify({ ok: true, message: 'Parent already has an account', already_exists: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Send invite
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      parent_email,
      {
        data: {
          role:        'parent',
          player_name: player_name ?? null,
          team_name:   teamName,
          coach_name:  coachName,
        },
        redirectTo: 'https://pxfhockey.com/parent-accept',
      },
    );

    if (inviteErr) {
      console.error('Invite error:', inviteErr);
      return new Response(
        JSON.stringify({ error: inviteErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Parent invite sent to ${parent_email} for player ${player_name} on ${teamName}`);

    return new Response(
      JSON.stringify({ ok: true, message: `Invite sent to ${parent_email}` }),
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
