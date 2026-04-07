-- Charge cuisine : minutes ajoutées à l’estimation client (réglable par le restaurant)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS kitchen_load_extra_minutes INT NOT NULL DEFAULT 0;

DO $wt$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stores_kitchen_load_extra_minutes_check'
  ) THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_kitchen_load_extra_minutes_check
      CHECK (kitchen_load_extra_minutes >= 0 AND kitchen_load_extra_minutes <= 60);
  END IF;
END;
$wt$;

COMMENT ON COLUMN public.stores.kitchen_load_extra_minutes IS
  'Minutes ajoutées au temps de préparation estimé (charge cuisine).';
