-- ============================================================
-- Migration 004: Keep base_price in sync with min(product_sizes.price)
--
-- base_price is used for sorting and display ("from Rs. X").
-- This trigger fires after any INSERT, UPDATE of price, or DELETE
-- on product_sizes and sets the parent product's base_price to the
-- current minimum size price (or leaves it unchanged if no sizes remain).
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_product_base_price()
RETURNS trigger AS $$
DECLARE
  v_product_id uuid;
  v_min_price   numeric;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT MIN(price)
  INTO v_min_price
  FROM public.product_sizes
  WHERE product_id = v_product_id;

  UPDATE public.products
  SET base_price = COALESCE(v_min_price, base_price)
  WHERE id = v_product_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_product_base_price
AFTER INSERT OR UPDATE OF price OR DELETE
ON public.product_sizes
FOR EACH ROW EXECUTE FUNCTION public.sync_product_base_price();
