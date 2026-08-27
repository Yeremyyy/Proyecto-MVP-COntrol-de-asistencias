// 1. BASE DE DATOS SIMULADA (MOCK)
const usuariosBD = [
    { id: 1, correo: 'jordan@empresa.cl', contrasena: '123', nombre: 'Jordan', rol: 'admin' },
    // Agregamos hora_salida (18:00 hrs) a los empleados
    { id: 2, correo: 'rafa@empresa.cl', contrasena: '123', nombre: 'Rafa', rol: 'empleado', hora_entrada: '08:00', hora_salida: '17:50' },
    { id: 3, correo: 'pato@empresa.cl', contrasena: '123', nombre: 'Pato', rol: 'empleado', hora_entrada: '08:00', hora_salida: '17:00' }
];

// Array simulando la BD de registros (Entradas y Salidas)
const hoy = new Date();
const registrosAsistencia = [
    // ENTRADAS
    { usuario_id: 2, tipo_accion: 'ENTRADA', timestamp: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 7, 50, 0) }, 
    { usuario_id: 3, tipo_accion: 'ENTRADA', timestamp: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 8, 25, 0) },
    // SALIDAS
    { usuario_id: 2, tipo_accion: 'SALIDA', timestamp: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 18, 5, 0) }, 
    { usuario_id: 3, tipo_accion: 'SALIDA', timestamp: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 14, 0, 0) } 
];

let usuarioActual = null;
let intervaloReloj = null;

const vistaLogin = document.getElementById('vista-login');
const vistaPanel = document.getElementById('vista-panel');
const vistaAdmin = document.getElementById('vista-admin'); 
const formularioLogin = document.getElementById('formulario-login');
const errorTexto = document.getElementById('mensaje-error');
const nombreUsuarioSpan = document.getElementById('nombre-usuario');
const nombreAdminSpan = document.getElementById('nombre-admin'); 
const relojTexto = document.getElementById('reloj-actual');
const textoEstado = document.getElementById('mensaje-estado');

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
            nombreAdminSpan.textContent = usuarioActual.nombre;
            vistaAdmin.classList.add('activa'); 
        } else {
            nombreUsuarioSpan.textContent = usuarioActual.nombre;
            vistaPanel.classList.add('activa'); 
            iniciarReloj();
        }
    } else {
        errorTexto.textContent = 'Credenciales incorrectas o usuario no existe.';
    }
});

// LÓGICA DE ASISTENCIA (Empleado)
document.getElementById('btn-entrada').addEventListener('click', () => registrarMarcaje('ENTRADA'));
document.getElementById('btn-salida').addEventListener('click', () => registrarMarcaje('SALIDA'));

function registrarMarcaje(tipo) {
    const fechaHora = new Date();
    
    registrosAsistencia.push({
        usuario_id: usuarioActual.id,
        tipo_accion: tipo,
        timestamp: fechaHora
    });

    const horaFormateada = fechaHora.toLocaleTimeString('es-CL');
    textoEstado.textContent = `Registro de ${tipo} guardado a las ${horaFormateada}`;
    textoEstado.style.color = tipo === 'ENTRADA' ? '#198754' : '#dc3545';
}

// UTILIDADES 
function iniciarReloj() {
    relojTexto.textContent = new Date().toLocaleTimeString('es-CL');
    intervaloReloj = setInterval(() => {
        relojTexto.textContent = new Date().toLocaleTimeString('es-CL');
    }, 1000);
}

document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    usuarioActual = null;
    textoEstado.textContent = '';
    clearInterval(intervaloReloj);
    vistaPanel.classList.remove('activa');
    vistaLogin.classList.add('activa');
});

document.getElementById('btn-cerrar-sesion-admin').addEventListener('click', () => {
    usuarioActual = null;
    document.getElementById('contenedor-reporte').innerHTML = ''; 
    vistaAdmin.classList.remove('activa');
    vistaLogin.classList.add('activa');
});

//LÓGICA DEL ADMINISTRADOR (Reporte Integral)
document.getElementById('btn-generar-reporte').addEventListener('click', () => {
    const contenedor = document.getElementById('contenedor-reporte');
    
    if (registrosAsistencia.length === 0) {
        contenedor.innerHTML = '<p class="texto-estado" style="text-align: left;">No hay registros procesables hoy.</p>';
        return; 
    }

    // Le agregamos la columna "Tipo" a la tabla para saber si evaluamos Entrada o Salida
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

    // Ahora iteramos sobre TODOS los registros, no solo las entradas
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
            // Para la salida es al revés: Esperado - Real
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
                <td>${empleado.nombre}</td>
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