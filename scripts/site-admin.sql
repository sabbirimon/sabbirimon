begin;
-- Run in the IMON World Supabase SQL editor. Only aggregated counters are stored.

create table if not exists public.usage_daily (
  day date not null,
  page text not null,
  event text not null,
  total bigint not null default 0,
  primary key (day,page,event)
);
alter table public.usage_daily enable row level security;
revoke all on public.usage_daily from public, anon, authenticated;
create or replace function public.record_usage(page_name text,event_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if page_name is null or page_name not in ('home','courses','code','ai','circuits','tools','arcade','gridworks','meshlit','hyperl','journal','sitemap','privacy')
    or event_name is null or event_name not in ('page_view','quiz_complete','game_start','quest_complete','map_explore') then
    raise exception 'Unsupported metric' using errcode = '22023';
  end if;
  insert into public.usage_daily(day,page,event,total)
  values ((now() at time zone 'UTC')::date,page_name,event_name,1)
  on conflict(day,page,event) do update set total=public.usage_daily.total+1;
end;
$$;
revoke all on function public.record_usage(text,text) from public, anon, authenticated;

create table if not exists public.site_editors (id uuid primary key references auth.users(id) on delete cascade);
alter table public.site_editors enable row level security;
revoke all on public.site_editors from public,anon,authenticated;
create or replace function public.can_edit_site() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.site_editors where id=auth.uid());
$$;
revoke all on function public.can_edit_site() from public,anon;
grant execute on function public.can_edit_site() to authenticated;
grant select on public.usage_daily to authenticated;
drop policy if exists "Site editors read daily totals" on public.usage_daily;
create policy "Site editors read daily totals" on public.usage_daily for select to authenticated using ((select public.can_edit_site()));
create table if not exists public.site_content (
  slot text primary key check(slot in ('home','code','ai','circuits')),
  heading text not null default '' check(length(heading)<=90),
  body text not null default '' check(length(body)<=1000),
  revision integer not null default 0 check(revision>=0)
);
alter table public.site_content enable row level security;
revoke all on public.site_content from public,anon,authenticated;
grant select on public.site_content to anon,authenticated;
grant update(heading,body,revision) on public.site_content to authenticated;
drop policy if exists "Published content is readable" on public.site_content;
create policy "Published content is readable" on public.site_content for select to anon,authenticated using (true);
drop policy if exists "Only site editors publish" on public.site_content;
create policy "Only site editors publish" on public.site_content for update to authenticated using ((select public.can_edit_site())) with check ((select public.can_edit_site()));
insert into public.site_content(slot) values ('home'),('code'),('ai'),('circuits') on conflict do nothing;

create table if not exists public.audience_daily (
  day date not null,
  audience text not null check(audience in ('declared_automation','unverified_browser')),
  total bigint not null default 0,
  primary key(day,audience)
);
alter table public.audience_daily enable row level security;
revoke all on public.audience_daily from public,anon,authenticated;
grant select on public.audience_daily to authenticated;
drop policy if exists "Editors read audience counts" on public.audience_daily;
create policy "Editors read audience counts" on public.audience_daily for select to authenticated using ((select public.can_edit_site()));
create table if not exists public.site_preferences (
  id boolean primary key default true check(id),
  palette text not null default 'world' check(palette in ('world','orchard','coast','arcade')),
  featured text not null default 'courses' check(featured in ('courses','quests','arcade','tools')),
  metrics_enabled boolean not null default true,
  revision integer not null default 0 check(revision>=0)
);
alter table public.site_preferences enable row level security;
revoke all on public.site_preferences from public,anon,authenticated;
grant select on public.site_preferences to anon,authenticated;
grant update(palette,featured,metrics_enabled,revision) on public.site_preferences to authenticated;
drop policy if exists "Published preferences are readable" on public.site_preferences;
create policy "Published preferences are readable" on public.site_preferences for select to anon,authenticated using (true);
drop policy if exists "Only site editors change preferences" on public.site_preferences;
create policy "Only site editors change preferences" on public.site_preferences for update to authenticated using ((select public.can_edit_site())) with check ((select public.can_edit_site()));
insert into public.site_preferences(id) values (true) on conflict do nothing;
create or replace function public.record_site_event(page_name text,event_name text,audience_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not coalesce((select metrics_enabled from public.site_preferences where id),false) then return; end if;
  if audience_name is null or audience_name not in ('declared_automation','unverified_browser') then raise exception 'Unknown audience' using errcode='22023'; end if;
  perform public.record_usage(page_name,event_name);
  if event_name='page_view' then
    insert into public.audience_daily(day,audience,total) values ((now() at time zone 'UTC')::date,audience_name,1)
    on conflict(day,audience) do update set total=public.audience_daily.total+1;
  end if;
end;
$$;

revoke all on function public.record_site_event(text,text,text) from public,anon,authenticated;
grant execute on function public.record_site_event(text,text,text) to anon;
commit;
