
ALTER TABLE public.team_invites
  ADD COLUMN IF NOT EXISTS parent_submission jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_team_invite_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', i.id,
    'status', i.status,
    'athlete_first_name', i.athlete_first_name,
    'athlete_last_name', i.athlete_last_name,
    'athlete_dob', i.athlete_dob,
    'position', i.position,
    'jersey_number', i.jersey_number,
    'parent1_name', i.parent1_name,
    'parent1_email', i.parent1_email,
    'parent1_phone', i.parent1_phone,
    'parent_submission', i.parent_submission,
    'submitted_at', i.submitted_at,
    'team_name', t.name
  ) INTO result
  FROM public.team_invites i
  JOIN public.teams t ON t.id = i.team_id
  WHERE i.invite_token = _token;
  IF result IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_team_invite(
  _token uuid,
  _athlete_dob date,
  _parent_name text,
  _parent_phone text,
  _submission jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE row public.team_invites%ROWTYPE;
BEGIN
  UPDATE public.team_invites
  SET athlete_dob = COALESCE(_athlete_dob, athlete_dob),
      parent1_name = COALESCE(_parent_name, parent1_name),
      parent1_phone = COALESCE(_parent_phone, parent1_phone),
      parent_submission = _submission,
      submitted_at = now(),
      status = 'accepted',
      joined_at = COALESCE(joined_at, now())
  WHERE invite_token = _token
  RETURNING * INTO row;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid token'; END IF;
  RETURN jsonb_build_object('ok', true, 'submitted_at', row.submitted_at);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_invite_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_team_invite(uuid, date, text, text, jsonb) TO anon, authenticated;
