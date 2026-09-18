# Desplegar el sistema de asistencia en Vercel

## 1. Probar localmente

1. Copia `.env.example` y cambia el nombre de la copia a `.env`.
2. Completa los valores con **Project URL** y la clave **anon/publishable** de Supabase.
3. Desde PowerShell, dentro de la carpeta del proyecto, ejecuta:

```powershell
npm.cmd install
npm.cmd run dev
```

4. Abre la dirección que indique Vite, normalmente `http://localhost:5173`.

## 2. Subir el proyecto a GitHub

Sube todos los archivos del proyecto excepto `.env`, `node_modules` y `dist`. Esos elementos ya están ignorados mediante `.gitignore`.

## 3. Importar en Vercel

1. En Vercel selecciona **Add New > Project**.
2. Importa el repositorio de GitHub.
3. Vercel debería detectar automáticamente **Vite**.
4. Verifica esta configuración:

| Opción | Valor |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

## 4. Agregar las variables de Supabase

En **Project Settings > Environment Variables** agrega:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Marca Production, Preview y Development si utilizarás los tres ambientes. Usa solamente la clave `anon` o `publishable`; nunca uses `service_role` en el frontend.

## 5. Desplegar

Presiona **Deploy**. Al finalizar tendrás:

- Sistema principal: `https://tu-dominio.vercel.app/`
- Kiosco QR: `https://tu-dominio.vercel.app/kiosco.html`

Después de cambiar variables de entorno debes realizar un nuevo despliegue desde **Deployments > Redeploy**.

## 6. Prueba recomendada

1. Inicia sesión con un empleado y genera un QR.
2. Abre `/kiosco.html` en otro dispositivo con cámara.
3. Autoriza el permiso de cámara.
4. Escanea una vez para registrar entrada.
5. Genera otro QR y escanéalo para registrar salida.
6. Comprueba el calendario.
7. Envía una licencia con PDF y ábrela desde RRHH.
8. Aprueba o rechaza la solicitud.
9. Descarga un reporte desde el administrador.

La cámara necesita HTTPS o localhost. El dominio de Vercel ya utiliza HTTPS.
