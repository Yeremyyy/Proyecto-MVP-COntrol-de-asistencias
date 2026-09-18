# Sistema de asistencia web con Supabase

Versión preparada para ejecutarse en navegador y desplegarse en Vercel.

## Funcionalidades

- Login y sesiones almacenadas en Supabase.
- Roles ADMIN, RRHH y EMPLEADO.
- QR temporal de 45 segundos y un solo uso.
- Primera marcación como entrada y segunda como salida.
- Kiosco web con lector de cámara.
- Calendario personal para los tres roles.
- Solicitudes de licencia, certificado y olvido de marcación.
- Revisión de solicitudes y apertura de documentos desde RRHH.
- Administración y búsqueda de usuarios.
- Auditoría de modificaciones.
- Reportes diarios, semanales y mensuales descargables en CSV.

## Preparación de Supabase

Para una base nueva ejecuta una sola vez `supabase/schema.sql` desde SQL Editor.

Si ya utilizabas la base de la versión anterior, conserva tus tablas y ejecuta solamente las migraciones que aún no hayas aplicado.

## Desarrollo local

```powershell
npm.cmd install
npm.cmd run dev
```

Antes debes crear `.env` a partir de `.env.example` y completar:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANON_O_PUBLISHABLE
```

No utilices la clave `service_role`.

## Compilación

```powershell
npm.cmd run build
npm.cmd run preview
```

Consulta `GUIA_DESPLIEGUE_VERCEL.md` para realizar la publicación paso a paso.

## Usuarios de prueba del esquema inicial

Todos utilizan la contraseña `123`.

| Rol | Correo |
|---|---|
| Administrador | `jordan@empresa.cl` |
| Empleado | `rafa@empresa.cl` |
| Empleado | `pato@empresa.cl` |
| Recursos Humanos | `rrhh@empresa.cl` |

Este es un proyecto académico. Para un entorno productivo real se recomienda utilizar Supabase Auth y Storage, además de definir políticas de seguridad y retención documental.
