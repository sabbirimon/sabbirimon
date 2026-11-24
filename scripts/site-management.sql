begin;
create table if not exists public.library_items (
 slug text primary key check(slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
 kind text not null check(kind in ('course','lab','article')),
 title text not null check(length(trim(title)) between 1 and 120),
 summary text not null check(length(summary)<=500),
 lessons jsonb not null check(jsonb_typeof(lessons)='array' and jsonb_array_length(lessons) between 1 and 40),
 published boolean not null default false,
 revision integer not null default 1
);
alter table public.library_items enable row level security;
revoke all on public.library_items from public,anon,authenticated;
grant select on public.library_items to anon,authenticated;
drop policy if exists library_public on public.library_items;
create policy library_public on public.library_items for select using(published);
drop policy if exists library_edit on public.library_items;
create policy library_edit on public.library_items for select to authenticated using(public.can_edit_site());

create table if not exists public.site_roster(email text primary key, label text not null check(length(label)<=90));
create table if not exists public.management_log(id bigint generated always as identity primary key, at timestamptz not null default now(), action text not null, target text not null);
alter table public.site_roster enable row level security;
alter table public.management_log enable row level security;
revoke all on public.site_roster,public.management_log from public,anon,authenticated;

create or replace function public.manage_site(op text, args jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 email_key text=lower(trim(coalesce(args->>'email','')));
 display_name text=trim(coalesce(args->>'name',''));
 term text=left(lower(trim(coalesce(args->>'query',''))),150);
 item_slug text=args->>'slug'; doc jsonb; item jsonb; output jsonb;
 subject uuid; offset_rows int=greatest(0,coalesce((args->>'offset')::int,0)); rev int; cutoff date;
begin
 if not public.can_edit_site() then raise exception 'Owner required' using errcode='42501'; end if;
 if op='users' then
   select coalesce(jsonb_agg(to_jsonb(u)),'[]') into output from (
     select a.id::text id,a.email,coalesce(r.label,a.raw_user_meta_data->>'full_name','') name,
       a.created_at joined,a.last_sign_in_at last_sign_in, p.updated_at last_save,
       exists(select 1 from public.site_editors s where s.id=a.id) protected,'active' state
     from auth.users a left join public.site_roster r on r.email=lower(a.email) left join public.progress p on p.id=a.id
     where strpos(lower(concat_ws(' ',a.email,a.id::text,r.label,a.raw_user_meta_data->>'full_name')),term)>0
     union all select '',r.email,r.label,null,null,null,false,'pending' from public.site_roster r
     where not exists(select 1 from auth.users a where lower(a.email)=r.email) and strpos(lower(r.email||' '||r.label),term)>0
     order by email limit 30 offset offset_rows
   ) u; return output;
 elsif op='results' then
   select id into subject from auth.users where lower(email)=email_key;
   select coalesce(jsonb_object_agg(k, jsonb_build_object('solved',
     (select count(*) from public.learning_exercises e where e.track=k and p.data->k->'solved' @> jsonb_build_array(e.exercise)),
     'quiz',p.data -> q)),'{}') into output from
     (values ('imon-lab-progress-v1','imon-course-quiz-code'),('imon-ai-lab-v1','imon-course-quiz-ai'),('imon-circuits-v1','imon-course-quiz-circuits'),('imon-systems-v1','imon-course-quiz-systems')) tracks(k,q)
     left join public.progress p on p.id=subject;
   return output;
 elsif op in ('add','rename','delete-user') then
   if email_key !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(email_key)>254 or length(display_name)>90 then raise exception 'Enter a valid email and a name of up to 90 characters'; end if;
   select id into subject from auth.users where lower(email)=email_key;
   if op='add' then
     if subject is not null then raise exception 'Account already exists'; end if;
     insert into public.site_roster values(email_key,display_name);
   elsif op='rename' then
     if subject is null and not exists(select 1 from public.site_roster where email=email_key) then raise exception 'Account not found'; end if;
     insert into public.site_roster values(email_key,display_name) on conflict(email) do update set label=excluded.label;
   else
     if args->>'confirm' is distinct from email_key then raise exception 'Type the exact email to confirm'; end if;
     if exists(select 1 from public.site_editors where id=subject) then raise exception 'Owner accounts are protected'; end if;
     delete from public.site_roster where email=email_key;
     delete from auth.users where id=subject;
   end if;
   insert into public.management_log(action,target) values(op,coalesce(subject::text,'pending member'));
 elsif op in ('snapshot','restore','reset') then
   if op<>'snapshot' then
     lock table public.library_items,public.site_content,public.site_preferences in share row exclusive mode;
   end if;
   select jsonb_build_object('format','imon-site-v1',
     'preferences',(select to_jsonb(p)-'id'-'revision' from public.site_preferences p where id),
     'notices',(select jsonb_agg(to_jsonb(n)-'revision' order by slot) from public.site_content n),
     'items',(select coalesce(jsonb_agg(to_jsonb(i)-'revision' order by slug),'[]') from public.library_items i)
   ) into output;
   if op='snapshot' then return jsonb_build_object('snapshot',output,'version',md5(output::text)); end if;
   if args->>'version' is distinct from md5(output::text) then raise exception 'Site changed since preview. Download a fresh snapshot.'; end if;
   if op='reset' then
     if args->>'confirm' is distinct from 'RESET SITE CONTENT' then raise exception 'Reset confirmation required'; end if;
     delete from public.library_items;
     update public.site_content set heading='',body='',revision=revision+1;
     update public.site_preferences set palette='world',featured='courses',metrics_enabled=false,revision=revision+1;
   else
     if args->>'confirm' is distinct from 'RESTORE SITE CONTENT' then raise exception 'Restore confirmation required'; end if;
     doc=args->'snapshot';
     if doc->>'format' is distinct from 'imon-site-v1' or jsonb_typeof(doc->'preferences') is distinct from 'object'
       or jsonb_typeof(doc->'items') is distinct from 'array' or jsonb_typeof(doc->'notices') is distinct from 'array'
       or octet_length(doc::text)>5000000 then raise exception 'Invalid site snapshot'; end if;
     if jsonb_array_length(doc->'notices')<>4 or
       (select count(distinct v->>'slot') from jsonb_array_elements(doc->'notices') v where v->>'slot' in ('code','circuits','ai','home'))<>4
       then raise exception 'Snapshot must contain all four notices'; end if;
     if (select count(distinct v->>'slug') from jsonb_array_elements(doc->'items') v)<>jsonb_array_length(doc->'items') then raise exception 'Missing or duplicate library slug'; end if;
     update public.site_preferences set palette=doc->'preferences'->>'palette',featured=doc->'preferences'->>'featured',
       metrics_enabled=(doc->'preferences'->>'metrics_enabled')::boolean,revision=revision+1 where id;
     for item in select value from jsonb_array_elements(doc->'notices') loop
       update public.site_content set heading=item->>'heading',body=item->>'body',revision=revision+1 where slot=item->>'slot';
     end loop;
     delete from public.library_items l where not exists(select 1 from jsonb_array_elements(doc->'items') v where v->>'slug'=l.slug);
     for item in select value from jsonb_array_elements(doc->'items') loop
       select revision into rev from public.library_items where slug=item->>'slug';
       perform public.manage_site('save-item',jsonb_build_object('slug',item->>'slug','revision',coalesce(rev,0),'item',item));
     end loop;
   end if;
   insert into public.management_log(action,target) values(op,'site content and settings');
 elsif op='storage' then
   select jsonb_build_object('databaseBytes',pg_database_size(current_database()),'tables',
     (select jsonb_agg(jsonb_build_object('name',c.relname,'bytes',pg_total_relation_size(c.oid)) order by pg_total_relation_size(c.oid) desc)
     from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
     'objects',(select count(*) from storage.objects),'buckets',(select count(*) from storage.buckets),
     'fileBytes',(select coalesce(sum(case when metadata->>'size' ~ '^[0-9]{1,18}$' then (metadata->>'size')::bigint else 0 end),0) from storage.objects)) into output; return output;
 elsif op='logs' then
   select coalesce(jsonb_agg(to_jsonb(l)),'[]') into output from (
    select id,at,action,target from public.management_log order by id desc limit 100 offset offset_rows
   ) l; return output;
 elsif op='prune' then
   cutoff=(args->>'before')::date;
   if cutoff is null or cutoff>current_date or args->>'confirm' is distinct from cutoff::text then raise exception 'Confirm the cutoff date'; end if;
   if args->>'type'='metrics' then
     delete from public.usage_daily where day<cutoff;
     delete from public.audience_daily where day<cutoff;
   elsif args->>'type'='management' then
     delete from public.management_log where at<(cutoff::timestamp at time zone 'UTC');
   else raise exception 'Unknown log type'; end if;
   insert into public.management_log(action,target) values(op,(args->>'type')||' before '||cutoff::text);
 elsif op='save-item' then
   doc=args->'item';
   if jsonb_typeof(doc->'lessons') is distinct from 'array' or octet_length(doc::text)>180000 then raise exception 'Invalid lesson document'; end if;
   for item in select value from jsonb_array_elements(doc->'lessons') loop
     if jsonb_typeof(item->'title') is distinct from 'string' or length(trim(item->>'title')) not between 1 and 120
      or jsonb_typeof(item->'body') is distinct from 'string' or length(trim(item->>'body')) not between 1 and 12000
      or length(coalesce(item->>'question',''))>500 or length(coalesce(item->>'answer',''))>400 then raise exception 'Check lesson title, material and question lengths'; end if;
     if (coalesce(trim(item->>'question'),'')='') <> (coalesce(trim(item->>'answer'),'')='') then raise exception 'A practice question needs an answer'; end if;
   end loop;
   if (args->>'revision')::int=0 then
     insert into public.library_items(slug,kind,title,summary,lessons,published) values(item_slug,doc->>'kind',doc->>'title',coalesce(doc->>'summary',''),doc->'lessons',(doc->>'published')::boolean) returning revision into rev;
   else
     update public.library_items set kind=doc->>'kind',title=doc->>'title',summary=coalesce(doc->>'summary',''),lessons=doc->'lessons',published=(doc->>'published')::boolean,revision=revision+1 where slug=item_slug and revision=(args->>'revision')::int returning revision into rev;
     if not found then raise exception 'Revision conflict. Reload before editing.'; end if;
   end if;
   insert into public.management_log(action,target) values(op,item_slug); return to_jsonb(rev);
 elsif op='delete-item' then
   if args->>'confirm' is distinct from item_slug then raise exception 'Confirm the slug'; end if;
   delete from public.library_items where slug=item_slug and revision=(args->>'revision')::int;
   if not found then raise exception 'Revision conflict. Reload before deleting.'; end if;
   insert into public.management_log(action,target) values(op,item_slug);
 else raise exception 'Unknown operation'; end if;
 return 'true'::jsonb;
end $$;
revoke all on function public.manage_site(text,jsonb) from public,anon;
grant execute on function public.manage_site(text,jsonb) to authenticated;
commit;
