CREATE POLICY "Team parents can view plans" ON public.practice_plans
  FOR SELECT TO authenticated
  USING (public.is_team_parent(team_id));

CREATE POLICY "Team parents can view plan items" ON public.practice_plan_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.practice_plans p WHERE p.id = practice_plan_items.plan_id AND public.is_team_parent(p.team_id)));