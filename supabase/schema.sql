-- 예그린교회 앱·홈페이지 서버 (수파베이스) — 2026-11-22
-- 수파베이스 대시보드 › SQL Editor 에 이 파일 전체를 붙여 넣고 Run 한 번.
-- 구조: 문서 하나 = docs 표의 한 줄 (col = 묶음 이름, id, data = 내용 JSON)
-- 원칙: 승인된 교인만 읽기 / 「목사님께만」 글은 쓴 사람과 담임목사만 / 목장 글은 그 목장만
--       나만의 기도 공간·나만 보기 감사일기는 서버에 아예 올라오지 않음
--       홈페이지용 내용(col = 'site')은 누구나 읽고 관리자만 고침
-- 쓰기는 전부 yg_write() 함수 하나로만 (표에 직접 쓰기는 막음) → 함수 안에서 권한을 확인한다.
-- 첫 담임목사·간사 계정: 가입한 뒤 Table Editor › docs 에서 그 사람 members 줄의 data 에
--   "status":"approved", "role":"pastor"(또는 "admin") 으로 직접 고친다.

create table if not exists public.docs (
  col text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);
create index if not exists docs_col_idx on public.docs (col);
alter table public.docs enable row level security;
alter table public.docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- ---------- 나에 대한 정보 (보안 규칙 안에서 씀) ----------
create or replace function public.yg_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select data from public.docs where col = 'members' and id = auth.uid()::text
$$;
create or replace function public.yg_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.yg_me()->>'status' = 'approved', false)
$$;
create or replace function public.yg_role() returns text
language sql stable security definer set search_path = public as $$
  select case when public.yg_approved() then coalesce(public.yg_me()->>'role', 'member') else '' end
$$;
create or replace function public.yg_group() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(public.yg_me()->>'group', '')
$$;
-- 큐티 모임 식구인지 (목장과 따로, 관리자가 정함) (2026-11-25)
create or replace function public.yg_qt() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((public.yg_me()->>'qt')::boolean, false)
$$;

-- ---------- 읽기 규칙 ----------
drop policy if exists docs_read on public.docs;
create policy docs_read on public.docs for select using (
  case col
    when 'site' then true
    when 'members' then id = auth.uid()::text
      or public.yg_role() in ('admin', 'pastor')
      or (public.yg_approved() and data->>'status' = 'approved'
          and coalesce(data->>'group', '') <> '' and data->>'group' = public.yg_group())
    when 'memberPhones' then id = auth.uid()::text or public.yg_role() in ('admin', 'pastor')
    when 'posts' then public.yg_role() in ('admin', 'pastor')
      or (public.yg_approved() and (data->>'scope' = 'all'
          or (data->>'scope' = 'group' and data->>'group' = public.yg_group())
          or (data->>'scope' = 'qt' and public.yg_qt())))
    when 'pastorNotes' then public.yg_role() = 'pastor'
      or (public.yg_approved() and data->>'uid' = auth.uid()::text)
    when 'notices' then public.yg_role() in ('admin', 'pastor')
      or (public.yg_approved() and (data->>'to' = 'all' or data->>'to' = public.yg_group()
          or (data->>'to' = 'leader:' || public.yg_group() and public.yg_role() = 'leader')))   -- 목자님만 (2026-11-25)
    when 'newcomers' then public.yg_role() in ('admin', 'pastor')
    when 'groups' then public.yg_approved()
    when 'groupVideos' then public.yg_approved()
    when 'missionNews' then public.yg_approved()
    when 'family' then public.yg_approved()   -- 교우 동정 (2026-11-26)
    when 'challenges' then public.yg_approved()
    when 'settings' then public.yg_approved()
    when 'reads' then public.yg_approved()
    else false
  end
);
-- 직접 쓰기는 정책이 없으니 모두 막힘 (yg_write 만 씀)

-- ---------- 고치기 도구: 점 경로·배열 넣기/빼기·숫자 더하기·지우기 ----------
-- patch 예: {"text":"..."} / {"rsvp.u1": true} / {"reactors":{"__op":"union","v":["u1"]}}
--           {"n":{"__op":"inc","v":1}} / {"rsvp.u1":{"__op":"del"}}
create or replace function public.yg_apply(old jsonb, patch jsonb) returns jsonb
language plpgsql immutable as $$
declare
  res jsonb := coalesce(old, '{}'::jsonb);
  k text; v jsonb; path text[]; cur jsonb; op text; x jsonb; i int;
begin
  for k, v in select * from jsonb_each(coalesce(patch, '{}'::jsonb)) loop
    path := string_to_array(k, '.');
    for i in 1 .. array_length(path, 1) - 1 loop
      if jsonb_typeof(res #> path[1:i]) is distinct from 'object' then
        res := jsonb_set(res, path[1:i], '{}'::jsonb, true);
      end if;
    end loop;
    cur := res #> path;
    op := case when jsonb_typeof(v) = 'object' then v->>'__op' end;
    if op = 'union' then
      cur := case when jsonb_typeof(cur) = 'array' then cur else '[]'::jsonb end;
      for x in select * from jsonb_array_elements(v->'v') loop
        if not exists (select 1 from jsonb_array_elements(cur) e where e = x) then
          cur := cur || jsonb_build_array(x);
        end if;
      end loop;
      res := jsonb_set(res, path, cur, true);
    elsif op = 'remove' then
      select coalesce(jsonb_agg(e), '[]'::jsonb) into cur
        from jsonb_array_elements(case when jsonb_typeof(cur) = 'array' then cur else '[]'::jsonb end) e
        where not exists (select 1 from jsonb_array_elements(v->'v') y where y = e);
      res := jsonb_set(res, path, cur, true);
    elsif op = 'inc' then
      res := jsonb_set(res, path, to_jsonb(coalesce((cur #>> '{}')::numeric, 0) + (v->>'v')::numeric), true);
    elsif op = 'del' then
      res := res #- path;
    else
      res := jsonb_set(res, path, v, true);
    end if;
  end loop;
  return res;
end $$;

-- 바뀐 칸 이름들
create or replace function public.yg_changed(a jsonb, b jsonb) returns text[]
language sql immutable as $$
  select coalesce(array_agg(k), '{}') from (
    select k from jsonb_object_keys(coalesce(a, '{}'::jsonb) || coalesce(b, '{}'::jsonb)) k
    where (a->k) is distinct from (b->k)
  ) t
$$;
create or replace function public.yg_only(a jsonb, b jsonb, keys text[]) returns boolean
language sql immutable as $$ select public.yg_changed(a, b) <@ keys $$;
create or replace function public.yg_str(v jsonb, maxlen int) returns boolean
language sql immutable as $$ select jsonb_typeof(v) = 'string' and char_length(v #>> '{}') <= maxlen $$;
-- 배열 a 에만 있는 것들
create or replace function public.yg_minus(a jsonb, b jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements(coalesce(a, '[]'::jsonb)) e
  where not exists (select 1 from jsonb_array_elements(coalesce(b, '[]'::jsonb)) y where y = e)
$$;

-- ---------- 쓰기 규칙 ----------
create or replace function public.yg_can(kind text, c text, id text, o jsonb, n jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  u text := auth.uid()::text;
  role text := public.yg_role();
  g text := public.yg_group();
  ok boolean := role <> '';                       -- 승인된 교인
  staff boolean := role in ('admin', 'pastor');
  leader boolean := role in ('leader', 'admin', 'pastor');
  pastor boolean := role = 'pastor';
  oc int; nc int; i int;
begin
  if c = 'members' then
    if kind = 'create' then
      return u is not null and id = u and n->>'status' = 'pending' and n->>'role' = 'member'
        and coalesce(n->>'group', '') = '' and public.yg_str(n->'name', 20);
    elsif kind = 'update' then
      return staff and ((o->'role') is not distinct from (n->'role') or pastor)
        and (coalesce(o->>'role', '') <> 'pastor' or pastor);
    else return pastor; end if;

  elsif c = 'memberPhones' then
    return kind = 'create' and u is not null and id = u;

  elsif c = 'posts' then
    if kind = 'create' then
      return ok and n->>'uid' = u and n->>'scope' in ('all', 'group', 'qt')
        and (n->>'scope' = 'all' or (g <> '' and n->>'group' = g) or (n->>'scope' = 'qt' and public.yg_qt()))
        and public.yg_str(n->'text', case when n->>'cat' in ('qt', 'gpray') then 3000 else 1000 end)   -- 필사·목장 기도제목은 길게 (2026-11-25)
        and coalesce(jsonb_array_length(n->'reactors'), 0) = 0
        and coalesce(jsonb_array_length(n->'comments'), 0) = 0
        and coalesce((n->>'hidden')::boolean, false) = false
        and (coalesce((n->>'notice')::boolean, false) = false or staff);
    elsif kind = 'update' then
      if staff then return true; end if;
      if not (ok and (o->>'scope' = 'all' or (o->>'scope' = 'group' and o->>'group' = g) or (o->>'scope' = 'qt' and public.yg_qt()))) then return false; end if;
      if not public.yg_only(o, n, array['reactors', 'comments', 'hidden', 'answered']) then return false; end if;
      -- 기도 「응답됐어요」: 쓴 사람만 (2026-11-25)
      if (o->'answered') is distinct from (n->'answered') and o->>'uid' is distinct from u then return false; end if;
      -- 아멘·기도했어요: 내 것만 넣고 빼기
      if exists (select 1 from jsonb_array_elements(public.yg_minus(n->'reactors', o->'reactors')) e where e #>> '{}' <> u) then return false; end if;
      if exists (select 1 from jsonb_array_elements(public.yg_minus(o->'reactors', n->'reactors')) e where e #>> '{}' <> u) then return false; end if;
      -- 댓글: 끝에 하나씩 더하기만, 내 이름으로
      oc := coalesce(jsonb_array_length(o->'comments'), 0); nc := coalesce(jsonb_array_length(n->'comments'), 0);
      if nc < oc or nc > oc + 1 then return false; end if;
      for i in 0 .. oc - 1 loop
        if (o->'comments'->i) is distinct from (n->'comments'->i) then return false; end if;
      end loop;
      if nc = oc + 1 and (n->'comments'->oc->>'uid') is distinct from u then return false; end if;
      -- 신고: 숨기기만 (다시 보이기는 관리자)
      if (o->'hidden') is distinct from (n->'hidden') and coalesce((n->>'hidden')::boolean, false) = false then return false; end if;
      return true;
    else return staff or (ok and o->>'uid' = u); end if;

  elsif c = 'pastorNotes' then
    if kind = 'create' then return ok and n->>'uid' = u and public.yg_str(n->'text', 1000);
    elsif kind = 'update' then return pastor or (ok and o->>'uid' = u and public.yg_only(o, n, array['comments', 'answered']));
    else return pastor or (ok and o->>'uid' = u); end if;

  elsif c = 'groups' then
    if kind in ('create', 'delete') then return staff; end if;
    return staff
      or (leader and g = id and public.yg_only(o, n, array['meeting', 'rsvp']))
      or (ok and g = id and public.yg_only(o, n, array['rsvp'])
          and public.yg_changed(o->'rsvp', n->'rsvp') <@ array[u]);

  elsif c = 'groupVideos' then
    if kind = 'create' then return staff or (leader and n->>'target' = g);
    elsif kind = 'delete' then return staff or (leader and o->>'target' = g);
    else return staff; end if;

  elsif c in ('missionNews', 'family', 'challenges', 'settings', 'site') then
    return staff;

  elsif c = 'notices' then
    if kind = 'create' then
      return (staff or (leader and n->>'to' = g)) and public.yg_str(n->'title', 40) and public.yg_str(n->'body', 200);
    elsif kind = 'delete' then return staff;
    else return false; end if;

  elsif c = 'reads' then
    if kind = 'create' then return ok and n = '{"n":1}'::jsonb;
    elsif kind = 'update' then
      return ok and public.yg_only(o, n, array['n'])
        and abs((n->>'n')::numeric - coalesce((o->>'n')::numeric, 0)) = 1;
    else return false; end if;

  elsif c = 'newcomers' then
    if kind = 'create' then return u is not null and n->>'by' = u;
    elsif kind = 'delete' then return staff;
    else return false; end if;
  end if;
  return false;
end $$;

-- ---------- 쓰기 함수 (앱은 이것만 부름) ----------
-- op: 'add' | 'set' | 'update' | 'del'
create or replace function public.yg_write(op text, p_col text, p_id text default null, p_patch jsonb default '{}'::jsonb, p_merge boolean default false)
returns text
language plpgsql security definer set search_path = public as $$
declare
  o jsonb; n jsonb; kind text; the_id text := p_id;
begin
  if op = 'add' then
    the_id := replace(gen_random_uuid()::text, '-', '');
  elsif the_id is null or the_id = '' then
    raise exception 'missing-id';
  end if;
  select data into o from public.docs where col = p_col and id = the_id for update;

  if op = 'del' then
    if o is null then return the_id; end if;
    kind := 'delete'; n := null;
  elsif op = 'update' then
    if o is null then raise exception 'not-found'; end if;
    kind := 'update'; n := public.yg_apply(o, p_patch);
  elsif op = 'set' then
    kind := case when o is null then 'create' else 'update' end;
    n := public.yg_apply(case when p_merge then o else '{}'::jsonb end, p_patch);
  elsif op = 'add' then
    kind := 'create'; n := public.yg_apply('{}'::jsonb, p_patch);
  else
    raise exception 'bad-op';
  end if;

  if not public.yg_can(kind, p_col, the_id, o, n) then
    raise exception 'permission-denied' using errcode = '42501';
  end if;

  if kind = 'delete' then
    delete from public.docs where col = p_col and id = the_id;
  else
    insert into public.docs (col, id, data, updated_at) values (p_col, the_id, n, now())
    on conflict (col, id) do update set data = excluded.data, updated_at = now();
  end if;
  return the_id;
end $$;

revoke all on function public.yg_write(text, text, text, jsonb, boolean) from public, anon;
grant execute on function public.yg_write(text, text, text, jsonb, boolean) to authenticated;
grant select on public.docs to anon, authenticated;
