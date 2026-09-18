// 1. BASE DE DATOS SIMULADA (MOCK) USANDO CLASES (POO)
const usuariosBD = [
    new Administrador(1, 'Jordan', 'Muñoz', 'Rojas', '11.111.111-1', '+56 9 11111111', 'Av. Central 100', 'jordan@empresa.cl', '123', '08:00', '17:00'),
    new Empleado(2, 'Rafa', 'Pérez', 'González', '12.345.678-5', '+56 9 22222222', 'Pasaje Norte 245', 'rafa@empresa.cl', '123', '08:00', '17:50'),
    new Empleado(3, 'Pato', 'Soto', 'Vargas', '15.678.901-2', '+56 9 33333333', 'Calle Sur 860', 'pato@empresa.cl', '123', '08:00', '17:00'),
    new RecursosHumanos(4, 'Camila', 'Rojas', 'Díaz', '17.654.321-0', '+56 9 44444444', 'Av. Costanera 450', 'rrhh@empresa.cl', '123', '08:30', '17:30')
];

// Datos iniciales para probar solicitudes antes de conectar Supabase.
const solicitudesIniciales = [
    {
        id: 1,
        usuario_id: 2,
        tipo_solicitud: 'CERTIFICADO',
        fecha_desde: '2026-09-10',
        fecha_hasta: '2026-09-10',
        motivo: 'Reposo médico',
        nombre_archivo: 'certificado_rafa.pdf',
        archivo_url: null,
        estado: 'PENDIENTE',
        fecha_envio: '2026-09-10T13:30:00.000Z',
        revisado_por: null,
        comentario_revision: null,
        fecha_revision: null,
        hora_corregida: null
    },
    {
        id: 2,
        usuario_id: 3,
        tipo_solicitud: 'OLVIDO_SALIDA',
        fecha_desde: '2026-09-11',
        fecha_hasta: '2026-09-11',
        motivo: 'Olvidé registrar mi salida',
        nombre_archivo: null,
        archivo_url: null,
        estado: 'PENDIENTE',
        fecha_envio: '2026-09-11T21:15:00.000Z',
        revisado_por: null,
        comentario_revision: null,
        fecha_revision: null,
        hora_corregida: null
    }
];

function cargarDatosLocales(clave, valorInicial) {
    try {
        const guardado = localStorage.getItem(clave);
        return guardado ? JSON.parse(guardado) : JSON.parse(JSON.stringify(valorInicial));
    } catch (error) {
        console.error(`No fue posible cargar ${clave}:`, error);
        return JSON.parse(JSON.stringify(valorInicial));
    }
}

let solicitudesBD = cargarDatosLocales('solicitudesBD', solicitudesIniciales);
let historialSolicitudesBD = cargarDatosLocales('historialSolicitudesBD', []);
let licenciasAprobadasBD = cargarDatosLocales('licenciasAprobadasBD', []);

// Compatibilidad con solicitudes creadas por la versión anterior del prototipo.
solicitudesBD = solicitudesBD.map(solicitud => ({
    ...solicitud,
    tipo_solicitud: solicitud.tipo_solicitud || solicitud.tipo,
    nombre_archivo: solicitud.nombre_archivo ?? solicitud.archivo ?? null,
    archivo_url: solicitud.archivo_url ?? null,
    fecha_envio: solicitud.fecha_envio || new Date().toISOString(),
    comentario_revision: solicitud.comentario_revision ?? null,
    fecha_revision: solicitud.fecha_revision ?? null,
    hora_corregida: solicitud.hora_corregida ?? null
}));

function guardarSolicitudesLocales() {
    localStorage.setItem('solicitudesBD', JSON.stringify(solicitudesBD));
    localStorage.setItem('historialSolicitudesBD', JSON.stringify(historialSolicitudesBD));
    localStorage.setItem('licenciasAprobadasBD', JSON.stringify(licenciasAprobadasBD));
}

// Array simulando la BD de registros usando la clase RegistroAsistencia
const hoy = new Date();
const registrosAsistencia = [
    new RegistroAsistencia(2, 'ENTRADA', new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 7, 50, 0)), 
    new RegistroAsistencia(3, 'ENTRADA', new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 8, 25, 0)),
    new RegistroAsistencia(2, 'SALIDA', new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 18, 5, 0)), 
    new RegistroAsistencia(3, 'SALIDA', new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 14, 0, 0)) 
];

let usuarioActual = null;
let intervaloReloj = null;

const vistaLogin = document.getElementById('vista-login');
const vistaPanel = document.getElementById('vista-panel');
const vistaAdmin = document.getElementById('vista-admin'); 
const vistaRrhh = document.getElementById('vista-rrhh');
const formularioLogin = document.getElementById('formulario-login');
const errorTexto = document.getElementById('mensaje-error');
const nombreUsuarioSpan = document.getElementById('nombre-usuario');
const nombreAdminSpan = document.getElementById('nombre-admin'); 
const nombreRrhhSpan = document.getElementById('nombre-rrhh');
const relojTexto = document.getElementById('reloj-actual');

// LÓGICA DE LOGIN Y RUTEO 
formularioLogin.addEventListener('submit', (evento) => {
    evento.preventDefault(); 
    
    const correoIngresado = document.getElementById('correo').value.trim();
    const passIngresada = document.getElementById('contrasena').value.trim();

    if (!correoIngresado || !passIngresada) {
        errorTexto.textContent = 'Por favor, complete todos los campos.';
        return; 
    }

    const usuarioEncontrado = usuariosBD.find(u => u.correo === correoIngresado && u.contrasena === passIngresada);

    if (usuarioEncontrado) {
        usuarioActual = usuarioEncontrado;
        errorTexto.textContent = '';
        formularioLogin.reset();
        vistaLogin.classList.remove('activa');
        
        if (usuarioActual.rol === 'admin') {
            nombreAdminSpan.textContent = usuarioActual.nombre_completo;
            vistaAdmin.classList.add('activa'); 
        } else if (usuarioActual.rol === 'rrhh') {
            nombreRrhhSpan.textContent = usuarioActual.nombre_completo;
            vistaRrhh.classList.add('activa');
            prepararVistaRrhh();
        } else {
            nombreUsuarioSpan.textContent = usuarioActual.nombre_completo;
            vistaPanel.classList.add('activa'); 
            iniciarReloj();
            renderizarCalendarioEmpleado();
        }
    } else {
        errorTexto.textContent = 'Credenciales incorrectas o usuario no existe.';
    }
});


// UTILIDADES 
function iniciarReloj() {
    relojTexto.textContent = new Date().toLocaleTimeString('es-CL');
    intervaloReloj = setInterval(() => {
        relojTexto.textContent = new Date().toLocaleTimeString('es-CL');
    }, 1000);
}

document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    usuarioActual = null;
    // Eliminamos la línea textoEstado.textContent = ''; porque ya no existe ese elemento
    clearInterval(intervaloReloj);
    
    // Ocultar el formulario del calendario por si quedó abierto
    const formCalendario = document.getElementById('contenedor-formulario-fecha');
    if (formCalendario) formCalendario.style.display = 'none';
    const formLicencia = document.getElementById('contenedor-formulario-licencia');
    if (formLicencia) formLicencia.style.display = 'none';

    vistaPanel.classList.remove('activa');
    vistaLogin.classList.add('activa');
});

document.getElementById('btn-cerrar-sesion-admin').addEventListener('click', () => {
    usuarioActual = null;
    document.getElementById('contenedor-reporte').innerHTML = ''; 
    vistaAdmin.classList.remove('activa');
    vistaLogin.classList.add('activa');
});

document.getElementById('btn-cerrar-sesion-rrhh').addEventListener('click', () => {
    reiniciarVistaRrhh();
    usuarioActual = null;
    vistaRrhh.classList.remove('activa');
    vistaLogin.classList.add('activa');
});

//LÓGICA DEL ADMINISTRADOR (Reporte Integral)
document.getElementById('btn-generar-reporte')?.addEventListener('click', () => {
    const contenedor = document.getElementById('contenedor-reporte');
    
    if (registrosAsistencia.length === 0) {
        contenedor.innerHTML = '<p class="texto-estado" style="text-align: left;">No hay registros procesables hoy.</p>';
        return; 
    }

    let htmlTabla = `
        <table>
            <thead>
                <tr>
                    <th>Empleado</th>
                    <th>Tipo</th>
                    <th>Hora</th>
                    <th>Estado</th>
                    <th>Diferencia</th>
                </tr>
            </thead>
            <tbody>
    `;

    registrosAsistencia.forEach(registro => {
        const empleado = usuariosBD.find(u => u.id === registro.usuario_id);
        if (!empleado || !empleado.hora_entrada || !empleado.hora_salida) return; 

        const horaReal = registro.timestamp.getHours();
        const minReal = registro.timestamp.getMinutes();
        const minutosReales = (horaReal * 60) + minReal;

        let estadoTexto = 'A TIEMPO';
        let claseEstado = 'atraso-no';
        let minutosDiferencia = 0;

        if (registro.tipo_accion === 'ENTRADA') {
            const [horaEsp, minEsp] = empleado.hora_entrada.split(':').map(Number);
            const minutosEsperados = (horaEsp * 60) + minEsp;
            const diferencia = minutosReales - minutosEsperados;
            
            if (diferencia > 0) {
                minutosDiferencia = diferencia;
                estadoTexto = 'ATRASADO';
                claseEstado = 'atraso-si';
            }
        } else if (registro.tipo_accion === 'SALIDA') {
            const [horaEsp, minEsp] = empleado.hora_salida.split(':').map(Number);
            const minutosEsperados = (horaEsp * 60) + minEsp;
            const diferencia = minutosEsperados - minutosReales;
            
            if (diferencia > 0) {
                minutosDiferencia = diferencia;
                estadoTexto = 'SALIDA ANTICIPADA';
                claseEstado = 'atraso-si';
            }
        }

        const horaFormateada = registro.timestamp.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        const textoDiferencia = minutosDiferencia > 0 ? `${minutosDiferencia} min` : '-';

        htmlTabla += `
            <tr>
                <td>${empleado.nombre_completo}</td>
                <td>${registro.tipo_accion}</td>
                <td>${horaFormateada}</td>
                <td class="${claseEstado}">${estadoTexto}</td>
                <td>${textoDiferencia}</td>
            </tr>
        `;
    });

    htmlTabla += `</tbody></table>`;
    contenedor.innerHTML = htmlTabla;
});
