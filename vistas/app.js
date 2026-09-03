// 1. BASE DE DATOS SIMULADA (MOCK) USANDO CLASES (POO)
const usuariosBD = [
    // Instanciamos usando las clases de src/clases.js
    new Administrador(1, 'jordan@empresa.cl', '123', 'Jordan'),
    new Empleado(2, 'rafa@empresa.cl', '123', 'Rafa', '08:00', '17:50'),
    new Empleado(3, 'pato@empresa.cl', '123', 'Pato', '08:00', '17:00')
];

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