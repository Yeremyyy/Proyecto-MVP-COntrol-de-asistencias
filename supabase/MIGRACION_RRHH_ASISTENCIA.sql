-- Ejecutar este archivo completo en Supabase > SQL Editor.
-- No elimina tablas ni registros existentes.

-- 1. Corrige "column reference nombre is ambiguous" al listar usuarios.
create or replace function public.listar_usuarios(p_token uuid)
returns table(usuario_id bigint,nombre text,apellido_paterno text,apellido_materno text,rut text,telefono text,direccion text,correo text,hora_entrada time,hora_salida time,rol text,activo boolean)
language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if v_actor.usuario_id is null then raise exception 'Sesión inválida'; end if;
  if not exists(
    select 1 from public.roles rol_actor
    where rol_actor.rol_id=v_actor.rol_id and rol_actor.nombre='ADMIN'
  ) then raise exception 'Solo ADMIN puede listar usuarios'; end if;
  return query
  select u.usuario_id,u.nombre::text,u.apellido_paterno::text,u.apellido_materno::text,
    u.rut::text,u.telefono::text,u.direccion::text,u.correo::text,u.hora_entrada,u.hora_salida,
    lower(r.nombre)::text,u.activo
  from public.usuarios u
  join public.roles r on r.rol_id=u.rol_id
  where u.activo=true
  order by u.usuario_id;
end $$;

-- 2. Permite generar QR a empleados, RRHH y administradores.
create or replace function public.generar_qr(p_token uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_qr public.qr_tokens;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if v_actor.usuario_id is null then raise exception 'Sesión inválida'; end if;
  if not exists(
    select 1 from public.roles r
    where r.rol_id=v_actor.rol_id and r.nombre in ('EMPLEADO','RRHH','ADMIN')
  ) then raise exception 'El usuario no tiene permiso para generar un QR'; end if;
  delete from public.qr_tokens where usuario_id=v_actor.usuario_id and usado_en is null;
  insert into public.qr_tokens(usuario_id, expira_en)
  values(v_actor.usuario_id, now() + interval '45 seconds')
  returning * into v_qr;
  return jsonb_build_object('token',v_qr.token,'expira_en',v_qr.expira_en);
end $$;

-- 3. Permite que RRHH envíe sus propias licencias o justificaciones.
create or replace function public.crear_solicitud(p_token uuid,p_tipo text,p_desde date,p_hasta date,p_motivo text,p_nombre_archivo text,p_archivo_base64 text)
returns bigint language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_id bigint;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if v_actor.usuario_id is null then raise exception 'Sesión inválida'; end if;
  if not exists(
    select 1 from public.roles r
    where r.rol_id=v_actor.rol_id and r.nombre in ('EMPLEADO','RRHH')
  ) then raise exception 'El usuario no tiene permiso para enviar solicitudes'; end if;
  insert into public.solicitudes(usuario_id,tipo_solicitud,fecha_desde,fecha_hasta,motivo,nombre_archivo,archivo_base64)
  values(v_actor.usuario_id,upper(p_tipo),p_desde,p_hasta,trim(p_motivo),p_nombre_archivo,p_archivo_base64)
  returning solicitud_id into v_id;
  insert into public.auditoria(usuario_actor_id,tabla,registro_id,accion,datos_nuevos)
  values(v_actor.usuario_id,'solicitudes',v_id,'INSERT',jsonb_build_object('tipo',upper(p_tipo),'desde',p_desde,'hasta',p_hasta));
  return v_id;
end $$;

-- 4. Impide que una persona de RRHH apruebe o rechace su propia solicitud.
create or replace function public.revisar_solicitud(p_token uuid,p_solicitud_id bigint,p_decision text,p_comentario text,p_hora_corregida time default null)
returns void language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_sol public.solicitudes; v_antes jsonb; v_fecha date; v_marca timestamptz;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if not exists(select 1 from public.roles r where r.rol_id=v_actor.rol_id and r.nombre in ('RRHH','ADMIN')) then raise exception 'Permiso denegado'; end if;
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
  select v_actor.usuario_id,'solicitudes',p_solicitud_id,'REVISAR',v_antes,to_jsonb(s)
  from public.solicitudes s where solicitud_id=p_solicitud_id;
end $$;

grant execute on function public.listar_usuarios(uuid) to anon, authenticated;
grant execute on function public.generar_qr(uuid) to anon, authenticated;
grant execute on function public.crear_solicitud(uuid,text,date,date,text,text,text) to anon, authenticated;
grant execute on function public.revisar_solicitud(uuid,bigint,text,text,time) to anon, authenticated;
