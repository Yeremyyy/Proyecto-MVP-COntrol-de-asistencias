# Sistema de asistencia - versión local

Esta versión permite probar el módulo de Recursos Humanos sin base de datos.
Las solicitudes y decisiones se guardan en `localStorage` del computador.

## Ejecutar

```powershell
npm.cmd install
npm.cmd start
```

## Credenciales

- Administrador: `jordan@empresa.cl` / `123`
- Empleado: `rafa@empresa.cl` / `123`
- Empleado: `pato@empresa.cl` / `123`
- Recursos Humanos: `rrhh@empresa.cl` / `123`

## Probar RR. HH.

1. Inicia sesión como empleado.
2. Selecciona un día rojo del calendario.
3. Envía un certificado, licencia u olvido de marcación.
4. Cierra la sesión e ingresa como RR. HH.
5. Abre la solicitud, escribe un comentario y aprueba o rechaza.
6. Revisa la decisión en el historial.

Las licencias se envían desde el botón independiente `Informar licencia médica`.
Cuando RR. HH. las aprueba, los días laborales se asignan automáticamente y
aparecen en azul en el calendario. Las flechas del calendario permiten revisar
meses futuros.

Los documentos nuevos de hasta 3 MB se conservan localmente y RR. HH. puede
abrirlos desde el detalle. La sección superior muestra solo solicitudes
pendientes; las resueltas pasan al historial, donde existe un botón para volver
a consultar todos sus detalles.

El panel de RR. HH. tiene dos vistas: solicitudes pendientes e historial. En
el historial se puede buscar por nombre, apellidos o RUT y filtrar por estado,
tipo de solicitud y fechas de revisión.

En esta etapa se conserva el nombre del archivo adjunto, pero no sus bytes.
El archivo real se almacenará cuando el módulo sea conectado a Supabase.
# Actualización RRHH y corrección de usuarios

Si la base de datos ya fue creada anteriormente, abre Supabase > SQL Editor y ejecuta completo:

`supabase/MIGRACION_RRHH_ASISTENCIA.sql`

Este archivo no elimina tablas ni datos. Corrige el error `column reference nombre is ambiguous`, permite a RRHH generar su QR y protege las solicitudes propias contra autoaprobación.

Para habilitar la marcación QR del administrador en una base ya existente, ejecutar después:

`supabase/MIGRACION_QR_ADMIN.sql`
