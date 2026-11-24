-- =============================================================
-- Despedida de Fin de Año · Esquema PostgreSQL para Supabase
-- Ejecutar en Supabase Dashboard → SQL Editor → New query
-- Este archivo NO inserta datos de ejemplo. No hay invitados ficticios.
-- =============================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- -------------------------------------------------------------
-- 1. Tabla de invitados
-- -------------------------------------------------------------
create table if not exists public.invitados (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  apellido       text not null,
  telefono       text,
  acompanantes   integer not null default 0,
  estado         text not null default 'asistire',
  token          uuid not null unique default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  confirmado_en  timestamptz,

  constraint invitados_nombre_check
    check (char_length(btrim(nombre)) between 2 and 80),
  constraint invitados_apellido_check
    check (char_length(btrim(apellido)) between 2 and 80),
  constraint invitados_telefono_check
    check (char_length(coalesce(telefono, '')) <= 30),
  constraint invitados_acompanantes_check
    check (acompanantes between 0 and 5),
  constraint invitados_estado_check
    check (estado in ('asistire', 'no_podre', 'cancelado')),

  -- Claves normalizadas para evitar duplicados sin distorsionar los datos originales
  -- Se calculan en un trigger (ver más abajo) para poder quitar acentos de forma segura.
  nombre_key text,
  apellido_key text,
  telefono_key text
);

create unique index if not exists invitados_dup_con_tel
  on public.invitados (nombre_key, apellido_key, telefono_key)
  where telefono_key <> '';

create unique index if not exists invitados_dup_sin_tel
  on public.invitados (nombre_key, apellido_key)
  where telefono_key = '';

create index if not exists invitados_estado_idx
  on public.invitados (estado, confirmado_en desc);

-- -------------------------------------------------------------
-- 2. Organizadores (solo usuarios de Supabase Auth autorizados)
-- -------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email   text not null,
  creado_en timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 3. Helper: ¿es administrador el usuario actual?
--    SECURITY DEFINER evita recursión con las políticas RLS.
-- -------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

-- -------------------------------------------------------------
-- 3b. Claves normalizadas (sin acentos, minúsculas, dígitos)
-- -------------------------------------------------------------
create or replace function public.set_invitados_claves()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.nombre_key := unaccent(lower(btrim(new.nombre)));
  new.apellido_key := unaccent(lower(btrim(new.apellido)));
  new.telefono_key := regexp_replace(coalesce(new.telefono, ''), '[^0-9]', '', 'g');
  return new;
end;
$$;

drop trigger if exists trg_invitados_claves on public.invitados;
create trigger trg_invitados_claves
  before insert or update on public.invitados
  for each row execute function public.set_invitados_claves();

-- -------------------------------------------------------------
-- 4. Fechas automáticas
-- -------------------------------------------------------------
create or replace function public.set_invitados_fechas()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.actualizado_en := now();

  if tg_op = 'INSERT' then
    if new.estado = 'asistire' and new.confirmado_en is null then
      new.confirmado_en := now();
    end if;
  elsif tg_op = 'UPDATE' then
    if new.estado = 'asistire' and old.estado <> 'asistire'
       and new.confirmado_en is null then
      new.confirmado_en := now();
    end if;
    if new.estado <> 'asistire' and old.estado = 'asistire' then
      new.confirmado_en := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_invitados_fechas on public.invitados;
create trigger trg_invitados_fechas
  before insert or update on public.invitados
  for each row execute function public.set_invitados_fechas();

-- -------------------------------------------------------------
-- 5. RPC público: confirmar asistencia (genera token privado)
-- -------------------------------------------------------------
create or replace function public.confirmar_asistencia(
  p_nombre text,
  p_apellido text,
  p_telefono text default null,
  p_acompanantes integer default 0,
  p_estado text default 'asistire'
)
returns table (
  id uuid,
  token uuid,
  nombre text,
  apellido text,
  telefono text,
  acompanantes integer,
  estado text,
  confirmado_en timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_estado not in ('asistire', 'no_podre') then
    raise exception using errcode = '22023', message = 'ESTADO_INVALIDO';
  end if;
  if char_length(btrim(coalesce(p_nombre, ''))) < 2
     or char_length(btrim(p_nombre)) > 80 then
    raise exception using errcode = '22023', message = 'NOMBRE_INVALIDO';
  end if;
  if char_length(btrim(coalesce(p_apellido, ''))) < 2
     or char_length(btrim(p_apellido)) > 80 then
    raise exception using errcode = '22023', message = 'APELLIDO_INVALIDO';
  end if;
  if p_acompanantes is null or p_acompanantes not between 0 and 5 then
    raise exception using errcode = '22023', message = 'ACOMPANANTES_INVALIDOS';
  end if;
  if char_length(coalesce(p_telefono, '')) > 30 then
    raise exception using errcode = '22023', message = 'TELEFONO_INVALIDO';
  end if;

  if p_estado <> 'asistire' then
    p_acompanantes := 0;
  end if;

  return query
    insert into public.invitados
      (nombre, apellido, telefono, acompanantes, estado)
    values
      (btrim(p_nombre), btrim(p_apellido),
       nullif(btrim(coalesce(p_telefono, '')), ''),
       p_acompanantes, p_estado)
    returning
      invitados.id, invitados.token, invitados.nombre, invitados.apellido,
      invitados.telefono, invitados.acompanantes, invitados.estado,
      invitados.confirmado_en;

exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'DUPLICADO';
end;
$$;

-- -------------------------------------------------------------
-- 6. RPC privado por token: consultar / modificar / cancelar
-- -------------------------------------------------------------
create or replace function public.obtener_mi_confirmacion(p_token uuid)
returns table (
  id uuid,
  token uuid,
  nombre text,
  apellido text,
  telefono text,
  acompanantes integer,
  estado text,
  confirmado_en timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select i.id, i.token, i.nombre, i.apellido, i.telefono,
         i.acompanantes, i.estado, i.confirmado_en
  from public.invitados i
  where i.token = p_token;
$$;

create or replace function public.actualizar_mi_confirmacion(
  p_token uuid,
  p_nombre text,
  p_apellido text,
  p_telefono text default null,
  p_acompanantes integer default 0,
  p_estado text default 'asistire',
  p_cancelar boolean default false
)
returns table (
  id uuid,
  token uuid,
  nombre text,
  apellido text,
  telefono text,
  acompanantes integer,
  estado text,
  confirmado_en timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from public.invitados i where i.token = p_token) then
    raise exception using errcode = 'P0002', message = 'NO_ENCONTRADO';
  end if;

  if p_cancelar then
    return query
      update public.invitados i
         set estado = 'cancelado', acompanantes = 0
       where i.token = p_token
      returning i.id, i.token, i.nombre, i.apellido, i.telefono,
                i.acompanantes, i.estado, i.confirmado_en;
    return;
  end if;

  if p_estado not in ('asistire', 'no_podre') then
    raise exception using errcode = '22023', message = 'ESTADO_INVALIDO';
  end if;
  if char_length(btrim(coalesce(p_nombre, ''))) < 2
     or char_length(btrim(p_nombre)) > 80 then
    raise exception using errcode = '22023', message = 'NOMBRE_INVALIDO';
  end if;
  if char_length(btrim(coalesce(p_apellido, ''))) < 2
     or char_length(btrim(p_apellido)) > 80 then
    raise exception using errcode = '22023', message = 'APELLIDO_INVALIDO';
  end if;
  if p_acompanantes is null or p_acompanantes not between 0 and 5 then
    raise exception using errcode = '22023', message = 'ACOMPANANTES_INVALIDOS';
  end if;
  if p_estado <> 'asistire' then
    p_acompanantes := 0;
  end if;

  return query
    update public.invitados i
       set nombre = btrim(p_nombre),
           apellido = btrim(p_apellido),
           telefono = nullif(btrim(coalesce(p_telefono, '')), ''),
           acompanantes = p_acompanantes,
           estado = p_estado
     where i.token = p_token
    returning i.id, i.token, i.nombre, i.apellido, i.telefono,
              i.acompanantes, i.estado, i.confirmado_en;

exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'DUPLICADO';
end;
$$;

-- -------------------------------------------------------------
-- 7. RPC público: lista y totales (expone SOLO datos no sensibles)
-- -------------------------------------------------------------
create or replace function public.listado_confirmados()
returns table (
  nombre text,
  apellido text,
  acompanantes integer,
  confirmado_en timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select btrim(i.nombre), btrim(i.apellido), i.acompanantes, i.confirmado_en
  from public.invitados i
  where i.estado = 'asistire'
  order by i.confirmado_en desc nulls last, i.apellido, i.nombre;
$$;

create or replace function public.totales_publicos()
returns table (
  personas bigint,
  acompanantes bigint,
  total bigint
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select count(*)::bigint,
         coalesce(sum(i.acompanantes), 0)::bigint,
         coalesce(sum(1 + i.acompanantes), 0)::bigint
  from public.invitados i
  where i.estado = 'asistire';
$$;

-- -------------------------------------------------------------
-- 8. Permisos y Row Level Security
--    El público NUNCA tiene SELECT directo sobre la tabla.
--    Solo puede llamar a las RPC anteriores.
-- -------------------------------------------------------------
alter table public.invitados enable row level security;
alter table public.admins enable row level security;

revoke all on public.invitados from anon, authenticated;
revoke all on public.admins from anon, authenticated;

grant select, insert, update, delete on public.invitados to authenticated;

drop policy if exists "admin_lee_invitados" on public.invitados;
create policy "admin_lee_invitados"
  on public.invitados for select to authenticated
  using (public.es_admin());

drop policy if exists "admin_agrega_invitados" on public.invitados;
create policy "admin_agrega_invitados"
  on public.invitados for insert to authenticated
  with check (public.es_admin());

drop policy if exists "admin_modifica_invitados" on public.invitados;
create policy "admin_modifica_invitados"
  on public.invitados for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists "admin_elimina_invitados" on public.invitados;
create policy "admin_elimina_invitados"
  on public.invitados for delete to authenticated
  using (public.es_admin());

drop policy if exists "admin_ve_sus_datos" on public.admins;
create policy "admin_ve_sus_datos"
  on public.admins for select to authenticated
  using (user_id = auth.uid());

grant execute on function public.es_admin() to anon, authenticated;
grant execute on function public.confirmar_asistencia(text, text, text, integer, text) to anon, authenticated;
grant execute on function public.obtener_mi_confirmacion(uuid) to anon, authenticated;
grant execute on function public.actualizar_mi_confirmacion(uuid, text, text, text, integer, text, boolean) to anon, authenticated;
grant execute on function public.listado_confirmados() to anon, authenticated;
grant execute on function public.totales_publicos() to anon, authenticated;

-- =============================================================
-- Fin del esquema.
-- Para dar acceso al organizador, crear el usuario en
-- Authentication → Users y luego ejecutar (README, paso 4):
--   insert into public.admins (user_id, email)
--   select id, email from auth.users where email = 'TU_EMAIL_REAL';
-- =============================================================
