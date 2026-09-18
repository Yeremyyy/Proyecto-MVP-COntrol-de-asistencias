# Sistema de asistencia con Supabase y QR

Esta versión integra:

- Login conectado a PostgreSQL/Supabase.
- Roles fijos: `ADMIN`, `EMPLEADO` y `RRHH`.
- Registro, edición y desactivación de usuarios.
- Datos personales y horario contractual.
- Solicitudes de certificados, licencias y olvidos de marcación.
- Aprobación/rechazo por RR. HH. y aplicación automática de licencias.
- Historial y auditoría de cambios.
- QR temporal de un solo uso.
- Primera lectura del día = entrada; segunda = salida; tercera = rechazada.
- Calendario y reporte diario consultados desde la base de datos.

## 1. Crear el proyecto Supabase

1. Entra a <https://supabase.com> y crea un proyecto vacío.
2. Espera a que el proyecto termine de inicializar.
3. Abre **SQL Editor** y crea una consulta nueva.
4. Copia todo el contenido de `supabase/schema.sql`.
5. Presiona **Run** una sola vez.

El script crea las tablas, restricciones, índices, funciones, seguridad y cuatro usuarios de prueba. Está pensado para una base nueva: al ejecutarlo nuevamente elimina y recrea las tablas del sistema.

También crea `pgcrypto` en el esquema `extensions` y usa `extensions.crypt()`, que es la ubicación habitual de esa función en Supabase.

## 2. Copiar las credenciales públicas

En Supabase abre **Project Settings > API** (en algunas versiones aparece como **Settings > Data API**). Copia:

- Project URL.
- `anon public` key o `publishable` key.

Abre `src/config.js` y reemplaza:

```js
module.exports = {
    SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
    SUPABASE_ANON_KEY: 'TU_ANON_O_PUBLISHABLE_KEY'
};
```

No utilices la clave `service_role`: esa clave es secreta y no debe quedar en la aplicación.

## 3. Instalar y ejecutar

Desde PowerShell, dentro de la carpeta del proyecto:

```powershell
npm.cmd install
npm.cmd start
```

Se usa `npm.cmd` para evitar el error de PowerShell que bloquea `npm.ps1`.

## 4. Usuarios de prueba

Todos utilizan la contraseña `123`.

| Rol | Correo |
|---|---|
| Administrador | `jordan@empresa.cl` |
| Empleado | `rafa@empresa.cl` |
| Empleado | `pato@empresa.cl` |
| Recursos Humanos | `rrhh@empresa.cl` |

Las contraseñas no se almacenan como texto: PostgreSQL las guarda cifradas mediante `pgcrypto`.

## 5. Probar entrada y salida con QR

1. Inicia sesión como empleado con `rafa@empresa.cl` / `123` y genera el QR.
2. Muestra ese QR en otro dispositivo o guarda una imagen para la prueba.
3. Regresa al login y abre **Modo Kiosco**. La misma ventana cambiará al lector.
4. Muestra el QR a la cámara del kiosco.
5. La primera lectura registra `ENTRADA`.
6. Genera un QR nuevo y vuelve a escanearlo: registrará `SALIDA`.
7. Un tercer intento del mismo día será rechazado.

Cada QR vence en 45 segundos y solo puede utilizarse una vez.

### Si Windows no permite abrir la cámara

Entra a **Configuración > Privacidad y seguridad > Cámara** y activa:

- Acceso a la cámara.
- Permitir que las aplicaciones accedan a la cámara.
- Permitir que las aplicaciones de escritorio accedan a la cámara.

Cierra también Cámara, Teams o Zoom si están utilizando el dispositivo. El kiosco muestra las cámaras detectadas y permite seleccionar otra.

## 6. Probar RR. HH.

1. Entra como empleado y envía una licencia o justificación.
2. Cierra la sesión e ingresa con `rrhh@empresa.cl` / `123`.
3. Abre la solicitud, revisa el documento y aprueba o rechaza.
4. Una licencia aprobada crea registros `LICENCIA` para los días hábiles del período.
5. Un olvido de entrada o salida aprobado aplica la hora confirmada por RR. HH.
6. La decisión y el usuario que la realizó quedan registrados en `auditoria`.

## 7. Tablas principales

| Tabla | Propósito |
|---|---|
| `roles` | Mantiene los tres roles permitidos. |
| `usuarios` | Datos personales, correo, contraseña cifrada, horario y rol. |
| `sesiones` | Tokens de inicio de sesión con vencimiento. |
| `asistencia` | Una jornada por empleado y fecha, con entrada, salida y estado. |
| `solicitudes` | Licencias, certificados y correcciones enviadas a RR. HH. |
| `qr_tokens` | Códigos temporales y de un solo uso. |
| `auditoria` | Actor, acción, registro y datos anteriores/nuevos. |

## Alcance de esta versión

Es una implementación académica funcional. Usa sesiones propias almacenadas en PostgreSQL para mantener el flujo comprensible. Para producción convendría migrar el login a Supabase Auth, almacenar documentos en Storage, aplicar recuperación de contraseña y definir políticas corporativas de retención de datos.
