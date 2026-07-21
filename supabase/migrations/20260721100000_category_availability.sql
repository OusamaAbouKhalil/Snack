/*
  # Category availability

  Admins can mark a category unavailable to pull it (and every product in
  it) off the storefront menu without deleting anything — same pattern as
  the existing products.is_available flag.
*/

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;
