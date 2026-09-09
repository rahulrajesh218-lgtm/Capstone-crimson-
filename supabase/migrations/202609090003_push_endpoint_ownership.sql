-- A browser push endpoint identifies one device subscription and must never belong
-- to two accounts, preventing notifications crossing account boundaries.
alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_key unique (endpoint);
