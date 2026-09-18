let fechaSeleccionada = null;
const fechaActualCalendario = new Date();
let mesCalendario = fechaActualCalendario.getMonth();
let anioCalendario = fechaActualCalendario.getFullYear();

function fechaLocalTexto(fecha) {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

function archivoADataURL(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(new Error('No fue posible leer el archivo.'));
        lector.readAsDataURL(archivo);
    });
}

function validarTamanoDocumento(archivo, mensaje) {
    const maximo = 3 * 1024 * 1024;
    if (archivo.size > maximo) {
        mensaje.textContent = 'Para esta prueba local el archivo no puede superar 3 MB.';
        mensaje.style.color = '#dc3545';
        return false;
    }
    return true;
}

function renderizarCalendarioEmpleado() {
    const contenedor = document.getElementById('calendario-empleado');
    if (!contenedor || !usuarioActual) return;
    contenedor.innerHTML = '';

    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('titulo-mes-calendario').textContent = `${nombresMeses[mesCalendario]} ${anioCalendario}`;

    ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].forEach(nombre => {
        const cabecera = document.createElement('div');
        cabecera.textContent = nombre;
        cabecera.style.fontWeight = 'bold';
        cabecera.style.fontSize = '0.75rem';
        cabecera.style.color = '#555';
        contenedor.appendChild(cabecera);
    });

    const primerDia = new Date(anioCalendario, mesCalendario, 1);
    const desplazamiento = (primerDia.getDay() + 6) % 7;
    for (let i = 0; i < desplazamiento; i++) {
        contenedor.appendChild(document.createElement('div'));
    }

    const totalDias = new Date(anioCalendario, mesCalendario + 1, 0).getDate();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let dia = 1; dia <= totalDias; dia++) {
        const fecha = new Date(anioCalendario, mesCalendario, dia);
        const fechaStr = fechaLocalTexto(fecha);
        const diaSemana = fecha.getDay();
        const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

        const celda = document.createElement('div');
        celda.textContent = dia;
        celda.style.padding = '10px 0';
        celda.style.fontSize = '0.85rem';
        celda.style.textAlign = 'center';
        celda.style.border = '1px solid #e0e0e0';
        celda.style.transition = 'transform .1s ease, background-color .2s';

        const licencia = licenciasAprobadasBD.find(item =>
            item.usuario_id === usuarioActual.id && item.fecha === fechaStr
        );
        const asistencia = registrosAsistencia.find(registro => {
            const fechaRegistro = fechaLocalTexto(registro.timestamp);
            return registro.usuario_id === usuarioActual.id &&
                fechaRegistro === fechaStr && registro.tipo_accion === 'ENTRADA';
        });

        if (licencia) {
            celda.style.backgroundColor = '#cfe2ff';
            celda.style.color = '#084298';
            celda.style.fontWeight = 'bold';
            celda.title = `Licencia aprobada (Solicitud N.º ${licencia.solicitud_id})`;
        } else if (asistencia) {
            celda.style.backgroundColor = '#d1e7dd';
            celda.style.color = '#0f5132';
            celda.title = 'Asistencia registrada';
        } else if (esFinDeSemana) {
            celda.style.backgroundColor = '#eeeeee';
            celda.style.color = '#999';
            celda.title = 'Fin de semana';
        } else if (fecha < hoy) {
            celda.style.backgroundColor = '#f8d7da';
            celda.style.color = '#842029';
            celda.style.cursor = 'pointer';
            celda.title = 'Inasistencia - Clic para justificar';
            celda.addEventListener('click', () => abrirFormularioJustificacion(fechaStr, celda));
        } else {
            celda.style.backgroundColor = '#f8f9fa';
            celda.style.color = '#6c757d';
            celda.title = 'Sin información';
        }
        contenedor.appendChild(celda);
    }
}

function abrirFormularioJustificacion(fechaStr, celda) {
    celda.style.transform = 'scale(.9)';
    setTimeout(() => celda.style.transform = 'scale(1)', 100);
    const formulario = document.getElementById('contenedor-formulario-fecha');

    if (fechaSeleccionada === fechaStr && formulario.style.display === 'block') {
        ocultarFormulario();
        return;
    }
    fechaSeleccionada = fechaStr;
    formulario.style.display = 'block';
    formulario.style.opacity = '1';
    document.getElementById('titulo-fecha-seleccionada').textContent = `Justificar inasistencia del día: ${fechaStr}`;
    document.getElementById('fecha-objetivo').value = fechaStr;
    document.getElementById('fecha-hasta-solicitud').value = fechaStr;
    document.getElementById('solicitud-empleado-auto').textContent = usuarioActual.nombre_completo;
    document.getElementById('solicitud-correo-auto').textContent = usuarioActual.correo;
}

function ocultarFormulario() {
    const formulario = document.getElementById('contenedor-formulario-fecha');
    formulario.style.display = 'none';
    fechaSeleccionada = null;
}

document.getElementById('btn-mes-anterior').addEventListener('click', () => {
    mesCalendario--;
    if (mesCalendario < 0) { mesCalendario = 11; anioCalendario--; }
    renderizarCalendarioEmpleado();
});

document.getElementById('btn-mes-siguiente').addEventListener('click', () => {
    mesCalendario++;
    if (mesCalendario > 11) { mesCalendario = 0; anioCalendario++; }
    renderizarCalendarioEmpleado();
});

document.getElementById('btn-mostrar-licencia').addEventListener('click', () => {
    const contenedor = document.getElementById('contenedor-formulario-licencia');
    contenedor.style.display = contenedor.style.display === 'none' ? 'block' : 'none';
    document.getElementById('licencia-empleado-auto').textContent = usuarioActual.nombre_completo;
    document.getElementById('licencia-correo-auto').textContent = usuarioActual.correo;
    const hoyTexto = fechaLocalTexto(new Date());
    document.getElementById('licencia-fecha-desde').value ||= hoyTexto;
    document.getElementById('licencia-fecha-hasta').value ||= hoyTexto;
});

document.getElementById('btn-cancelar-licencia').addEventListener('click', () => {
    document.getElementById('formulario-licencia-medica').reset();
    document.getElementById('contenedor-formulario-licencia').style.display = 'none';
    document.getElementById('mensaje-licencia').textContent = '';
});

document.getElementById('formulario-licencia-medica').addEventListener('submit', async evento => {
    evento.preventDefault();
    const desde = document.getElementById('licencia-fecha-desde').value;
    const hasta = document.getElementById('licencia-fecha-hasta').value;
    const motivo = document.getElementById('licencia-motivo').value.trim();
    const archivo = document.getElementById('licencia-archivo').files[0];
    const mensaje = document.getElementById('mensaje-licencia');

    if (hasta < desde) {
        mensaje.textContent = 'La fecha final no puede ser anterior a la fecha inicial.';
        mensaje.style.color = '#dc3545';
        return;
    }
    if (!validarTamanoDocumento(archivo, mensaje)) return;

    let archivoDatos;
    try {
        archivoDatos = await archivoADataURL(archivo);
    } catch (error) {
        mensaje.textContent = error.message;
        mensaje.style.color = '#dc3545';
        return;
    }

    const nuevoId = solicitudesBD.length ? Math.max(...solicitudesBD.map(item => item.id)) + 1 : 1;
    solicitudesBD.push({
        id: nuevoId,
        usuario_id: usuarioActual.id,
        tipo_solicitud: 'LICENCIA',
        fecha_desde: desde,
        fecha_hasta: hasta,
        motivo,
        nombre_archivo: archivo.name,
        archivo_url: null,
        archivo_datos: archivoDatos,
        archivo_tipo: archivo.type,
        estado: 'PENDIENTE',
        fecha_envio: new Date().toISOString(),
        revisado_por: null,
        comentario_revision: null,
        fecha_revision: null,
        hora_corregida: null
    });
    guardarSolicitudesLocales();
    mensaje.textContent = `Licencia N.º ${nuevoId} enviada a RR. HH. para revisión.`;
    mensaje.style.color = '#198754';
    evento.target.reset();
    setTimeout(() => {
        document.getElementById('contenedor-formulario-licencia').style.display = 'none';
        mensaje.textContent = '';
    }, 3000);
});

const formularioJustificacion = document.getElementById('formulario-justificacion-calendario');
formularioJustificacion.addEventListener('submit', async evento => {
    evento.preventDefault();
    const archivoInput = document.getElementById('archivo-licencia-calendario');
    const fechaDesde = document.getElementById('fecha-objetivo').value;
    const fechaHasta = document.getElementById('fecha-hasta-solicitud').value;
    const tipo = document.getElementById('tipo-solicitud-empleado').value;
    const motivo = document.getElementById('motivo-falta').value.trim();
    const mensaje = document.getElementById('mensaje-validacion-calendario');

    if (fechaHasta < fechaDesde) {
        mensaje.textContent = 'La fecha final no puede ser anterior a la inicial.';
        mensaje.style.color = '#dc3545';
        return;
    }
    if (tipo === 'CERTIFICADO' && archivoInput.files.length === 0) {
        mensaje.textContent = 'Debes adjuntar el certificado.';
        mensaje.style.color = '#dc3545';
        return;
    }

    const archivo = archivoInput.files[0] || null;
    if (archivo && !validarTamanoDocumento(archivo, mensaje)) return;

    let archivoDatos = null;
    if (archivo) {
        try {
            archivoDatos = await archivoADataURL(archivo);
        } catch (error) {
            mensaje.textContent = error.message;
            mensaje.style.color = '#dc3545';
            return;
        }
    }

    const nuevoId = solicitudesBD.length ? Math.max(...solicitudesBD.map(item => item.id)) + 1 : 1;
    solicitudesBD.push({
        id: nuevoId,
        usuario_id: usuarioActual.id,
        tipo_solicitud: tipo,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        motivo,
        nombre_archivo: archivo ? archivo.name : null,
        archivo_url: null,
        archivo_datos: archivoDatos,
        archivo_tipo: archivo ? archivo.type : null,
        estado: 'PENDIENTE',
        fecha_envio: new Date().toISOString(),
        revisado_por: null,
        comentario_revision: null,
        fecha_revision: null,
        hora_corregida: null
    });
    guardarSolicitudesLocales();
    mensaje.textContent = `Solicitud N.º ${nuevoId} enviada a RR. HH.`;
    mensaje.style.color = '#198754';
    setTimeout(() => {
        formularioJustificacion.reset();
        ocultarFormulario();
        mensaje.textContent = '';
    }, 3000);
});
