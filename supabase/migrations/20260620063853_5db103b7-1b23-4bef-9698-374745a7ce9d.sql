GRANT SELECT ON public.camps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camps TO authenticated;
GRANT ALL ON public.camps TO service_role;