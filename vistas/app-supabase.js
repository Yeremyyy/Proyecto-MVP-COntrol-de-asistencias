const { rpc, configurado } = require('../src/db');
const QRCode = require('qrcode');
const { ipcRenderer } = require('electron');

let usuarioActual = null;
let tokenSesion = sessionStorage.getItem('tokenSesion');
let usuariosBD = [];
let asistenciasBD = [];
let solicitudesBD = [];
let solicitudSeleccionadaId = null;
let relojIntervalo = null;
let qrIntervalo = null;
let mesCalendario = new Date();
let mesCalendarioRrhh = new Date();
let mesCalendarioAdmin = new Date();
let rangoReporteActual = null;

const $ = id => document.getElementById(id);
const vistas = ['vista-login', 'vista-panel', 'vista-admin', 'vista-rrhh'];

$('btn-abrir-kiosco')?.addEventListener('click', () => {
    window.location.href = 'kiosco.html';
});

function textoError(error) {
    return String(error?.message || error).replace(/^.*error:\s*/i, '');
}

function fechaLocal(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(date);
}

function nombreCompleto(usuario) {
    return [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' ');
}

function mostrarVista(id) {
    vistas.forEach(vista => $(vista)?.classList.remove('activa'));
    $(id)?.classList.add('activa');
}

function iniciarReloj() {
    clearInterval(relojIntervalo);
    const actualizar = () => $('reloj-actual').textContent = new Date().toLocaleTimeString('es-CL');
    actualizar();
    relojIntervalo = setInterval(actualizar, 1000);
}

async function cargarUsuarios() {
    usuariosBD = await rpc('listar_usuarios', { p_token: tokenSesion });
    return usuariosBD;
}

async function cargarAsistencias(desde, hasta) {
    asistenciasBD = await rpc('listar_asistencias', { p_token: tokenSesion, p_desde: desde, p_hasta: hasta });
    return asistenciasBD;
}

async function cargarSolicitudes() {
    solicitudesBD = await rpc('listar_solicitudes', { p_token: tokenSesion });
    return solicitudesBD;
}

async function entrarPanel(usuario) {
    usuarioActual = usuario;
    if (usuario.rol === 'admin') {
        $('nombre-admin').textContent = nombreCompleto(usuario);
        mostrarVista('vista-admin');
    } else if (usuario.rol === 'rrhh') {
        $('nombre-rrhh').textContent = nombreCompleto(usuario);
        $('nombre-asistencia-rrhh').textContent = nombreCompleto(usuario);
        mostrarVista('vista-rrhh');
        await prepararRrhh();
    } else {
        $('nombre-usuario').textContent = nombreCompleto(usuario);
        mostrarVista('vista-panel');
        iniciarReloj();
        prepararDatosAutomaticos();
        abrirModuloEmpleado('qr');
    }
}

$('formulario-login').addEventListener('submit', async evento => {
    evento.preventDefault();
    const mensaje = $('mensaje-error');
    mensaje.textContent = configurado ? 'Conectando...' : 'Debes configurar Supabase en src/config.js';
    if (!configurado) return;
    try {
        const resultado = await rpc('autenticar_usuario', {
            p_correo: $('correo').value.trim(),
            p_contrasena: $('contrasena').value
        });
        tokenSesion = resultado.token;
        sessionStorage.setItem('tokenSesion', tokenSesion);
        sessionStorage.setItem('usuarioActual', JSON.stringify(resultado.usuario));
        mensaje.textContent = '';
        evento.target.reset();
        await entrarPanel(resultado.usuario);
    } catch (error) {
        mensaje.textContent = textoError(error);
    }
});

async function cerrarSesion() {
    try { if (tokenSesion) await rpc('cerrar_sesion', { p_token: tokenSesion }); } catch (_) {}
    tokenSesion = null;
    usuarioActual = null;
    sessionStorage.clear();
    clearInterval(relojIntervalo);
    clearInterval(qrIntervalo);
    mostrarVista('vista-login');
}

['btn-cerrar-sesion', 'btn-cerrar-sesion-admin', 'btn-cerrar-sesion-rrhh'].forEach(id => $(id)?.addEventListener('click', cerrarSesion));

// ---------------- ASISTENCIA PERSONAL: QR ----------------
async function generarQrPersonal(idCanvas, idMensaje) {
    const mensaje = $(idMensaje);
    try {
        mensaje.textContent = 'Generando QR seguro...';
        const resultado = await rpc('generar_qr', { p_token: tokenSesion });
        const canvas = $(idCanvas);
        await QRCode.toCanvas(canvas, resultado.token, { width: 220, margin: 2, errorCorrectionLevel: 'H' });
        canvas.style.display = 'block';
        clearInterval(qrIntervalo);
        // El QR nunca debe permanecer visible por más de 45 segundos,
        // aunque una base de datos antigua devuelva una expiración mayor.
        let segundos = Math.min(45, Math.max(0, Math.ceil((new Date(resultado.expira_en) - Date.now()) / 1000)));
        mensaje.textContent = `QR válido durante ${segundos} segundos`;
        qrIntervalo = setInterval(() => {
            segundos--;
            mensaje.textContent = segundos > 0 ? `QR válido durante ${segundos} segundos` : 'QR vencido. Genera uno nuevo.';
            if (segundos <= 0) {
                clearInterval(qrIntervalo);
                canvas.style.display = 'none';
            }
        }, 1000);
    } catch (error) {
        mensaje.textContent = textoError(error);
    }
}

$('btn-generar-qr-empleado')?.addEventListener('click', () => generarQrPersonal('qr-empleado', 'qr-contador'));
$('btn-generar-qr-rrhh')?.addEventListener('click', () => generarQrPersonal('qr-rrhh', 'qr-contador-rrhh'));
$('btn-generar-qr-admin')?.addEventListener('click', () => generarQrPersonal('qr-admin', 'qr-contador-admin'));

function abrirModuloEmpleado(modulo) {
    const esQr = modulo === 'qr';
    $('modulo-qr-empleado').style.display = esQr ? 'block' : 'none';
    $('modulo-calendario-empleado').style.display = esQr ? 'none' : 'block';
    $('btn-empleado-qr').classList.toggle('activo', esQr);
    $('btn-empleado-calendario').classList.toggle('activo', !esQr);
    if (!esQr) renderizarCalendario();
}
$('btn-empleado-qr')?.addEventListener('click', () => abrirModuloEmpleado('qr'));
$('btn-empleado-calendario')?.addEventListener('click', () => abrirModuloEmpleado('calendario'));

// ---------------- EMPLEADO: CALENDARIO Y SOLICITUDES ----------------
function prepararDatosAutomaticos() {
    $('licencia-empleado-auto').textContent = nombreCompleto(usuarioActual);
    $('licencia-correo-auto').textContent = usuarioActual.correo;
    $('solicitud-empleado-auto').textContent = nombreCompleto(usuarioActual);
    $('solicitud-correo-auto').textContent = usuarioActual.correo;
}

async function renderizarCalendarioPara({ mesReferencia, contenedorId, tituloId, usuarioId = null, permitirJustificacion = false }) {
    const ano = mesReferencia.getFullYear();
    const mes = mesReferencia.getMonth();
    const desde = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
    const ultimo = new Date(ano, mes + 1, 0).getDate();
    const hasta = `${ano}-${String(mes + 1).padStart(2, '0')}-${ultimo}`;
    try {
        await cargarAsistencias(desde, hasta);
    } catch (error) {
        $(contenedorId).innerHTML = `<p class="texto-error">${textoError(error)}</p>`;
        return;
    }
    const registros = usuarioId === null
        ? asistenciasBD
        : asistenciasBD.filter(a => Number(a.usuario_id) === Number(usuarioId));
    $(tituloId).textContent = new Date(ano, mes, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    const contenedor = $(contenedorId);
    contenedor.innerHTML = '';
    ['L','M','M','J','V','S','D'].forEach(dia => contenedor.insertAdjacentHTML('beforeend', `<strong>${dia}</strong>`));
    const primerDia = (new Date(ano, mes, 1).getDay() + 6) % 7;
    for (let i = 0; i < primerDia; i++) contenedor.insertAdjacentHTML('beforeend', '<span></span>');
    const hoy = fechaLocal();
    for (let dia = 1; dia <= ultimo; dia++) {
        const fecha = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const fechaObj = new Date(`${fecha}T12:00:00`);
        const esLaboral = fechaObj.getDay() !== 0 && fechaObj.getDay() !== 6;
        const asistencia = registros.find(a => a.fecha === fecha);
        let fondo = '#e9ecef'; let titulo = 'Sin información';
        if (asistencia?.tipo_asistencia === 'LICENCIA' || asistencia?.tipo_asistencia === 'JUSTIFICADO') {
            fondo = '#0d6efd'; titulo = asistencia.tipo_asistencia;
        } else if (asistencia?.hora_entrada) {
            fondo = '#198754'; titulo = `${asistencia.tipo_asistencia} | Entrada: ${horaChile(asistencia.hora_entrada)} | Salida: ${horaChile(asistencia.hora_salida)}`;
        } else if (esLaboral && fecha < hoy) {
            fondo = '#dc3545'; titulo = 'Sin asistencia. Clic para justificar';
        }
        const celda = document.createElement('button');
        celda.type = 'button'; celda.textContent = dia; celda.title = titulo;
        celda.style.cssText = `padding:9px 3px;border:0;border-radius:4px;color:${fondo === '#e9ecef' ? '#333' : '#fff'};background:${fondo};cursor:pointer`;
        if (fondo === '#dc3545' && permitirJustificacion) celda.addEventListener('click', () => abrirJustificacion(fecha));
        contenedor.appendChild(celda);
    }
}

async function renderizarCalendario() {
    await renderizarCalendarioPara({
        mesReferencia: mesCalendario,
        contenedorId: 'calendario-empleado',
        tituloId: 'titulo-mes-calendario',
        permitirJustificacion: true
    });
}

async function renderizarCalendarioRrhh() {
    await renderizarCalendarioPara({
        mesReferencia: mesCalendarioRrhh,
        contenedorId: 'calendario-rrhh',
        tituloId: 'titulo-mes-calendario-rrhh',
        usuarioId: usuarioActual.id
    });
}

async function renderizarCalendarioAdmin() {
    await renderizarCalendarioPara({
        mesReferencia: mesCalendarioAdmin,
        contenedorId: 'calendario-admin',
        tituloId: 'titulo-mes-calendario-admin',
        usuarioId: usuarioActual.id
    });
}

function horaChile(valor) {
    if (!valor) return 'Sin marcar';
    return new Date(valor).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
}

$('btn-mes-anterior')?.addEventListener('click', () => { mesCalendario.setMonth(mesCalendario.getMonth() - 1); renderizarCalendario(); });
$('btn-mes-siguiente')?.addEventListener('click', () => { mesCalendario.setMonth(mesCalendario.getMonth() + 1); renderizarCalendario(); });
$('btn-mes-anterior-rrhh')?.addEventListener('click', () => { mesCalendarioRrhh.setMonth(mesCalendarioRrhh.getMonth() - 1); renderizarCalendarioRrhh(); });
$('btn-mes-siguiente-rrhh')?.addEventListener('click', () => { mesCalendarioRrhh.setMonth(mesCalendarioRrhh.getMonth() + 1); renderizarCalendarioRrhh(); });
$('btn-mes-anterior-admin')?.addEventListener('click', () => { mesCalendarioAdmin.setMonth(mesCalendarioAdmin.getMonth() - 1); renderizarCalendarioAdmin(); });
$('btn-mes-siguiente-admin')?.addEventListener('click', () => { mesCalendarioAdmin.setMonth(mesCalendarioAdmin.getMonth() + 1); renderizarCalendarioAdmin(); });

function abrirJustificacion(fecha) {
    $('contenedor-formulario-fecha').style.display = 'block';
    $('titulo-fecha-seleccionada').textContent = `Justificar inasistencia del día: ${fecha}`;
    $('fecha-objetivo').value = fecha;
    $('fecha-hasta-solicitud').value = fecha;
}

$('btn-mostrar-licencia')?.addEventListener('click', () => $('contenedor-formulario-licencia').style.display = 'block');
$('btn-cancelar-licencia')?.addEventListener('click', () => $('contenedor-formulario-licencia').style.display = 'none');

function archivoComoDataURL(archivo) {
    if (!archivo) return Promise.resolve(null);
    if (archivo.size > 3 * 1024 * 1024) return Promise.reject(new Error('El archivo no puede superar 3 MB'));
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(new Error('No fue posible leer el archivo'));
        lector.readAsDataURL(archivo);
    });
}

async function enviarSolicitud({ tipo, desde, hasta, motivo, archivo, mensaje }) {
    try {
        mensaje.textContent = 'Enviando solicitud...';
        const base64 = await archivoComoDataURL(archivo);
        await rpc('crear_solicitud', { p_token: tokenSesion, p_tipo: tipo, p_desde: desde, p_hasta: hasta, p_motivo: motivo, p_nombre_archivo: archivo?.name || null, p_archivo_base64: base64 });
        mensaje.textContent = 'Solicitud enviada correctamente a RR. HH.';
        mensaje.style.color = '#198754';
        const global = $('mensaje-solicitud-global');
        if (global) {
            global.textContent = 'Solicitud enviada correctamente. RR. HH. podrá revisarla desde sus solicitudes pendientes.';
            global.style.display = 'block';
        }
        return true;
    } catch (error) {
        mensaje.textContent = textoError(error); mensaje.style.color = '#dc3545'; return false;
    }
}

$('formulario-licencia-medica')?.addEventListener('submit', async evento => {
    evento.preventDefault();
    const ok = await enviarSolicitud({ tipo: 'LICENCIA', desde: $('licencia-fecha-desde').value, hasta: $('licencia-fecha-hasta').value, motivo: $('licencia-motivo').value, archivo: $('licencia-archivo').files[0], mensaje: $('mensaje-licencia') });
    if (ok) { evento.target.reset(); setTimeout(() => $('contenedor-formulario-licencia').style.display = 'none', 1200); }
});

$('formulario-justificacion-calendario')?.addEventListener('submit', async evento => {
    evento.preventDefault();
    const ok = await enviarSolicitud({ tipo: $('tipo-solicitud-empleado').value, desde: $('fecha-objetivo').value, hasta: $('fecha-hasta-solicitud').value, motivo: $('motivo-falta').value, archivo: $('archivo-licencia-calendario').files[0], mensaje: $('mensaje-validacion-calendario') });
    if (ok) { evento.target.reset(); $('contenedor-formulario-fecha').style.display = 'none'; }
});

// ---------------- ADMINISTRACIÓN ----------------
const modulosAdmin = { reportes: $('modulo-reportes'), crear: $('modulo-crear'), gestionar: $('modulo-gestionar'), auditoria: $('modulo-qr'), qrPersonal: $('modulo-qr-admin'), calendarioPersonal: $('modulo-calendario-admin') };
function abrirModuloAdmin(nombre) {
    $('menu-admin-principal').style.display = 'none';
    Object.values(modulosAdmin).forEach(m => m.style.display = 'none');
    modulosAdmin[nombre].style.display = 'block';
}
$('btn-menu-reportes')?.addEventListener('click', async () => { abrirModuloAdmin('reportes'); await renderizarReportes(); });
$('btn-menu-crear')?.addEventListener('click', () => abrirModuloAdmin('crear'));
$('btn-menu-gestionar')?.addEventListener('click', async () => { abrirModuloAdmin('gestionar'); await renderizarUsuarios(); });
$('btn-menu-qr')?.addEventListener('click', async () => { abrirModuloAdmin('auditoria'); await renderizarAuditoria(); });
$('btn-menu-mi-qr-admin')?.addEventListener('click', () => abrirModuloAdmin('qrPersonal'));
$('btn-menu-mi-calendario-admin')?.addEventListener('click', async () => { abrirModuloAdmin('calendarioPersonal'); await renderizarCalendarioAdmin(); });
document.querySelectorAll('.btn-volver').forEach(boton => boton.addEventListener('click', () => { Object.values(modulosAdmin).forEach(m => m.style.display = 'none'); $('menu-admin-principal').style.display = 'grid'; }));

async function renderizarReportes() {
    if (!$('fecha-reporte').value) $('fecha-reporte').value = fechaLocal();
    rangoReporteActual = calcularRangoReporte($('periodo-reporte').value, $('fecha-reporte').value);
    $('resumen-periodo-reporte').textContent = `Período consultado: ${rangoReporteActual.desde} al ${rangoReporteActual.hasta}`;
    try {
        await Promise.all([cargarUsuarios(), cargarAsistencias(rangoReporteActual.desde, rangoReporteActual.hasta)]);
        dibujarReportes();
    } catch (error) {
        $('contenedor-reporte').textContent = textoError(error);
    }
}

function fechaIso(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
}

function calcularRangoReporte(periodo, referencia) {
    const base = new Date(`${referencia}T12:00:00`);
    let desde = new Date(base); let hasta = new Date(base);
    if (periodo === 'SEMANA') {
        const desplazamiento = (base.getDay() + 6) % 7;
        desde.setDate(base.getDate() - desplazamiento);
        hasta = new Date(desde); hasta.setDate(desde.getDate() + 6);
    } else if (periodo === 'MES') {
        desde = new Date(base.getFullYear(), base.getMonth(), 1, 12);
        hasta = new Date(base.getFullYear(), base.getMonth() + 1, 0, 12);
    }
    return { periodo, desde: fechaIso(desde), hasta: fechaIso(hasta) };
}

function minutosTrabajados(registro) {
    if (!registro.hora_entrada || !registro.hora_salida) return 0;
    return Math.max(0, Math.round((new Date(registro.hora_salida) - new Date(registro.hora_entrada)) / 60000));
}

function formatoHoras(minutos) {
    return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2,'0')} min`;
}

function usuariosReporteFiltrados() {
    const buscar = normalizarBusqueda($('buscar-reporte-empleado').value);
    return usuariosBD.filter(u => !buscar || normalizarBusqueda(`${nombreCompleto(u)} ${u.rut} ${u.correo} ${u.rol}`).includes(buscar));
}

function dibujarReportes() {
    const usuarios = usuariosReporteFiltrados();
    if (!usuarios.length) {
        $('contenedor-reporte').innerHTML = '<p class="texto-estado">No se encontraron usuarios.</p>';
        return;
    }
    const filas = usuarios.map(u => {
        const registros = asistenciasBD.filter(a => Number(a.usuario_id) === Number(u.usuario_id));
        const minutos = registros.reduce((total,a) => total + minutosTrabajados(a), 0);
        const completos = registros.filter(a => a.hora_entrada && a.hora_salida).length;
        const licencias = registros.filter(a => ['LICENCIA','JUSTIFICADO'].includes(a.tipo_asistencia)).length;
        return `<tr><td>${nombreCompleto(u)}</td><td>${u.rut}</td><td>${u.rol}</td><td>${completos}</td><td>${licencias}</td><td>${formatoHoras(minutos)}</td><td><button class="btn-detalle" onclick="descargarReporteEmpleado(${u.usuario_id})">Descargar reporte</button></td></tr>`;
    }).join('');
    $('contenedor-reporte').innerHTML = `<table><thead><tr><th>Usuario</th><th>RUT</th><th>Rol</th><th>Jornadas completas</th><th>Licencias/justificados</th><th>Horas trabajadas</th><th>Reporte</th></tr></thead><tbody>${filas}</tbody></table>`;
}

function campoCsv(valor) {
    return `"${String(valor ?? '').replaceAll('"','""')}"`;
}

window.descargarReporteEmpleado = async id => {
    const usuario = usuariosBD.find(u => Number(u.usuario_id) === Number(id));
    if (!usuario || !rangoReporteActual) return;
    const registros = asistenciasBD.filter(a => Number(a.usuario_id) === Number(id)).sort((a,b) => a.fecha.localeCompare(b.fecha));
    const minutos = registros.reduce((total,a) => total + minutosTrabajados(a), 0);
    const lineas = [
        ['REPORTE DE ASISTENCIA'],
        ['Empleado', nombreCompleto(usuario)], ['RUT', usuario.rut], ['Rol', usuario.rol],
        ['Período', `${rangoReporteActual.desde} al ${rangoReporteActual.hasta}`],
        ['Total horas trabajadas', formatoHoras(minutos)], [],
        ['Fecha','Entrada','Salida','Estado','Horas trabajadas','Observación'],
        ...registros.map(a => [a.fecha,horaChile(a.hora_entrada),horaChile(a.hora_salida),a.tipo_asistencia.replaceAll('_',' '),formatoHoras(minutosTrabajados(a)),a.observacion||''])
    ];
    if (!registros.length) lineas.push(['Sin registros en el período seleccionado']);
    const contenido = lineas.map(fila => fila.map(campoCsv).join(';')).join('\r\n');
    const nombre = `reporte_${usuario.rut.replace(/[^0-9kK]/g,'')}_${rangoReporteActual.desde}_${rangoReporteActual.hasta}.csv`;
    const resultado = await ipcRenderer.invoke('guardar-reporte-csv', { nombre, contenido });
    if (!resultado.cancelado && !resultado.ok) alert(resultado.error);
};

$('buscar-reporte-empleado')?.addEventListener('input', dibujarReportes);
$('periodo-reporte')?.addEventListener('change', renderizarReportes);
$('fecha-reporte')?.addEventListener('change', renderizarReportes);

async function renderizarAuditoria() {
    try {
        const datos = await rpc('listar_auditoria', { p_token: tokenSesion });
        const filas = datos.map(a => `<tr><td>${new Date(a.fecha_cambio).toLocaleString('es-CL')}</td><td>${a.actor}</td><td>${a.tabla}</td><td>${a.registro_id ?? '-'}</td><td>${a.accion}</td><td><details><summary>Ver cambio</summary><pre>${JSON.stringify({ antes: a.datos_anteriores, despues: a.datos_nuevos }, null, 2)}</pre></details></td></tr>`).join('');
        $('tabla-auditoria').innerHTML = `<table><thead><tr><th>Fecha</th><th>Realizado por</th><th>Tabla</th><th>Registro</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${filas}</tbody></table>`;
    } catch (error) {
        $('tabla-auditoria').textContent = textoError(error);
    }
}

const camposNombre = [$('nuevo-nombre'), $('nuevo-paterno'), $('nuevo-materno')];
function generarCredenciales() {
    const nombre = $('nuevo-nombre').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const apellido = $('nuevo-paterno').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s/g,'');
    $('nuevo-correo').value = nombre && apellido ? `${nombre[0]}.${apellido}@empresa.cl` : '';
}
camposNombre.forEach(c => c?.addEventListener('input', generarCredenciales));
$('nuevo-rut')?.addEventListener('input', evento => {
    const limpio = evento.target.value.replace(/[^0-9kK]/g,'').toUpperCase().slice(0,9);
    const cuerpo = limpio.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    evento.target.value = limpio.length > 1 ? `${cuerpo}-${limpio.slice(-1)}` : limpio;
    $('nueva-pass').value = limpio.replace(/\D/g,'').slice(0,4);
});

$('formulario-crear-usuario')?.addEventListener('submit', async evento => {
    evento.preventDefault(); const mensaje = $('mensaje-creacion');
    try {
        const correoGenerado = $('nuevo-correo').value;
        const contrasenaTemporal = $('nueva-pass').value;
        if (!correoGenerado) throw new Error('No fue posible generar el correo. Revisa el nombre y apellido paterno.');
        if (contrasenaTemporal.length !== 4) throw new Error('Ingresa un RUT válido para generar la contraseña temporal de cuatro dígitos.');
        await rpc('crear_usuario', { p_token: tokenSesion, p_nombre: $('nuevo-nombre').value, p_paterno: $('nuevo-paterno').value, p_materno: $('nuevo-materno').value, p_rut: $('nuevo-rut').value, p_telefono: `+56 9 ${$('nuevo-telefono').value}`, p_direccion: $('nueva-direccion').value, p_correo: correoGenerado, p_contrasena: contrasenaTemporal, p_entrada: $('nueva-entrada').value, p_salida: $('nueva-salida').value, p_rol: $('nuevo-rol').value });
        mensaje.innerHTML = `Usuario creado correctamente.<br>Correo: <strong>${correoGenerado}</strong><br>Contraseña temporal: <strong>${contrasenaTemporal}</strong>`;
        mensaje.style.color = '#198754';
        evento.target.reset(); $('nuevo-correo').value=''; $('nueva-pass').value='';
    } catch (error) { mensaje.textContent = textoError(error); mensaje.style.color = '#dc3545'; }
});

async function renderizarUsuarios() {
    try { await cargarUsuarios(); } catch (error) { $('tabla-usuarios').textContent = textoError(error); return; }
    dibujarTablaUsuarios();
}

function normalizarBusqueda(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function dibujarTablaUsuarios() {
    const busqueda = normalizarBusqueda($('buscar-usuario-admin')?.value);
    const usuariosFiltrados = usuariosBD.filter(u => {
        const contenido = normalizarBusqueda([
            nombreCompleto(u), u.rut, u.correo, u.telefono, u.direccion, u.rol
        ].join(' '));
        return !busqueda || contenido.includes(busqueda);
    });
    $('resultado-busqueda-usuarios').textContent = busqueda
        ? `${usuariosFiltrados.length} usuario(s) encontrado(s)`
        : `${usuariosBD.length} usuario(s) activo(s)`;
    if (!usuariosFiltrados.length) {
        $('tabla-usuarios').innerHTML = '<p class="texto-estado">No se encontraron usuarios con ese criterio.</p>';
        return;
    }
    let html = '<table><thead><tr><th>ID</th><th>Nombre</th><th>RUT</th><th>Rol</th><th>Correo</th><th>Horario</th><th>Acciones</th></tr></thead><tbody>';
    usuariosFiltrados.forEach(u => html += `<tr><td>${u.usuario_id}</td><td>${nombreCompleto(u)}</td><td>${u.rut}</td><td>${u.rol}</td><td>${u.correo}</td><td>${u.hora_entrada.slice(0,5)} - ${u.hora_salida.slice(0,5)}</td><td><button onclick="editarUsuario(${u.usuario_id})">Editar</button> <button onclick="eliminarUsuario(${u.usuario_id})">Desactivar</button></td></tr>`);
    $('tabla-usuarios').innerHTML = html + '</tbody></table>';
}
$('buscar-usuario-admin')?.addEventListener('input', dibujarTablaUsuarios);

window.editarUsuario = id => {
    const u = usuariosBD.find(x => x.usuario_id === id); if (!u) return;
    $('caja-edicion').style.display='block'; $('edit-id').value=id; $('edit-nombre').value=u.nombre; $('edit-paterno').value=u.apellido_paterno; $('edit-materno').value=u.apellido_materno; $('edit-rut').value=u.rut; $('edit-telefono').value=u.telefono; $('edit-direccion').value=u.direccion; $('edit-correo').value=u.correo; $('edit-contrasena').value=''; $('edit-rol').value=u.rol; $('edit-entrada').value=u.hora_entrada.slice(0,5); $('edit-salida').value=u.hora_salida.slice(0,5);
};
window.prepararEdicion = window.editarUsuario;
window.cancelarEdicion = () => $('caja-edicion').style.display='none';
window.guardarEdicion = async () => {
    try {
        await rpc('actualizar_usuario', { p_token:tokenSesion,p_id:Number($('edit-id').value),p_nombre:$('edit-nombre').value,p_paterno:$('edit-paterno').value,p_materno:$('edit-materno').value,p_rut:$('edit-rut').value,p_telefono:$('edit-telefono').value,p_direccion:$('edit-direccion').value,p_correo:$('edit-correo').value,p_entrada:$('edit-entrada').value,p_salida:$('edit-salida').value,p_rol:$('edit-rol').value,p_nueva_contrasena:$('edit-contrasena').value || null });
        $('caja-edicion').style.display='none'; await renderizarUsuarios(); alert('Usuario actualizado y cambio auditado.');
    } catch(error) { alert(textoError(error)); }
};
window.eliminarUsuario = async id => { if (!confirm('¿Desactivar este usuario?')) return; try { await rpc('eliminar_usuario',{p_token:tokenSesion,p_id:id}); await renderizarUsuarios(); } catch(error){ alert(textoError(error)); } };
// ---------------- RR. HH. ----------------
async function prepararRrhh() {
    solicitudSeleccionadaId=null; $('detalle-solicitud-rrhh').style.display='none'; $('mensaje-rrhh').textContent='';
    await cargarSolicitudes(); renderizarPendientes(); renderizarHistorial(); abrirModuloRrhh('alertas');
}
function filaSolicitud(s, conEstado=false) {
    return `<tr><td>${s.solicitud_id}</td><td>${s.empleado}</td><td>${s.rut}</td><td>${s.tipo_solicitud}</td><td>${s.fecha_desde} a ${s.fecha_hasta}</td>${conEstado?`<td>${s.estado}</td>`:''}<td><button onclick="verSolicitud(${s.solicitud_id})">Ver detalles</button></td></tr>`;
}
function renderizarPendientes() {
    const datos=solicitudesBD.filter(s=>s.estado==='PENDIENTE'); $('contador-pendientes').textContent=datos.length;
    $('tabla-solicitudes-rrhh').innerHTML=datos.length?`<table><thead><tr><th>ID</th><th>Empleado</th><th>RUT</th><th>Tipo</th><th>Fechas</th><th>Acción</th></tr></thead><tbody>${datos.map(s=>filaSolicitud(s)).join('')}</tbody></table>`:'<p>No hay solicitudes pendientes.</p>';
}
function solicitudesFiltradas() {
    const buscar=$('buscar-historial').value.toLowerCase(), estado=$('filtro-estado-historial').value, tipo=$('filtro-tipo-historial').value, desde=$('filtro-desde-historial').value, hasta=$('filtro-hasta-historial').value;
    return solicitudesBD.filter(s=>s.estado!=='PENDIENTE').filter(s=>(!buscar||`${s.empleado} ${s.rut}`.toLowerCase().includes(buscar))&&(estado==='TODOS'||s.estado===estado)&&(tipo==='TODOS'||s.tipo_solicitud===tipo)&&(!desde||s.fecha_revision.slice(0,10)>=desde)&&(!hasta||s.fecha_revision.slice(0,10)<=hasta));
}
function renderizarHistorial(){const datos=solicitudesFiltradas();$('historial-solicitudes-rrhh').innerHTML=datos.length?`<table><thead><tr><th>ID</th><th>Empleado</th><th>RUT</th><th>Tipo</th><th>Fechas</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>${datos.map(s=>filaSolicitud(s,true)).join('')}</tbody></table>`:'<p>No hay resultados.</p>';}
['buscar-historial','filtro-estado-historial','filtro-tipo-historial','filtro-desde-historial','filtro-hasta-historial'].forEach(id=>$(id)?.addEventListener('input',renderizarHistorial));
$('btn-limpiar-filtros')?.addEventListener('click',()=>{['buscar-historial','filtro-desde-historial','filtro-hasta-historial'].forEach(id=>$(id).value='');$('filtro-estado-historial').value='TODOS';$('filtro-tipo-historial').value='TODOS';renderizarHistorial();});
async function abrirModuloRrhh(modulo) {
    const modulos = {
        qr: $('modulo-qr-rrhh'),
        calendario: $('modulo-calendario-rrhh'),
        alertas: $('modulo-alertas-rrhh'),
        historial: $('modulo-historial-rrhh')
    };
    Object.entries(modulos).forEach(([nombre, elemento]) => {
        if (elemento) elemento.style.display = nombre === modulo ? 'block' : 'none';
    });
    document.querySelectorAll('.boton-modulo-rrhh').forEach(boton => boton.classList.remove('activo'));
    const botones = { qr: 'btn-vista-qr-rrhh', calendario: 'btn-vista-calendario-rrhh', alertas: 'btn-vista-alertas', historial: 'btn-vista-historial' };
    $(botones[modulo])?.classList.add('activo');
    $('detalle-solicitud-rrhh').style.display = 'none';
    solicitudSeleccionadaId = null;
    if (modulo === 'calendario') await renderizarCalendarioRrhh();
    if (modulo === 'historial') renderizarHistorial();
}
$('btn-vista-qr-rrhh')?.addEventListener('click',()=>abrirModuloRrhh('qr'));
$('btn-vista-calendario-rrhh')?.addEventListener('click',()=>abrirModuloRrhh('calendario'));
$('btn-vista-alertas')?.addEventListener('click',()=>abrirModuloRrhh('alertas'));
$('btn-vista-historial')?.addEventListener('click',()=>abrirModuloRrhh('historial'));

window.verSolicitud=id=>{
    const s=solicitudesBD.find(x=>x.solicitud_id===id);if(!s)return;solicitudSeleccionadaId=id;
    $('mensaje-documento-rrhh').textContent='';
    const esPropia=Number(s.usuario_id)===Number(usuarioActual.id);
    const archivo=s.archivo_base64?`<button onclick="abrirArchivoSolicitud(${id})">Abrir ${s.nombre_archivo||'documento'}</button>`:'Sin archivo';
    $('datos-detalle-solicitud').innerHTML=`<div><strong>Empleado:</strong> ${s.empleado}</div><div><strong>RUT:</strong> ${s.rut}</div><div><strong>Correo:</strong> ${s.correo}</div><div><strong>Tipo:</strong> ${s.tipo_solicitud}</div><div><strong>Período:</strong> ${s.fecha_desde} a ${s.fecha_hasta}</div><div><strong>Estado:</strong> ${s.estado}</div><div><strong>Motivo:</strong> ${s.motivo}</div><div><strong>Enviado:</strong> ${new Date(s.fecha_envio).toLocaleString('es-CL')}</div><div><strong>Documento:</strong> ${archivo}</div>${s.fecha_revision?`<div><strong>Fecha de revisión:</strong> ${new Date(s.fecha_revision).toLocaleString('es-CL')}</div>`:''}${esPropia?'<div class="detalle-completo texto-error"><strong>No puedes revisar una solicitud enviada por tu propia cuenta.</strong></div>':''}${s.revisor?`<div><strong>Revisado por:</strong> ${s.revisor}</div><div><strong>Comentario:</strong> ${s.comentario_revision||'-'}</div>`:''}`;
    $('controles-revision').style.display=s.estado==='PENDIENTE'&&!esPropia?'block':'none';
    const corrige=s.tipo_solicitud.startsWith('OLVIDO_');$('grupo-hora-corregida').style.display=corrige?'block':'none';$('hora-corregida-rrhh').required=corrige;
    $('comentario-revision-rrhh').value='';$('hora-corregida-rrhh').value='';
    const detalle=$('detalle-solicitud-rrhh');
    detalle.style.display='block';
    detalle.classList.remove('detalle-destacado');
    void detalle.offsetWidth;
    detalle.classList.add('detalle-destacado');
    setTimeout(()=>detalle.scrollIntoView({behavior:'smooth',block:'start'}),50);
};
window.abrirArchivoSolicitud=async id=>{
    const s=solicitudesBD.find(x=>x.solicitud_id===id);
    const mensaje=$('mensaje-documento-rrhh');
    if(!s?.archivo_base64){
        mensaje.textContent='La solicitud no tiene un documento adjunto.';
        mensaje.style.color='#dc3545';
        return;
    }
    mensaje.textContent='Abriendo documento...';
    mensaje.style.color='#666';
    try {
        const resultado=await ipcRenderer.invoke('abrir-documento-solicitud',{
            datos:s.archivo_base64,
            nombre:s.nombre_archivo||'documento.pdf'
        });
        mensaje.textContent=resultado.ok?'Documento abierto en el visor predeterminado.':resultado.error;
        mensaje.style.color=resultado.ok?'#198754':'#dc3545';
    } catch(error) {
        mensaje.textContent=textoError(error);
        mensaje.style.color='#dc3545';
    }
};
$('btn-cerrar-detalle')?.addEventListener('click',()=>{$('detalle-solicitud-rrhh').style.display='none';solicitudSeleccionadaId=null;});
async function revisar(decision){const s=solicitudesBD.find(x=>x.solicitud_id===solicitudSeleccionadaId);if(!s)return;const hora=$('hora-corregida-rrhh').value;if(s.tipo_solicitud.startsWith('OLVIDO_')&&decision==='APROBADA'&&!hora){$('mensaje-rrhh').textContent='Debes indicar la hora confirmada.';return;}try{await rpc('revisar_solicitud',{p_token:tokenSesion,p_solicitud_id:s.solicitud_id,p_decision:decision,p_comentario:$('comentario-revision-rrhh').value,p_hora_corregida:hora||null});$('mensaje-rrhh').textContent=`Solicitud ${decision.toLowerCase()} correctamente.`;$('detalle-solicitud-rrhh').style.display='none';await prepararRrhh();}catch(error){$('mensaje-rrhh').textContent=textoError(error);}}
$('btn-aprobar-solicitud')?.addEventListener('click',()=>revisar('APROBADA'));
$('btn-rechazar-solicitud')?.addEventListener('click',()=>revisar('RECHAZADA'));

// Si se recargó la ventana, se recupera la sesión local mientras siga vigente en la BD.
window.addEventListener('DOMContentLoaded', async () => {
    if (!configurado) $('mensaje-error').textContent='Configura Supabase en src/config.js antes de iniciar.';
    const guardado=sessionStorage.getItem('usuarioActual');
    if(tokenSesion&&guardado){try{await entrarPanel(JSON.parse(guardado));}catch(_){sessionStorage.clear();tokenSesion=null;}}
});
