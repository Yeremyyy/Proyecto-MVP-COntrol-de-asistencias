-- Ejecutar una sola vez en Supabase > SQL Editor.
-- No elimina tablas ni modifica registros existentes.

create or replace function public.generar_qr(p_token uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor public.usuarios; v_qr public.qr_tokens;
begin
  v_actor:=public.usuario_de_sesion(p_token);
  if v_actor.usuario_id is null then raise exception 'Sesión inválida'; end if;
  if not exists(
    select 1 from public.roles r
    where r.rol_id=v_actor.rol_id
      and r.nombre in ('EMPLEADO','RRHH','ADMIN')
  ) then raise exception 'El usuario no tiene permiso para generar un QR'; end if;
  delete from public.qr_tokens
  where usuario_id=v_actor.usuario_id and usado_en is null;
  insert into public.qr_tokens(usuario_id, expira_en)
  values(v_actor.usuario_id, now() + interval '45 seconds')
  returning * into v_qr;
  return jsonb_build_object('token',v_qr.token,'expira_en',v_qr.expira_en);
end $$;

grant execute on function public.generar_qr(uuid) to anon, authenticated;
