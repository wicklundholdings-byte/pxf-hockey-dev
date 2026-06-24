
-- Parents can read watch progress for athletes on a team their child is on
CREATE POLICY "Team parents view teammate watch progress"
  ON public.dryland_watch_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_players tp
      WHERE tp.athlete_id = dryland_watch_progress.athlete_id
        AND public.is_team_parent(tp.team_id)
    )
  );

-- Parents can read streaks for teammates
CREATE POLICY "Team parents view teammate streaks"
  ON public.dryland_streaks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_players tp
      WHERE tp.athlete_id = dryland_streaks.athlete_id
        AND public.is_team_parent(tp.team_id)
    )
  );

-- Parents can read attendee basic info (name/position) for teammates of their child
CREATE POLICY "Team parents view teammate attendees"
  ON public.attendees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_players tp
      WHERE tp.athlete_id = attendees.id
        AND public.is_team_parent(tp.team_id)
    )
  );
