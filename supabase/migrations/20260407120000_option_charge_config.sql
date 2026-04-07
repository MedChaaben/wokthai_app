-- Allow options to be explicitly chargeable or free from admin.
ALTER TABLE public.product_options
ADD COLUMN is_chargeable BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.customization_preset_options
ADD COLUMN is_chargeable BOOLEAN NOT NULL DEFAULT true;
