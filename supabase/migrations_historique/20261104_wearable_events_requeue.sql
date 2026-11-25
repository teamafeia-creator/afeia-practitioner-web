-- POL-09 · Rejeu des événements par le cron de rattrapage.
--
-- Remet en file (status = pending) :
--  * les événements failed avec attempts < p_max_attempts dont next_attempt_at est passé ;
--  * les événements processing bloqués (traitement interrompu, ex. fonction tuée) depuis
--    plus de p_stale_after.
-- Renvoie ensuite les événements pending dus (dont les Nightly Recharge différés),
-- les plus anciens d'abord, dans la limite de p_limit.
-- attempts n'est PAS remis à zéro : le plafond de tentatives reste effectif.

CREATE OR REPLACE FUNCTION public.wearable_requeue_due_events(
  p_max_attempts INTEGER DEFAULT 5,
  p_stale_after  INTERVAL DEFAULT interval '15 minutes',
  p_limit        INTEGER DEFAULT 200
) RETURNS TABLE (id UUID, event_type TEXT, attempts INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.wearable_events e
  SET status = 'pending', processing_started_at = NULL
  WHERE (e.status = 'failed' AND e.attempts < p_max_attempts AND e.next_attempt_at <= now())
     OR (e.status = 'processing' AND e.processing_started_at < clock_timestamp() - p_stale_after);

  RETURN QUERY
  SELECT e.id, e.event_type, e.attempts
  FROM public.wearable_events e
  WHERE e.status = 'pending' AND e.next_attempt_at <= now()
  ORDER BY e.next_attempt_at
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.wearable_requeue_due_events(INTEGER, INTERVAL, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_requeue_due_events(INTEGER, INTERVAL, INTEGER) TO service_role;
