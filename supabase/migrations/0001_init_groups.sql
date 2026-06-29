-- =====================================================================
-- LabStock グループ共有バックエンド (Supabase / PostgreSQL)
-- ログイン不要・端末ID(device_id) ＋ 招待コード方式
--
-- セキュリティ方針:
--   - 各テーブルは RLS を有効化し、ポリシーを作らない = anon からの
--     直接アクセス(select/insert/update/delete)を全面遮断。
--   - 操作はすべて SECURITY DEFINER の RPC 関数経由でのみ可能。
--   - 各関数はメンバーシップ(group_members)を検証してから処理する。
--   - anon(public)キーはクライアントに埋め込まれるが、上記により
--     「自分が作成/参加したグループ」以外は読み書きできない。
--
-- 適用方法: Supabase ダッシュボード → SQL Editor にこの全文を貼り付けて Run。
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- テーブル ----------
create table if not exists public.groups (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text not null default '',
  invite_code       text not null unique,
  created_by_device uuid not null,
  created_by_name   text not null,
  created_at        timestamptz not null default now()
);

create table if not exists public.group_members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups(id) on delete cascade,
  device_id    uuid not null,
  display_name text not null default '',
  role         text not null default 'member', -- 'owner' | 'member'
  joined_at    timestamptz not null default now(),
  unique (group_id, device_id)
);
create index if not exists idx_group_members_device on public.group_members(device_id);
create index if not exists idx_group_members_group  on public.group_members(group_id);

create table if not exists public.group_items (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups(id) on delete cascade,
  name            text not null,
  company         text not null default '',
  model_number    text not null default '',
  quantity        int  not null default 0,
  location        text not null default '',
  notes           text not null default '',
  alert_threshold int  not null default 0,
  tags            jsonb not null default '[]'::jsonb,
  barcode         text,
  image_url       text,
  created_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_group_items_group on public.group_items(group_id);

create table if not exists public.group_activity_logs (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  item_id     uuid,
  user_name   text not null default '',
  action      text not null,
  description text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_group_logs_group on public.group_activity_logs(group_id, created_at);

-- ---------- RLS: 直接アクセスを全面遮断（関数経由のみ） ----------
alter table public.groups               enable row level security;
alter table public.group_members        enable row level security;
alter table public.group_items          enable row level security;
alter table public.group_activity_logs  enable row level security;
-- ポリシーは作成しない → anon / authenticated からの直接 CRUD は不可。

-- =====================================================================
-- ヘルパ関数（API へは公開しない: 末尾で anon/public から execute を剥奪）
-- =====================================================================

-- メンバー判定
create or replace function public._is_member(p_group_id uuid, p_device_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from public.group_members
    where group_id = p_group_id and device_id = p_device_id
  );
$$;

-- 招待コード生成（衝突しない8文字）
create or replace function public._gen_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists(select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end;
$$;

-- グループを LocalGroup 形(JSON, camelCase) で返す
create or replace function public._group_json(p_group_id uuid, p_device_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'id',          g.id,
    'name',        g.name,
    'description', g.description,
    'inviteCode',  g.invite_code,
    'createdBy',   g.created_by_name,
    'createdAt',   g.created_at,
    'memberCount', (select count(*) from public.group_members m where m.group_id = g.id),
    'isOwner',     exists(select 1 from public.group_members m2
                          where m2.group_id = g.id and m2.device_id = p_device_id and m2.role = 'owner')
  )
  from public.groups g where g.id = p_group_id;
$$;

-- 在庫アイテムを LocalGroupItem 形(JSON) で返す
create or replace function public._item_json(it public.group_items)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'id',             it.id,
    'groupId',        it.group_id,
    'name',           it.name,
    'company',        it.company,
    'modelNumber',    it.model_number,
    'quantity',       it.quantity,
    'location',       it.location,
    'notes',          it.notes,
    'alertThreshold', it.alert_threshold,
    'tags',           it.tags,
    'barcode',        it.barcode,
    'imageUrl',       it.image_url,
    'createdBy',      it.created_by_name,
    'createdAt',      it.created_at,
    'updatedAt',      it.updated_at
  );
$$;

-- =====================================================================
-- 公開 RPC 関数（クライアントから supabase.rpc(...) で呼ぶ）
-- =====================================================================

-- グループ作成
create or replace function public.create_group(
  p_name text, p_description text, p_device_id uuid, p_user_name text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  v_code := public._gen_invite_code();
  insert into public.groups(name, description, invite_code, created_by_device, created_by_name)
  values (trim(p_name), trim(coalesce(p_description, '')), v_code, p_device_id, p_user_name)
  returning id into v_id;

  insert into public.group_members(group_id, device_id, display_name, role)
  values (v_id, p_device_id, p_user_name, 'owner');

  insert into public.group_activity_logs(group_id, user_name, action, description)
  values (v_id, p_user_name, 'create', p_user_name || 'がグループを作成しました');

  return public._group_json(v_id, p_device_id);
end;
$$;

-- 自分が参加しているグループ一覧
create or replace function public.get_my_groups(p_device_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(
    jsonb_agg(public._group_json(m.group_id, p_device_id) order by g.created_at desc),
    '[]'::jsonb
  )
  from public.group_members m
  join public.groups g on g.id = m.group_id
  where m.device_id = p_device_id;
$$;

-- グループ詳細（メンバーのみ）
create or replace function public.get_group_by_id(p_group_id uuid, p_device_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select case when public._is_member(p_group_id, p_device_id)
              then public._group_json(p_group_id, p_device_id)
              else null end;
$$;

-- 招待コードで参加
create or replace function public.join_group(
  p_invite_code text, p_device_id uuid, p_user_name text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_group public.groups;
begin
  select * into v_group from public.groups where invite_code = trim(p_invite_code) limit 1;
  if not found then
    return jsonb_build_object('success', false, 'error', '無効な招待コードです');
  end if;
  if public._is_member(v_group.id, p_device_id) then
    return jsonb_build_object('success', false, 'error', '既にこのグループに参加しています');
  end if;

  insert into public.group_members(group_id, device_id, display_name, role)
  values (v_group.id, p_device_id, p_user_name, 'member');

  insert into public.group_activity_logs(group_id, user_name, action, description)
  values (v_group.id, p_user_name, 'join', p_user_name || 'がグループに参加しました');

  return jsonb_build_object('success', true, 'group', public._group_json(v_group.id, p_device_id));
end;
$$;

-- 退出
create or replace function public.leave_group(
  p_group_id uuid, p_device_id uuid, p_user_name text
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public._is_member(p_group_id, p_device_id) then
    return false;
  end if;
  delete from public.group_members where group_id = p_group_id and device_id = p_device_id;
  insert into public.group_activity_logs(group_id, user_name, action, description)
  values (p_group_id, p_user_name, 'leave', p_user_name || 'がグループから退出しました');
  return true;
end;
$$;

-- 削除（オーナーのみ）
create or replace function public.delete_group(p_group_id uuid, p_device_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.group_members
                where group_id = p_group_id and device_id = p_device_id and role = 'owner') then
    return false;
  end if;
  delete from public.groups where id = p_group_id; -- cascade で members/items/logs も削除
  return true;
end;
$$;

-- 在庫アイテム一覧（メンバーのみ）
create or replace function public.get_group_items(p_group_id uuid, p_device_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select case when public._is_member(p_group_id, p_device_id) then
    coalesce(
      (select jsonb_agg(public._item_json(it) order by it.created_at desc)
       from public.group_items it where it.group_id = p_group_id),
      '[]'::jsonb)
  else '[]'::jsonb end;
$$;

-- 在庫アイテム追加
create or replace function public.add_group_item(
  p_group_id uuid, p_device_id uuid, p_user_name text, p_item jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare it public.group_items;
begin
  if not public._is_member(p_group_id, p_device_id) then
    raise exception 'not a member of this group';
  end if;

  insert into public.group_items(
    group_id, name, company, model_number, quantity, location, notes,
    alert_threshold, tags, barcode, image_url, created_by_name
  ) values (
    p_group_id,
    coalesce(p_item->>'name', ''),
    coalesce(p_item->>'company', ''),
    coalesce(p_item->>'modelNumber', ''),
    coalesce((p_item->>'quantity')::int, 0),
    coalesce(p_item->>'location', ''),
    coalesce(p_item->>'notes', ''),
    coalesce((p_item->>'alertThreshold')::int, 0),
    coalesce(p_item->'tags', '[]'::jsonb),
    nullif(p_item->>'barcode', ''),
    nullif(p_item->>'imageUrl', ''),
    coalesce(nullif(p_item->>'createdBy', ''), p_user_name)
  ) returning * into it;

  insert into public.group_activity_logs(group_id, item_id, user_name, action, description)
  values (p_group_id, it.id, p_user_name, 'add_item',
          '「' || it.name || '」を追加しました（在庫: ' || it.quantity || '個）');

  return public._item_json(it);
end;
$$;

-- 在庫アイテム更新（部分更新）
create or replace function public.update_group_item(
  p_group_id uuid, p_item_id uuid, p_device_id uuid, p_user_name text, p_updates jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare old public.group_items; it public.group_items; v_delta int;
begin
  if not public._is_member(p_group_id, p_device_id) then
    raise exception 'not a member of this group';
  end if;
  select * into old from public.group_items where id = p_item_id and group_id = p_group_id;
  if not found then return null; end if;

  update public.group_items set
    name            = coalesce(p_updates->>'name', name),
    company         = coalesce(p_updates->>'company', company),
    model_number    = coalesce(p_updates->>'modelNumber', model_number),
    quantity        = coalesce((p_updates->>'quantity')::int, quantity),
    location        = coalesce(p_updates->>'location', location),
    notes           = coalesce(p_updates->>'notes', notes),
    alert_threshold = coalesce((p_updates->>'alertThreshold')::int, alert_threshold),
    tags            = coalesce(p_updates->'tags', tags),
    barcode         = coalesce(nullif(p_updates->>'barcode', ''), barcode),
    image_url       = coalesce(nullif(p_updates->>'imageUrl', ''), image_url),
    updated_at      = now()
  where id = p_item_id
  returning * into it;

  if (p_updates ? 'quantity') and it.quantity is distinct from old.quantity then
    v_delta := it.quantity - old.quantity;
    insert into public.group_activity_logs(group_id, item_id, user_name, action, description)
    values (p_group_id, it.id, p_user_name, 'update_quantity',
            '「' || old.name || '」の在庫数を ' || old.quantity || ' → ' || it.quantity ||
            ' に変更（' || (case when v_delta >= 0 then '+' else '' end) || v_delta || '）');
  else
    insert into public.group_activity_logs(group_id, item_id, user_name, action, description)
    values (p_group_id, it.id, p_user_name, 'edit_item', '「' || old.name || '」を編集しました');
  end if;

  return public._item_json(it);
end;
$$;

-- 在庫アイテム削除
create or replace function public.delete_group_item(
  p_group_id uuid, p_item_id uuid, p_device_id uuid, p_user_name text
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public._is_member(p_group_id, p_device_id) then return false; end if;
  select name into v_name from public.group_items where id = p_item_id and group_id = p_group_id;
  if not found then return false; end if;
  delete from public.group_items where id = p_item_id;
  insert into public.group_activity_logs(group_id, item_id, user_name, action, description)
  values (p_group_id, p_item_id, p_user_name, 'delete_item', '「' || v_name || '」を削除しました');
  return true;
end;
$$;

-- 活動ログ取得（メンバーのみ・最新100件）
create or replace function public.get_group_logs(p_group_id uuid, p_device_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select case when public._is_member(p_group_id, p_device_id) then
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'groupId', l.group_id, 'userName', l.user_name,
        'action', l.action, 'description', l.description, 'timestamp', l.created_at
      ) order by l.created_at desc)
      from (
        select * from public.group_activity_logs
        where group_id = p_group_id order by created_at desc limit 100
      ) l
    ), '[]'::jsonb)
  else '[]'::jsonb end;
$$;

-- =====================================================================
-- 権限: 公開 RPC は anon/authenticated に EXECUTE を付与、ヘルパは剥奪
-- =====================================================================
revoke execute on function public._is_member(uuid, uuid)        from public, anon, authenticated;
revoke execute on function public._gen_invite_code()            from public, anon, authenticated;
revoke execute on function public._group_json(uuid, uuid)       from public, anon, authenticated;
revoke execute on function public._item_json(public.group_items) from public, anon, authenticated;

grant execute on function public.create_group(text, text, uuid, text)               to anon, authenticated;
grant execute on function public.get_my_groups(uuid)                                to anon, authenticated;
grant execute on function public.get_group_by_id(uuid, uuid)                        to anon, authenticated;
grant execute on function public.join_group(text, uuid, text)                       to anon, authenticated;
grant execute on function public.leave_group(uuid, uuid, text)                      to anon, authenticated;
grant execute on function public.delete_group(uuid, uuid)                           to anon, authenticated;
grant execute on function public.get_group_items(uuid, uuid)                        to anon, authenticated;
grant execute on function public.add_group_item(uuid, uuid, text, jsonb)            to anon, authenticated;
grant execute on function public.update_group_item(uuid, uuid, uuid, text, jsonb)   to anon, authenticated;
grant execute on function public.delete_group_item(uuid, uuid, uuid, text)          to anon, authenticated;
grant execute on function public.get_group_logs(uuid, uuid)                         to anon, authenticated;

-- 完了。
