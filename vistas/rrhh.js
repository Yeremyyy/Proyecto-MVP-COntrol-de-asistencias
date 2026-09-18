let solicitudSeleccionadaId = null;

// El detalle se ubica fuera de ambos módulos para reutilizarlo desde alertas e historial.
const detalleCompartido = document.getElementById('detalle-solicitud-rrhh');
const moduloHistorial = document.getElementById('modulo-historial-rrhh');
moduloHistorial.insertAdjacentElement('afterend', detalleCompartido);

function formatearFechaHora(valor) {
    if (!valor) return '—';
    return new Date(valor).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function obtenerUsuario(id) {
    return usuariosBD.find(usuario => usuario.id === id);
}

function reiniciarVistaRrhh() {
    solicitudSeleccionadaId = null;
    document.getElementById('detalle-solicitud-rrhh').style.display = 'none';
    document.getElementById('mensaje-rrhh').textContent = '';
    document.getElementById('comentario-revision-rrhh').value = '';
    document.getElementById('hora-corregida-rrhh').value = '';
}

function prepararVistaRrhh() {
    reiniciarVistaRrhh();
    mostrarModuloRrhh('alertas');
    renderizarSolicitudesRrhh();
}

function mostrarModuloRrhh(modulo) {
    const alertas = modulo === 'alertas';
    document.getElementById('modulo-alertas-rrhh').style.display = alertas ? 'block' : 'none';
    document.getElementById('modulo-historial-rrhh').style.display = alertas ? 'none' : 'block';
    document.getElementById('btn-vista-alertas').classList.toggle('activo', alertas);
    document.getElementById('btn-vista-historial').classList.toggle('activo', !alertas);
    document.getElementById('detalle-solicitud-rrhh').style.display = 'none';
    document.getElementById('mensaje-rrhh').textContent = '';
    if (!alertas) renderizarHistorialRrhh();
}

function asignarDiasDeLicencia(solicitud) {
    const diasAsignados = [];
    const cursor = new Date(`${solicitud.fecha_desde}T12:00:00`);
    const final = new Date(`${solicitud.fecha_hasta}T12:00:00`);

    while (cursor <= final) {
        const diaSemana = cursor.getDay();
        const fecha = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        if (diaSemana !== 0 && diaSemana !== 6) {
            const existe = licenciasAprobadasBD.some(item =>
                item.usuario_id === solicitud.usuario_id && item.fecha === fecha
            );
            if (!existe) {
                licenciasAprobadasBD.push({
                    usuario_id: solicitud.usuario_id,
                    fecha,
                    tipo_asistencia: 'LICENCIA',
                    solicitud_id: solicitud.id
                });
                diasAsignados.push(fecha);
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return diasAsignados;
}

function renderizarSolicitudesRrhh() {
    const contenedor = document.getElementById('tabla-solicitudes-rrhh');
    const pendientes = solicitudesBD
        .filter(solicitud => solicitud.estado === 'PENDIENTE')
        .sort((a, b) => new Date(b.fecha_envio) - new Date(a.fecha_envio));
    document.getElementById('contador-pendientes').textContent = pendientes.length;

    if (!pendientes.length) {
        contenedor.innerHTML = '<p class="texto-estado">No existen alertas pendientes.</p>';
        renderizarHistorialRrhh();
        return;
    }

    let html = '<table><thead><tr><th>N.º</th><th>Empleado</th><th>Tipo</th><th>Periodo</th><th>Enviada</th><th>Acción</th></tr></thead><tbody>';
    pendientes.forEach(solicitud => {
        const empleado = obtenerUsuario(solicitud.usuario_id);
        html += `<tr>
            <td>${solicitud.id}</td>
            <td>${empleado ? empleado.nombre_completo : 'Usuario desconocido'}</td>
            <td>${solicitud.tipo_solicitud}</td>
            <td>${solicitud.fecha_desde}${solicitud.fecha_hasta !== solicitud.fecha_desde ? ` al ${solicitud.fecha_hasta}` : ''}</td>
            <td>${formatearFechaHora(solicitud.fecha_envio)}</td>
            <td><button class="btn-detalle" onclick="abrirDetalleSolicitud(${solicitud.id})">Revisar</button></td>
        </tr>`;
    });
    contenedor.innerHTML = `${html}</tbody></table>`;
    renderizarHistorialRrhh();
}

window.abrirDetalleSolicitud = function(id) {
    const solicitud = solicitudesBD.find(item => item.id === id);
    if (!solicitud) return;
    solicitudSeleccionadaId = id;
    document.getElementById('mensaje-rrhh').textContent = '';

    const empleado = obtenerUsuario(solicitud.usuario_id);
    const revisor = obtenerUsuario(solicitud.revisado_por);
    const documento = solicitud.archivo_datos
        ? `<button class="btn-documento" onclick="abrirDocumentoSolicitud(${solicitud.id})">Abrir ${solicitud.nombre_archivo}</button>`
        : (solicitud.nombre_archivo
            ? `${solicitud.nombre_archivo} (contenido no disponible en el dato de ejemplo)`
            : 'No adjuntó documento');

    document.getElementById('datos-detalle-solicitud').innerHTML = `
        <div><strong>Solicitud:</strong> N.º ${solicitud.id}</div>
        <div><strong>Empleado:</strong> ${empleado ? empleado.nombre_completo : 'Desconocido'}</div>
        <div><strong>RUT:</strong> ${empleado ? empleado.rut : '—'}</div>
        <div><strong>Correo:</strong> ${empleado ? empleado.correo : '—'}</div>
        <div><strong>Tipo:</strong> ${solicitud.tipo_solicitud}</div>
        <div><strong>Periodo:</strong> ${solicitud.fecha_desde} al ${solicitud.fecha_hasta}</div>
        <div><strong>Fecha de envío:</strong> ${formatearFechaHora(solicitud.fecha_envio)}</div>
        <div class="detalle-completo"><strong>Motivo:</strong> ${solicitud.motivo}</div>
        <div class="detalle-completo"><strong>Documento:</strong> ${documento}</div>
        <div><strong>Estado:</strong> ${solicitud.estado}</div>
        <div><strong>Revisado por:</strong> ${revisor ? revisor.nombre_completo : 'Pendiente'}</div>
        <div><strong>Fecha de revisión:</strong> ${formatearFechaHora(solicitud.fecha_revision)}</div>
        <div><strong>Hora confirmada:</strong> ${solicitud.hora_corregida || '—'}</div>
        <div class="detalle-completo"><strong>Comentario de RR. HH.:</strong> ${solicitud.comentario_revision || '—'}</div>`;

    const esOlvido = ['OLVIDO_ENTRADA', 'OLVIDO_SALIDA'].includes(solicitud.tipo_solicitud);
    document.getElementById('label-hora-corregida').textContent = solicitud.tipo_solicitud === 'OLVIDO_ENTRADA'
        ? 'Hora de entrada confirmada por RR. HH.'
        : 'Hora de salida confirmada por RR. HH.';
    document.getElementById('grupo-hora-corregida').style.display = esOlvido ? 'block' : 'none';
    document.getElementById('hora-corregida-rrhh').value = solicitud.hora_corregida || '';
    document.getElementById('comentario-revision-rrhh').value = solicitud.comentario_revision || '';
    document.getElementById('controles-revision').style.display = solicitud.estado === 'PENDIENTE' ? 'block' : 'none';
    document.getElementById('detalle-solicitud-rrhh').style.display = 'block';
}

window.abrirDocumentoSolicitud = function(id) {
    const solicitud = solicitudesBD.find(item => item.id === id);
    if (!solicitud || !solicitud.archivo_datos) return;
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(`<!doctype html><html><head><title>${solicitud.nombre_archivo}</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${solicitud.archivo_datos}"></iframe></body></html>`);
    ventana.document.close();
}

function resolverSolicitud(nuevoEstado) {
    const solicitud = solicitudesBD.find(item => item.id === solicitudSeleccionadaId);
    if (!solicitud || solicitud.estado !== 'PENDIENTE') return;

    const comentario = document.getElementById('comentario-revision-rrhh').value.trim();
    const horaConfirmada = document.getElementById('hora-corregida-rrhh').value;
    const esOlvido = ['OLVIDO_ENTRADA', 'OLVIDO_SALIDA'].includes(solicitud.tipo_solicitud);
    const mensaje = document.getElementById('mensaje-rrhh');

    if (!comentario) {
        mensaje.textContent = 'Debes escribir un comentario de revisión.';
        mensaje.style.color = '#dc3545';
        return;
    }
    if (nuevoEstado === 'APROBADA' && esOlvido && !horaConfirmada) {
        mensaje.textContent = solicitud.tipo_solicitud === 'OLVIDO_ENTRADA'
            ? 'Debes indicar la hora de entrada confirmada.'
            : 'Debes indicar la hora de salida confirmada.';
        mensaje.style.color = '#dc3545';
        return;
    }

    const estadoAnterior = solicitud.estado;
    solicitud.estado = nuevoEstado;
    solicitud.revisado_por = usuarioActual.id;
    solicitud.comentario_revision = comentario;
    solicitud.fecha_revision = new Date().toISOString();
    solicitud.hora_corregida = esOlvido && nuevoEstado === 'APROBADA' ? horaConfirmada : null;
    const diasLicencia = nuevoEstado === 'APROBADA' && solicitud.tipo_solicitud === 'LICENCIA'
        ? asignarDiasDeLicencia(solicitud)
        : [];

    historialSolicitudesBD.push({
        historial_id: Date.now(),
        solicitud_id: solicitud.id,
        accion: nuevoEstado === 'APROBADA' ? 'APROBAR' : 'RECHAZAR',
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        realizado_por: usuarioActual.id,
        fecha_cambio: solicitud.fecha_revision,
        comentario,
        dias_afectados: diasLicencia
    });
    guardarSolicitudesLocales();
    document.getElementById('detalle-solicitud-rrhh').style.display = 'none';
    mensaje.textContent = diasLicencia.length
        ? `Licencia aprobada. Se asignaron ${diasLicencia.length} días laborales.`
        : `Solicitud ${nuevoEstado.toLowerCase()} correctamente.`;
    mensaje.style.color = nuevoEstado === 'APROBADA' ? '#198754' : '#dc3545';
    renderizarSolicitudesRrhh();
}

function renderizarHistorialRrhh() {
    const contenedor = document.getElementById('historial-solicitudes-rrhh');
    const busqueda = document.getElementById('buscar-historial').value.trim().toLowerCase();
    const estado = document.getElementById('filtro-estado-historial').value;
    const tipo = document.getElementById('filtro-tipo-historial').value;
    const desde = document.getElementById('filtro-desde-historial').value;
    const hasta = document.getElementById('filtro-hasta-historial').value;

    const revisadas = solicitudesBD
        .filter(solicitud => {
            if (solicitud.estado === 'PENDIENTE') return false;
            const empleado = obtenerUsuario(solicitud.usuario_id);
            const textoEmpleado = empleado
                ? `${empleado.nombre_completo} ${empleado.rut}`.toLowerCase()
                : '';
            const fechaRevision = solicitud.fecha_revision ? solicitud.fecha_revision.slice(0, 10) : '';
            return (!busqueda || textoEmpleado.includes(busqueda)) &&
                (estado === 'TODOS' || solicitud.estado === estado) &&
                (tipo === 'TODOS' || solicitud.tipo_solicitud === tipo) &&
                (!desde || fechaRevision >= desde) &&
                (!hasta || fechaRevision <= hasta);
        })
        .sort((a, b) => new Date(b.fecha_revision) - new Date(a.fecha_revision));

    if (!revisadas.length) {
        contenedor.innerHTML = '<p class="texto-estado">Todavía no hay decisiones registradas.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Solicitud</th><th>RUT</th><th>Empleado</th><th>Tipo</th><th>Decisión</th><th>Revisada por</th><th>Fecha</th><th>Detalle</th></tr></thead><tbody>';
    revisadas.forEach(solicitud => {
        const revisor = obtenerUsuario(solicitud.revisado_por);
        const empleado = obtenerUsuario(solicitud.usuario_id);
        html += `<tr>
            <td>N.º ${solicitud.id}</td>
            <td>${empleado ? empleado.rut : '—'}</td>
            <td>${empleado ? empleado.nombre_completo : 'Desconocido'}</td>
            <td>${solicitud.tipo_solicitud}</td>
            <td><span class="estado estado-${solicitud.estado.toLowerCase()}">${solicitud.estado}</span></td>
            <td>${revisor ? revisor.nombre_completo : 'Desconocido'}</td>
            <td>${formatearFechaHora(solicitud.fecha_revision)}</td>
            <td><button class="btn-detalle" onclick="abrirDetalleSolicitud(${solicitud.id})">Ver detalles</button></td>
        </tr>`;
    });
    contenedor.innerHTML = `${html}</tbody></table>`;
}

document.getElementById('btn-cerrar-detalle').addEventListener('click', () => {
    document.getElementById('detalle-solicitud-rrhh').style.display = 'none';
});
document.getElementById('btn-aprobar-solicitud').addEventListener('click', () => resolverSolicitud('APROBADA'));
document.getElementById('btn-rechazar-solicitud').addEventListener('click', () => resolverSolicitud('RECHAZADA'));
document.getElementById('btn-vista-alertas').addEventListener('click', () => mostrarModuloRrhh('alertas'));
document.getElementById('btn-vista-historial').addEventListener('click', () => mostrarModuloRrhh('historial'));
['buscar-historial', 'filtro-estado-historial', 'filtro-tipo-historial', 'filtro-desde-historial', 'filtro-hasta-historial']
    .forEach(id => document.getElementById(id).addEventListener('input', renderizarHistorialRrhh));
document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
    document.getElementById('buscar-historial').value = '';
    document.getElementById('filtro-estado-historial').value = 'TODOS';
    document.getElementById('filtro-tipo-historial').value = 'TODOS';
    document.getElementById('filtro-desde-historial').value = '';
    document.getElementById('filtro-hasta-historial').value = '';
    renderizarHistorialRrhh();
});
