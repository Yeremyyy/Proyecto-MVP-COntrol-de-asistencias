-- Sistema de Control de Asistencia - Supabase/PostgreSQL
-- Ejecutar completo en Supabase > SQL Editor.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

drop function if exists public.registrar_marcacion_qr(uuid);
drop function if exists public.generar_qr(uuid);
drop function if exists public.revisar_solicitud(uuid,bigint,text,text,time);
drop function if exists public.crear_solicitud(uuid,text,date,date,text,text,text);
drop function if exists public.listar_solicitudes(uuid);
drop function if exists public.listar_asistencias(uuid,date,date);
drop function if exists public.listar_auditoria(uuid);
drop function if exists public.eliminar_usuario(uuid,bigint);
drop function if exists public.actualizar_usuario(uuid,bigint,text,text,text,text,text,text,text,time,time,text,text);
drop function if exists public.crear_usuario(uuid,text,text,text,text,text,text,text,text,time,time,text);
drop function if exists public.listar_usuarios(uuid);
drop function if exists public.cerrar_sesion(uuid);
drop function if exists public.autenticar_usuario(text,text);

drop table if exists public.auditoria cascade;
drop table if exists public.qr_tokens cascade;
drop table if exists public.solicitudes cascade;
drop table if exists public.asistencia cascade;
drop table if exists public.sesiones cascade;
drop table if exists public.usuarios cascade;
drop table if exists public.roles cascade;

create table public.roles (
  rol_id smallserial primary key,
  nombre text not null unique,
  descripcion text
);

insert into public.roles(nombre, descripcion) values
('ADMIN', 'Administra usuarios y reportes'),
('EMPLEADO', 'Marca asistencia y envía solicitudes'),
('RRHH', 'Revisa certificados, licencias y justificaciones');

create table public.usuarios (
  usuario_id bigserial primary key,
  rol_id smallint not null references public.roles(rol_id),
  nombre varchar(80) not null,
  apellido_paterno varchar(80) not null,
  apellido_materno varchar(80) not null,
  rut varchar(12) not null unique,
  telefono varchar(20) not null,
  direccion varchar(250) not null,
  correo varchar(160) not null unique,
  contrasena_hash text not null,
  hora_entrada time not null default '08:00',
  hora_salida time not null default '17:00',
  activo boolean not null default true,
  fecha_creacion timestamptz not null default now(),
  constraint ck_horario check (hora_salida > hora_entrada)
);

create table public.sesiones (
  token uuid primary key default gen_random_uuid(),
  usuario_id bigint not null references public.usuarios(usuario_id) on delete cascade,
  creada_en timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '12 hours'
);

create table public.asistencia (
  asistencia_id bigserial primary key,
  usuario_id bigint not null references public.usuarios(usuario_id) on delete restrict,
  fecha date not null default (timezone('America/Santiago', now()))::date,
  hora_entrada timestamptz,
  hora_salida timestamptz,
  tipo_asistencia varchar(30) not null default 'INCOMPLETA',
  observacion text,
  modificado_por bigint references public.usuarios(usuario_id),
  fecha_modificacion timestamptz,
  unique(usuario_id, fecha),
  constraint ck_tipo_asistencia check (tipo_asistencia in (
    'INCOMPLETA','ASISTENCIA_COMPLETA','INGRESO_ATRASADO',
    'SALIDA_ANTICIPADA','INASISTENCIA','LICENCIA','JUSTIFICADO'
  )),
  constraint ck_orden_marcas check (hora_salida is null or (hora_entrada is not null and hora_salida >= hora_entrada))
);

create table public.solicitudes (
  solicitud_id bigserial primary key,
  usuario_id bigint not null references public.usuarios(usuario_id) on delete restrict,
  tipo_solicitud varchar(30) not null,
  fecha_desde date not null,
  fecha_hasta date not null,
  motivo text not null,
  nombre_archivo varchar(255),
  archivo_base64 text,
  estado varchar(15) not null default 'PENDIENTE',
  revisado_por bigint references public.usuarios(usuario_id) on delete set null,
  comentario_revision text,
  hora_corregida time,
  fecha_envio timestamptz not null default now(),
  fecha_revision timestamptz,
  constraint ck_tipo_solicitud check (tipo_solicitud in ('LICENCIA','CERTIFICADO','OLVIDO_ENTRADA','OLVIDO_SALIDA')),
  constraint ck_estado_solicitud check (estado in ('PENDIENTE','APROBADA','RECHAZADA')),
  constraint ck_fechas_solicitud check (fecha_hasta >= fecha_desde)
);

create table public.qr_tokens (
  token uuid primary key default gen_random_uuid(),
  usuario_id bigint not null references public.usuarios(usuario_id) on delete cascade,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '30 seconds',
  usado_en timestamptz
);

create table public.auditoria (
  auditoria_id bigserial primary key,
  usuario_actor_id bigint references public.usuarios(usuario_id) on delete set null,
  tabla varchar(60) not null,
  registro_id bigint,
  accion varchar(20) not null,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  fecha_cambio timestamptz not null default now()
);

create index idx_asistencia_usuario_fecha on public.asistencia(usuario_id, fecha desc);
create index idx_solicitudes_estado_fecha on public.solicitudes(estado, fecha_envio desc);
create index idx_auditoria_fecha on public.auditoria(fecha_cambio desc);

-- Todas las tablas se consultan mediante funciones controladas.
alter table public.roles enable row level security;
alter table public.usuarios enable row level security;
alter table public.sesiones enable row level security;
alter table public.asistencia enable row level security;
alter table public.solicitudes enable row level security;
alter table public.qr_tokens enable row level security;
alter table public.auditoria enable row level security;

create or replace function public.usuario_de_sesion(p_token uuid)
returns public.usuarios
language sql stable security definer set search_path=public
as $$
  select u.* from public.sesiones s
  join public.usuarios u on u.usuario_id=s.usuario_id
  where s.token=p_token and s.expira_en>now() and u.activo
  limit 1;
$$;

create or replace function public.autenticar_usuario(p_correo text, p_contrasena text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_usuario public.usuarios; v_rol text; v_token uuid;
begin
  select u.* into v_usuario
  from public.usuarios u
  where lower(u.correo)=lower(trim(p_correo)) and u.activo
    and u.contrasena_hash=extensions.crypt(p_contrasena,u.contrasena_hash);
  if v_usuario.usuario_id is null then raise exception 'Credenciales incorrectas'; end if;
  select nombre into v_rol from public.roles where rol_id=v_usuario.rol_id;
  insert into public.sesiones(usuario_id) values(v_usuario.usuario_id) returning token into v_token;
  return jsonb_build_object('token',v_token,'usuario',jsonb_build_object(
    'id',v_usuario.usuario_id,'nombre',v_usuario.nombre,'apellido_paterno',v_usuario.apellido_paterno,
    'apellido_materno',v_usuario.apellido_materno,'rut',v_usuario.rut,'telefono',v_usuario.telefono,
    'direccion',v_usuario.direccion,'correo',v_usuario.correo,'hora_entrada',v_usuario.hora_entrada,
    'hora_salida',v_usuario.hora_salida,'rol',lower(v_rol)));
end $$;

create or replace function public.cerrar_sesion(p_token uuid)
returns void language sql security definer set search_path=public
as $$ delete from public.sesiones where token=p_token; $$;

create or replace function public.listar_usuarios(p_token uuid)
returns table(usuario_id bigint,nombre text,apellido_paterno text,apellido_materno text,rut text,telefono text,direccion text,correo text,hora_entrada time,hora_salida time,rol text,activo boolean)
language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if v_actor.usuario_id is null then raise exception 'Sesión inválida'; end if;
  if not exists(select 1 from public.roles rol_actor where rol_actor.rol_id=v_actor.rol_id and rol_actor.nombre='ADMIN') then raise exception 'Solo ADMIN puede listar usuarios'; end if;
  return query select u.usuario_id,u.nombre::text,u.apellido_paterno::text,u.apellido_materno::text,
    u.rut::text,u.telefono::text,u.direccion::text,u.correo::text,u.hora_entrada,u.hora_salida,
    lower(r.nombre),u.activo from public.usuarios u join public.roles r using(rol_id) where u.activo order by u.usuario_id;
end $$;

create or replace function public.crear_usuario(p_token uuid,p_nombre text,p_paterno text,p_materno text,p_rut text,p_telefono text,p_direccion text,p_correo text,p_contrasena text,p_entrada time,p_salida time,p_rol text)
returns bigint language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_id bigint; v_rol_id smallint;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if not exists(select 1 from public.roles where rol_id=v_actor.rol_id and nombre='ADMIN') then raise exception 'Solo ADMIN puede crear usuarios'; end if;
  select rol_id into v_rol_id from public.roles where nombre=upper(p_rol);
  if v_rol_id is null then raise exception 'Rol no permitido'; end if;
  insert into public.usuarios(rol_id,nombre,apellido_paterno,apellido_materno,rut,telefono,direccion,correo,contrasena_hash,hora_entrada,hora_salida)
  values(v_rol_id,trim(p_nombre),trim(p_paterno),trim(p_materno),trim(p_rut),trim(p_telefono),trim(p_direccion),lower(trim(p_correo)),extensions.crypt(p_contrasena,extensions.gen_salt('bf')),p_entrada,p_salida)
  returning usuario_id into v_id;
  insert into public.auditoria(usuario_actor_id,tabla,registro_id,accion,datos_nuevos) values(v_actor.usuario_id,'usuarios',v_id,'INSERT',jsonb_build_object('correo',p_correo,'rol',upper(p_rol)));
  return v_id;
end $$;

create or replace function public.actualizar_usuario(p_token uuid,p_id bigint,p_nombre text,p_paterno text,p_materno text,p_rut text,p_telefono text,p_direccion text,p_correo text,p_entrada time,p_salida time,p_rol text,p_nueva_contrasena text default null)
returns void language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_antes jsonb; v_rol_id smallint;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if not exists(select 1 from public.roles where rol_id=v_actor.rol_id and nombre='ADMIN') then raise exception 'Solo ADMIN puede actualizar usuarios'; end if;
  select to_jsonb(u) into v_antes from public.usuarios u where usuario_id=p_id;
  select rol_id into v_rol_id from public.roles where nombre=upper(p_rol);
  update public.usuarios set rol_id=v_rol_id,nombre=trim(p_nombre),apellido_paterno=trim(p_paterno),apellido_materno=trim(p_materno),rut=trim(p_rut),telefono=trim(p_telefono),direccion=trim(p_direccion),correo=lower(trim(p_correo)),hora_entrada=p_entrada,hora_salida=p_salida,
    contrasena_hash=case when nullif(p_nueva_contrasena,'') is null then contrasena_hash else extensions.crypt(p_nueva_contrasena,extensions.gen_salt('bf')) end
  where usuario_id=p_id;
  insert into public.auditoria(usuario_actor_id,tabla,registro_id,accion,datos_anteriores,datos_nuevos)
  select v_actor.usuario_id,'usuarios',p_id,'UPDATE',v_antes,to_jsonb(u)-'contrasena_hash' from public.usuarios u where usuario_id=p_id;
end $$;

create or replace function public.eliminar_usuario(p_token uuid,p_id bigint)
returns void language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_antes jsonb;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if not exists(select 1 from public.roles where rol_id=v_actor.rol_id and nombre='ADMIN') then raise exception 'Solo ADMIN puede desactivar usuarios'; end if;
  if v_actor.usuario_id=p_id then raise exception 'No puedes desactivar tu propia cuenta'; end if;
  select to_jsonb(u)-'contrasena_hash' into v_antes from public.usuarios u where usuario_id=p_id;
  update public.usuarios set activo=false where usuario_id=p_id;
  insert into public.auditoria(usuario_actor_id,tabla,registro_id,accion,datos_anteriores,datos_nuevos) values(v_actor.usuario_id,'usuarios',p_id,'DESACTIVAR',v_antes,jsonb_build_object('activo',false));
end $$;

create or replace function public.listar_asistencias(p_token uuid,p_desde date,p_hasta date)
returns table(asistencia_id bigint,usuario_id bigint,empleado text,rut text,fecha date,hora_entrada timestamptz,hora_salida timestamptz,tipo_asistencia text,observacion text)
language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_rol text;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  select nombre into v_rol from public.roles where rol_id=v_actor.rol_id;
  if v_actor.usuario_id is null then raise exception 'Sesión inválida'; end if;
  return query select a.asistencia_id,a.usuario_id,concat_ws(' ',u.nombre,u.apellido_paterno,u.apellido_materno),u.rut::text,a.fecha,a.hora_entrada,a.hora_salida,a.tipo_asistencia::text,a.observacion
  from public.asistencia a join public.usuarios u using(usuario_id)
  where a.fecha between p_desde and p_hasta and (v_rol in ('ADMIN','RRHH') or a.usuario_id=v_actor.usuario_id)
  order by a.fecha desc,u.apellido_paterno;
end $$;

create or replace function public.listar_auditoria(p_token uuid)
returns table(auditoria_id bigint,actor text,tabla text,registro_id bigint,accion text,datos_anteriores jsonb,datos_nuevos jsonb,fecha_cambio timestamptz)
language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if not exists(select 1 from public.roles where rol_id=v_actor.rol_id and nombre='ADMIN') then raise exception 'Solo ADMIN puede consultar auditoría'; end if;
  return query select a.auditoria_id,coalesce(concat_ws(' ',u.nombre,u.apellido_paterno),'Sistema'),a.tabla::text,a.registro_id,a.accion::text,a.datos_anteriores,a.datos_nuevos,a.fecha_cambio
  from public.auditoria a left join public.usuarios u on u.usuario_id=a.usuario_actor_id order by a.fecha_cambio desc limit 300;
end $$;

create or replace function public.crear_solicitud(p_token uuid,p_tipo text,p_desde date,p_hasta date,p_motivo text,p_nombre_archivo text,p_archivo_base64 text)
returns bigint language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_id bigint;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if v_actor.usuario_id is null then raise exception 'Sesión inválida'; end if;
  if not exists(select 1 from public.roles r where r.rol_id=v_actor.rol_id and r.nombre in ('EMPLEADO','RRHH','ADMIN')) then raise exception 'El usuario no tiene permiso para enviar solicitudes'; end if;
  insert into public.solicitudes(usuario_id,tipo_solicitud,fecha_desde,fecha_hasta,motivo,nombre_archivo,archivo_base64)
  values(v_actor.usuario_id,upper(p_tipo),p_desde,p_hasta,trim(p_motivo),p_nombre_archivo,p_archivo_base64) returning solicitud_id into v_id;
  insert into public.auditoria(usuario_actor_id,tabla,registro_id,accion,datos_nuevos) values(v_actor.usuario_id,'solicitudes',v_id,'INSERT',jsonb_build_object('tipo',upper(p_tipo),'desde',p_desde,'hasta',p_hasta));
  return v_id;
end $$;

create or replace function public.listar_solicitudes(p_token uuid)
returns table(solicitud_id bigint,usuario_id bigint,empleado text,rut text,correo text,tipo_solicitud text,fecha_desde date,fecha_hasta date,motivo text,nombre_archivo text,archivo_base64 text,estado text,revisado_por bigint,revisor text,comentario_revision text,hora_corregida time,fecha_envio timestamptz,fecha_revision timestamptz)
language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_rol text;
begin
  v_actor:=public.usuario_de_sesion(p_token); select nombre into v_rol from public.roles where rol_id=v_actor.rol_id;
  if v_actor.usuario_id is null then raise exception 'Sesión inválida'; end if;
  return query select s.solicitud_id,s.usuario_id,concat_ws(' ',u.nombre,u.apellido_paterno,u.apellido_materno),u.rut::text,u.correo::text,s.tipo_solicitud::text,s.fecha_desde,s.fecha_hasta,s.motivo,s.nombre_archivo::text,s.archivo_base64,s.estado::text,s.revisado_por,concat_ws(' ',rev.nombre,rev.apellido_paterno),s.comentario_revision,s.hora_corregida,s.fecha_envio,s.fecha_revision
  from public.solicitudes s join public.usuarios u using(usuario_id) left join public.usuarios rev on rev.usuario_id=s.revisado_por
  where v_rol in ('ADMIN','RRHH') or s.usuario_id=v_actor.usuario_id order by s.fecha_envio desc;
end $$;

create or replace function public.revisar_solicitud(p_token uuid,p_solicitud_id bigint,p_decision text,p_comentario text,p_hora_corregida time default null)
returns void language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_sol public.solicitudes; v_antes jsonb; v_fecha date; v_marca timestamptz;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if not exists(select 1 from public.roles where rol_id=v_actor.rol_id and nombre in ('RRHH','ADMIN')) then raise exception 'Permiso denegado'; end if;
  if upper(p_decision) not in ('APROBADA','RECHAZADA') then raise exception 'Decisión inválida'; end if;
  select * into v_sol from public.solicitudes where solicitud_id=p_solicitud_id for update;
  if v_sol.solicitud_id is null then raise exception 'Solicitud no encontrada'; end if;
  if v_sol.usuario_id=v_actor.usuario_id then raise exception 'No puedes revisar tu propia solicitud'; end if;
  v_antes:=to_jsonb(v_sol);
  if v_sol.estado<>'PENDIENTE' then raise exception 'La solicitud ya fue revisada'; end if;
  update public.solicitudes set estado=upper(p_decision),revisado_por=v_actor.usuario_id,comentario_revision=trim(p_comentario),hora_corregida=p_hora_corregida,fecha_revision=now() where solicitud_id=p_solicitud_id;
  if upper(p_decision)='APROBADA' then
    if v_sol.tipo_solicitud in ('LICENCIA','CERTIFICADO') then
      for v_fecha in select generate_series(v_sol.fecha_desde,v_sol.fecha_hasta,interval '1 day')::date loop
        if extract(isodow from v_fecha)<6 then
          insert into public.asistencia(usuario_id,fecha,tipo_asistencia,observacion,modificado_por,fecha_modificacion)
          values(v_sol.usuario_id,v_fecha,case when v_sol.tipo_solicitud='LICENCIA' then 'LICENCIA' else 'JUSTIFICADO' end,'Solicitud RRHH #'||v_sol.solicitud_id,v_actor.usuario_id,now())
          on conflict(usuario_id,fecha) do update set tipo_asistencia=excluded.tipo_asistencia,observacion=excluded.observacion,modificado_por=v_actor.usuario_id,fecha_modificacion=now();
        end if;
      end loop;
    elsif p_hora_corregida is not null then
      v_marca:=(v_sol.fecha_desde::text||' '||p_hora_corregida::text)::timestamp at time zone 'America/Santiago';
      insert into public.asistencia(usuario_id,fecha,hora_entrada,hora_salida,tipo_asistencia,observacion,modificado_por,fecha_modificacion)
      values(
        v_sol.usuario_id,
        v_sol.fecha_desde,
        case when v_sol.tipo_solicitud='OLVIDO_ENTRADA' then v_marca
             else (v_sol.fecha_desde::text||' '||(select hora_entrada from public.usuarios where usuario_id=v_sol.usuario_id)::text)::timestamp at time zone 'America/Santiago' end,
        case when v_sol.tipo_solicitud='OLVIDO_SALIDA' then v_marca end,
        'JUSTIFICADO','Corrección RRHH #'||v_sol.solicitud_id,v_actor.usuario_id,now()
      )
      on conflict(usuario_id,fecha) do update set hora_entrada=coalesce(excluded.hora_entrada,asistencia.hora_entrada),hora_salida=coalesce(excluded.hora_salida,asistencia.hora_salida),tipo_asistencia='JUSTIFICADO',observacion=excluded.observacion,modificado_por=v_actor.usuario_id,fecha_modificacion=now();
    end if;
  end if;
  insert into public.auditoria(usuario_actor_id,tabla,registro_id,accion,datos_anteriores,datos_nuevos)
  select v_actor.usuario_id,'solicitudes',p_solicitud_id,'REVISAR',v_antes,to_jsonb(s) from public.solicitudes s where solicitud_id=p_solicitud_id;
end $$;

create or replace function public.generar_qr(p_token uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_qr public.qr_tokens;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if v_actor.usuario_id is null then raise exception 'Sesión inválida'; end if;
  if not exists(select 1 from public.roles r where r.rol_id=v_actor.rol_id and r.nombre in ('EMPLEADO','RRHH','ADMIN')) then raise exception 'El usuario no tiene permiso para generar un QR'; end if;
  delete from public.qr_tokens where usuario_id=v_actor.usuario_id and usado_en is null;
  insert into public.qr_tokens(usuario_id, expira_en)
  values(v_actor.usuario_id, now() + interval '30 seconds')
  returning * into v_qr;
  return jsonb_build_object('token',v_qr.token,'expira_en',v_qr.expira_en);
end $$;

create or replace function public.registrar_marcacion_qr(p_qr_token uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_qr public.qr_tokens; v_usuario public.usuarios; v_asistencia public.asistencia; v_fecha date; v_tipo text; v_id bigint;
begin
  select * into v_qr from public.qr_tokens where token=p_qr_token for update;
  if v_qr.token is null or v_qr.usado_en is not null or v_qr.expira_en<now() then raise exception 'QR inválido, vencido o ya utilizado'; end if;
  select * into v_usuario from public.usuarios where usuario_id=v_qr.usuario_id and activo;
  if v_usuario.usuario_id is null then raise exception 'Empleado no disponible'; end if;
  v_fecha:=(timezone('America/Santiago',now()))::date;
  select * into v_asistencia from public.asistencia where usuario_id=v_usuario.usuario_id and fecha=v_fecha for update;
  if v_asistencia.asistencia_id is null then
    v_tipo:=case when (timezone('America/Santiago',now()))::time>v_usuario.hora_entrada then 'INGRESO_ATRASADO' else 'INCOMPLETA' end;
    insert into public.asistencia(usuario_id,fecha,hora_entrada,tipo_asistencia) values(v_usuario.usuario_id,v_fecha,now(),v_tipo) returning asistencia_id into v_id;
    v_tipo:='ENTRADA';
  elsif v_asistencia.hora_entrada is not null and v_asistencia.hora_salida is null then
    update public.asistencia set hora_salida=now(),tipo_asistencia=case when (timezone('America/Santiago',now()))::time<v_usuario.hora_salida then 'SALIDA_ANTICIPADA' when tipo_asistencia='INGRESO_ATRASADO' then 'INGRESO_ATRASADO' else 'ASISTENCIA_COMPLETA' end where asistencia_id=v_asistencia.asistencia_id;
    v_id:=v_asistencia.asistencia_id; v_tipo:='SALIDA';
  else
    raise exception 'La entrada y salida de hoy ya están registradas';
  end if;
  update public.qr_tokens set usado_en=now() where token=p_qr_token;
  insert into public.auditoria(usuario_actor_id,tabla,registro_id,accion,datos_nuevos) values(v_usuario.usuario_id,'asistencia',v_id,'MARCAR_'||v_tipo,jsonb_build_object('fecha',v_fecha,'medio','QR'));
  return jsonb_build_object('accion',v_tipo,'empleado',concat_ws(' ',v_usuario.nombre,v_usuario.apellido_paterno),'fecha',v_fecha,'hora',to_char(timezone('America/Santiago',now()),'HH24:MI:SS'));
end $$;

-- Datos de prueba. Todas las contraseñas son: 123
insert into public.usuarios(rol_id,nombre,apellido_paterno,apellido_materno,rut,telefono,direccion,correo,contrasena_hash,hora_entrada,hora_salida)
select rol_id,'Jordan','Muñoz','Rojas','11.111.111-1','+56 9 11111111','Av. Central 100','jordan@empresa.cl',extensions.crypt('123',extensions.gen_salt('bf')),'08:00','17:00' from public.roles where nombre='ADMIN';
insert into public.usuarios(rol_id,nombre,apellido_paterno,apellido_materno,rut,telefono,direccion,correo,contrasena_hash,hora_entrada,hora_salida)
select rol_id,'Rafa','Pérez','González','12.345.678-5','+56 9 22222222','Pasaje Norte 245','rafa@empresa.cl',extensions.crypt('123',extensions.gen_salt('bf')),'08:00','17:50' from public.roles where nombre='EMPLEADO';
insert into public.usuarios(rol_id,nombre,apellido_paterno,apellido_materno,rut,telefono,direccion,correo,contrasena_hash,hora_entrada,hora_salida)
select rol_id,'Pato','Soto','Vargas','15.678.901-2','+56 9 33333333','Calle Sur 860','pato@empresa.cl',extensions.crypt('123',extensions.gen_salt('bf')),'08:00','17:00' from public.roles where nombre='EMPLEADO';
insert into public.usuarios(rol_id,nombre,apellido_paterno,apellido_materno,rut,telefono,direccion,correo,contrasena_hash,hora_entrada,hora_salida)
select rol_id,'Camila','Rojas','Díaz','17.654.321-0','+56 9 44444444','Av. Costanera 450','rrhh@empresa.cl',extensions.crypt('123',extensions.gen_salt('bf')),'08:30','17:30' from public.roles where nombre='RRHH';

insert into public.solicitudes(usuario_id,tipo_solicitud,fecha_desde,fecha_hasta,motivo,estado)
select usuario_id,'CERTIFICADO',(timezone('America/Santiago',now()))::date,(timezone('America/Santiago',now()))::date,'Solicitud de prueba para revisar el flujo de RR. HH.','PENDIENTE'
from public.usuarios where correo='rafa@empresa.cl';

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function public.autenticar_usuario(text,text) to anon, authenticated;
grant execute on function public.cerrar_sesion(uuid) to anon, authenticated;
grant execute on function public.listar_usuarios(uuid) to anon, authenticated;
grant execute on function public.crear_usuario(uuid,text,text,text,text,text,text,text,text,time,time,text) to anon, authenticated;
grant execute on function public.actualizar_usuario(uuid,bigint,text,text,text,text,text,text,text,time,time,text,text) to anon, authenticated;
grant execute on function public.eliminar_usuario(uuid,bigint) to anon, authenticated;
grant execute on function public.listar_asistencias(uuid,date,date) to anon, authenticated;
grant execute on function public.listar_auditoria(uuid) to anon, authenticated;
grant execute on function public.crear_solicitud(uuid,text,date,date,text,text,text) to anon, authenticated;
grant execute on function public.listar_solicitudes(uuid) to anon, authenticated;
grant execute on function public.revisar_solicitud(uuid,bigint,text,text,time) to anon, authenticated;
grant execute on function public.generar_qr(uuid) to anon, authenticated;
grant execute on function public.registrar_marcacion_qr(uuid) to anon, authenticated;
