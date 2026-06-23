
CREATE OR REPLACE FUNCTION public.get_combine_share(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _athlete_id uuid;
  _result jsonb;
BEGIN
  SELECT athlete_id INTO _athlete_id
  FROM public.combine_public_shares
  WHERE token = _token AND revoked_at IS NULL
  LIMIT 1;

  IF _athlete_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'athlete', jsonb_build_object(
      'full_name', a.full_name,
      'age_group', a.age_group,
      'position', a.position
    ),
    'scores', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'category', cs.category,
        'score', cs.score,
        'percentile', cs.percentile,
        'global_rank', cs.global_rank
      ) ORDER BY cs.category)
      FROM public.combine_scores cs
      WHERE cs.athlete_id = _athlete_id
    ), '[]'::jsonb)
  )
  INTO _result
  FROM public.attendees a
  WHERE a.id = _athlete_id;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_combine_share(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_combine_share(text) TO anon, authenticated;
