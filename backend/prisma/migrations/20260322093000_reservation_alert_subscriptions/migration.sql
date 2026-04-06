CREATE TABLE IF NOT EXISTS public.reservation_alert_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doctor_schedule_id UUID NOT NULL REFERENCES public.doctor_schedules(id) ON DELETE CASCADE,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reservation_alert_subscriptions_user_schedule_key UNIQUE (user_id, doctor_schedule_id)
);

CREATE INDEX IF NOT EXISTS reservation_alert_subscriptions_schedule_active_idx
  ON public.reservation_alert_subscriptions (doctor_schedule_id, is_active);
