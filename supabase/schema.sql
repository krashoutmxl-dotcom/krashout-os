-- Krashout OS — base de datos en Supabase
-- Pégalo completo en Supabase → SQL Editor → New query → Run.
-- Cada fila tiene dueño (user_id). Las reglas RLS hacen que cada cuenta
-- solo pueda ver y cambiar SUS filas; la llave pública del sitio no abre nada más.

create table if not exists public.objetivos (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         text not null check (id ~ '^[a-z0-9-]{1,48}$'),
  nombre     text not null check (char_length(nombre) between 1 and 60),
  orden      integer not null default 0,
  subs       jsonb not null default '[]'::jsonb check (jsonb_typeof(subs) = 'array' and jsonb_array_length(subs) <= 60 and pg_column_size(subs) < 32000),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.material (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         text not null check (id ~ '^[a-z0-9-]{1,48}$'),
  t          text not null check (char_length(t) between 1 and 80),
  ok         boolean not null default false,
  orden      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.objetivos enable row level security;
alter table public.material  enable row level security;
alter table public.objetivos force row level security;
alter table public.material  force row level security;

-- Nadie anónimo entra a nada.
revoke all on public.objetivos, public.material from anon;
grant select, insert, update, delete on public.objetivos, public.material to authenticated;

drop policy if exists "dueño lee objetivos" on public.objetivos;
drop policy if exists "dueño escribe objetivos" on public.objetivos;
create policy "dueño lee objetivos" on public.objetivos for select to authenticated using (user_id = auth.uid());
create policy "dueño escribe objetivos" on public.objetivos for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dueño lee material" on public.material;
drop policy if exists "dueño escribe material" on public.material;
create policy "dueño lee material" on public.material for select to authenticated using (user_id = auth.uid());
create policy "dueño escribe material" on public.material for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Límite de filas por cuenta (evita que alguien llene la base).
create or replace function public.krashout_limite() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_table_name = 'objetivos' and (select count(*) from public.objetivos where user_id = new.user_id) >= 40)
  or (tg_table_name = 'material'  and (select count(*) from public.material  where user_id = new.user_id) >= 60) then
    raise exception 'límite de filas alcanzado';
  end if;
  return new;
end $$;
drop trigger if exists limite_objetivos on public.objetivos;
drop trigger if exists limite_material on public.material;
create trigger limite_objetivos before insert on public.objetivos for each row execute function public.krashout_limite();
create trigger limite_material  before insert on public.material  for each row execute function public.krashout_limite();

-- Hora de último cambio.
create or replace function public.krashout_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists touch_objetivos on public.objetivos;
drop trigger if exists touch_material on public.material;
create trigger touch_objetivos before update on public.objetivos for each row execute function public.krashout_touch();
create trigger touch_material  before update on public.material  for each row execute function public.krashout_touch();

-- Tiempo real: que la compu y el cel se enteren de los cambios del otro.
do $$ begin
  begin alter publication supabase_realtime add table public.objetivos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.material;  exception when duplicate_object then null; end;
end $$;
