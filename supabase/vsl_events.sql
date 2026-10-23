-- Review and run manually. No existing tables or CRM integrations are changed.
begin;
create table public.vsl_events (
 id bigint generated always as identity primary key,
 session_id uuid not null,
 page text not null check (length(page) between 1 and 500),
 event text not null check (event in ('page_view','autoplay_start','unmute_click','watched_25','watched_50','watched_75','watched_100','cta_click','form_submit')),
 value numeric not null default 0 check (value between 0 and 100),
 referrer text check (length(referrer)<=1000),
 utm_source text check(length(utm_source)<=200), utm_medium text check(length(utm_medium)<=200),
 utm_campaign text check(length(utm_campaign)<=200), utm_term text check(length(utm_term)<=200), utm_content text check(length(utm_content)<=200),
 user_agent text check(length(user_agent)<=1000), created_at timestamptz not null default now()
);
alter table public.vsl_events enable row level security;
revoke all on public.vsl_events from public, anon, authenticated;
grant insert (session_id,page,event,value,referrer,utm_source,utm_medium,utm_campaign,utm_term,utm_content,user_agent) on public.vsl_events to anon;
grant usage on sequence public.vsl_events_id_seq to anon;
create policy anonymous_event_insert on public.vsl_events for insert to anon with check (true);
grant select on public.vsl_events to authenticated;
create policy analytics_admin_read on public.vsl_events for select to authenticated
 using ((auth.jwt()->'app_metadata'->>'vsl_analytics_admin') = 'true');
create index vsl_events_created_session on public.vsl_events(created_at,session_id);
-- PG15+ security_invoker keeps underlying RLS in effect.
create view public.vsl_summary with (security_invoker=true) as
with sessions as (
 select (created_at at time zone 'UTC')::date as day,page,session_id,
 coalesce(utm_source,'') utm_source,coalesce(utm_medium,'') utm_medium,coalesce(utm_campaign,'') utm_campaign,coalesce(utm_term,'') utm_term,coalesce(utm_content,'') utm_content,
 count(*) filter(where event='page_view') as views,
 bool_or(event='unmute_click')::int as starts,
 bool_or(event='watched_25')::int as watched_25,bool_or(event='watched_50')::int as watched_50,
 bool_or(event='watched_75')::int as watched_75,bool_or(event='watched_100')::int as watched_100,
 bool_or(event='cta_click')::int as cta_sessions,bool_or(event='form_submit')::int as form_sessions,
 count(*) filter(where event='cta_click') as cta_clicks
 from public.vsl_events group by 1,2,3,4,5,6,7,8
)
select day,page,utm_source,utm_medium,utm_campaign,utm_term,utm_content,
 sum(views)::bigint views,count(*) filter(where views>0) sessions,
 sum(starts)::bigint starts,sum(watched_25)::bigint watched_25,sum(watched_50)::bigint watched_50,
 sum(watched_75)::bigint watched_75,sum(watched_100)::bigint watched_100,
 sum(cta_sessions)::bigint cta_sessions,sum(form_sessions)::bigint form_sessions,sum(cta_clicks)::bigint cta_clicks
from sessions group by 1,2,3,4,5,6,7;
revoke all on public.vsl_summary from public,anon;
grant select on public.vsl_summary to authenticated;
commit;
-- Separately, after choosing an existing dashboard user (never grant this to everyone):
-- update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
--   || '{"vsl_analytics_admin":true}'::jsonb where id = 'REPLACE_WITH_ADMIN_USER_UUID';
-- Sign out/in afterwards so a fresh JWT carries the trusted claim.
