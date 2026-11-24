begin;

-- Only explicitly enrolled accounts have a row. No public grants on identity tables.
create table if not exists public.learning_members (
  player uuid primary key references auth.users(id) on delete cascade,
  alias text not null unique default ('Explorer-' || substr(replace(gen_random_uuid()::text,'-',''),1,12))
);
alter table public.learning_members enable row level security;
revoke all on public.learning_members from public,anon,authenticated;

create table if not exists public.learning_exercises (
  track text not null, exercise text not null, primary key(track,exercise)
);
alter table public.learning_exercises enable row level security;
revoke all on public.learning_exercises from public,anon,authenticated;

-- Catalog values maintained by scripts/course-catalog.mjs.
-- BEGIN EXERCISE IDS
delete from public.learning_exercises;
insert into public.learning_exercises(track,exercise)
select 'imon-lab-progress-v1', unnest(string_to_array('html-first-tag html-heading html-list css-colour css-box css-selector js-variable js-condition js-loop js-function js-quiz-01 js-quiz-02 js-quiz-03 js-quiz-04 js-quiz-05 js-quiz-06 js-quiz-07 js-quiz-08 js-quiz-09 js-quiz-10 js-quiz-11 js-quiz-12 js-quiz-13 js-quiz-14 js-quiz-15 js-quiz-16 js-quiz-17 js-quiz-18 js-quiz-19 js-quiz-20 js-quiz-21 js-quiz-22 js-quiz-23 js-quiz-24 js-quiz-25 cx-1-elements-01-star cx-1-elements-02-elemental cx-1-elements-03-newspaper cx-1-elements-04-corporate cx-1-elements-05-chef cx-1-elements-06-pet cx-1-elements-07-band cx-2-structure-08-blueprint cx-2-structure-09-family-tree cx-2-structure-10-craigslist-ad cx-2-structure-11-wiki-article cx-2-structure-12-lorem-ipsum cx-2-structure-13-power-rangers cx-2-structure-14-top-8 cx-3-forms-15-google cx-3-forms-15-google-bonus cx-3-forms-16-sign-up cx-3-forms-17-sign-up cx-3-forms-18-rsvp cx-3-forms-19-contact-us cx-3-forms-20-welp cx-3-forms-20-welp-nyc cx-4-semantic-html-22-the-header cx-4-semantic-html-23-main-footer cx-4-semantic-html-24-blog-posts cx-4-semantic-html-25-figures cx-4-semantic-html-26-final-touches cx-1-selectors-01-picasso cx-1-selectors-02-syntax cx-1-selectors-03-selectors-1 cx-1-selectors-04-selectors-2 cx-1-selectors-05-concert-flyer cx-2-properties-06-rainbow cx-2-properties-07-measurements cx-2-properties-08-five-families cx-2-properties-09-spellcheck cx-2-properties-10-wallpaper cx-2-properties-11-shorthands cx-2-properties-12-invitation cx-3-box-model-14-profile-status cx-3-box-model-15-wiggle-room cx-3-box-model-16-spaced-out cx-3-box-model-17-make-it-count cx-3-box-model-18-local-library cx-4-layout-19-lines-and-blocks cx-4-layout-20-go-with-the-flow cx-4-layout-21-its-all-relative cx-4-layout-22-absolute-removal cx-4-layout-23-fixed-banner cx-4-layout-24-sticky-elements cx-5-flexbox-26-in-the-flex cx-5-flexbox-27-directions cx-5-flexbox-28-spacing cx-5-flexbox-29-cross-axis cx-5-flexbox-30-flexible-sizing cx-5-flexbox-31-pokemon-cards cx-challenge-for-rent cx-challenge-garage-sale cx-challenge-map-directions cx-challenge-movie-review cx-challenge-packing-list cx-challenge-ramen-restaurant cx-challenge-bestie-fan-page cx-challenge-i-spy cx-challenge-juliens-art-mart cx-challenge-messy-closet cx-challenge-metamorphosis cx-challenge-song-lyrics cx-js-1-calculator cx-js-2-dom cx-js-3-event cx-js-4-object cx-js-5-storage cx-js-6-format mdn-spending-caption mdn-spending-headers mdn-spending-sections',' '))
union all
select 'imon-ai-lab-v1', unnest(string_to_array('ai-count-tokens ai-normalise ai-softmax ai-sliding-window ai-bigrams ai-cosine ai-mean-baseline ai-top-k ai-token-budget ai-word-frequency ai-leaky-bucket ai-exponential-backoff ai-retry-budget ai-idempotency-key ai-cache-hit ai-semantic-cache ai-circuit-breaker ai-queue-depth ai-cost-per-call ai-latency-budget ai-accuracy-check ai-confusion-matrix ai-redact-pii ai-prompt-injection ai-grounded-answer ai-eval-suite ai-drift-watch ai-design-rate-limit ai-design-timeout ai-design-cache ai-design-idempotency ai-design-scale ai-design-consistency ai-design-queue ai-design-prompt-injection ai-design-hallucination ai-design-privacy ai-design-eval ai-design-cost ai-design-migration ai-api-first-call ai-api-read-json ai-api-check-status ai-api-search ai-api-pagination ai-api-retry ai-api-timeout ai-db-create ai-db-insert ai-db-select ai-db-order-limit ai-db-update ai-db-delete ai-db-aggregate exercism-twofer-two-fer exercism-leapyear-leap exercism-convert-raindrops exercism-squareofsum-difference-of-squares exercism-sumofsquares-difference-of-squares exercism-differenceofsquares-difference-of-squares exercism-ispangram-pangram exercism-isisogram-isogram exercism-steps-collatz-conjecture exercism-value-resistor-color-duo exercism-score-darts exercism-isarmstrongnumber-armstrong-numbers',' '))
union all
select 'imon-circuits-v1', unnest(string_to_array('circuit-ohms-current circuit-ohms-power circuit-led-resistor circuit-kcl-node circuit-series-parallel circuit-kvl-loop circuit-divider-output circuit-divider-design circuit-divider-loading circuit-rc-tau circuit-rc-one-tau circuit-rc-settling circuit-rl-tau circuit-inductor-energy circuit-rl-flyback circuit-filter-cutoff circuit-resonance circuit-filter-choice circuit-rectifier-average circuit-ripple circuit-diode-equation circuit-led-current circuit-led-efficiency circuit-gate-truth circuit-de-morgan circuit-logic-levels circuit-half-adder circuit-full-adder circuit-multiplexer circuit-sr-latch circuit-flip-flop circuit-counter circuit-sampling-rate circuit-aliasing circuit-ground-loop circuit-impedance circuit-build-divider circuit-build-rc circuit-build-led',' '))
union all
select 'imon-systems-v1', unnest(string_to_array('network-subnet network-switch support-memory support-storage system-queue system-cache cloud-runtime cloud-retention defense-updates defense-restore signals-lsb signals-sampling model-recall electronics-divider',' '));
-- END EXERCISE IDS

create or replace function public.learning_membership(enroll boolean default null)
returns text language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if enroll is true then
    insert into public.learning_members(player) values(auth.uid()) on conflict(player) do nothing;
  elsif enroll is false then
    delete from public.learning_members where player=auth.uid();
  end if;
  return (select alias from public.learning_members where player=auth.uid());
end $$;
revoke all on function public.learning_membership(boolean) from public,anon;
grant execute on function public.learning_membership(boolean) to authenticated;

create or replace function public.learning_scores()
returns table(place bigint,alias text,lessons bigint,quiz bigint,points bigint)
language sql stable security definer set search_path='' as $$
  with counts as (
    select m.alias,
      (select count(*) from public.learning_exercises e
       where (p.data -> e.track -> 'solved') @> jsonb_build_array(e.exercise)) as lessons,
      (select sum(case when p.data ->> k in ('0','1','2','3','4','5') then (p.data ->> k)::int else 0 end)
       from unnest(array['imon-course-quiz-code','imon-course-quiz-ai','imon-course-quiz-circuits','imon-course-quiz-systems']) k) as quiz
    from public.learning_members m left join public.progress p on p.id=m.player
  ), totals as (select c.*, (c.lessons+c.quiz) as points from counts c)
  select dense_rank() over(order by t.points desc),t.alias,t.lessons,t.quiz,t.points
  from totals t order by t.points desc,t.alias limit 50;
$$;
revoke all on function public.learning_scores() from public;
grant execute on function public.learning_scores() to anon,authenticated;

-- Two devices can both read a save before either writes. Merge learning records
-- with the locked current row, including older clients which omit quiz keys.
create or replace function public.keep_learning_results()
returns trigger language plpgsql set search_path='' as $$
declare k text; old_ids jsonb; new_ids jsonb; ids jsonb;
begin
  foreach k in array array['imon-lab-progress-v1','imon-ai-lab-v1','imon-circuits-v1','imon-systems-v1'] loop
    if old.data ? k then
      old_ids=old.data -> k -> 'solved'; new_ids=new.data -> k -> 'solved';
      select coalesce(jsonb_agg(distinct v),'[]'::jsonb) into ids from jsonb_array_elements(
        (case when jsonb_typeof(old_ids)='array' then old_ids else '[]'::jsonb end) ||
        (case when jsonb_typeof(new_ids)='array' then new_ids else '[]'::jsonb end)
      ) v where jsonb_typeof(v)='string';
      new.data=jsonb_set(new.data,array[k],jsonb_build_object('solved',ids,'xp',
        greatest(coalesce(old.data -> k -> 'xp','0'::jsonb),coalesce(new.data -> k -> 'xp','0'::jsonb))));
    end if;
  end loop;
  foreach k in array array['imon-course-quiz-code','imon-course-quiz-ai','imon-course-quiz-circuits','imon-course-quiz-systems'] loop
    if old.data ->> k in ('0','1','2','3','4','5') then
      new.data=jsonb_set(new.data,array[k],greatest(old.data -> k,coalesce(new.data -> k,'0'::jsonb)));
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists keep_learning_results on public.progress;
create trigger keep_learning_results before update on public.progress for each row execute function public.keep_learning_results();
commit;
