CREATE OR REPLACE FUNCTION public.check_ice_slot_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.rink_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ice_slots
    WHERE owner_id = NEW.owner_id
      AND rink_id = NEW.rink_id
      AND slot_date = NEW.slot_date
      AND id <> NEW.id
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Overlapping ice slot already exists at this rink';
  END IF;
  RETURN NEW;
END;
$function$;