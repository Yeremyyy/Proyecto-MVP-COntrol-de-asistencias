// 1. BASE DE DATOS SIMULADA (MOCK) USANDO CLASES (POO)
const usuariosBD = [
    new Administrador(1, 'jordan@empresa.cl', '123', 'Jordan'),
    new Empleado(2, 'rafa@empresa.cl', '123', 'Rafa', '08:00', '17:50'),
    new Empleado(3, 'pato@empresa.cl', '123', 'Pato', '08:00', '17:00')
];

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

// LOGICA DE LOGIN Y RUTEO 
if (formularioLogin) {
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
                
                const menuAdmin = document.getElementById('menu-admin-principal');
                if (menuAdmin) menuAdmin.style.display = 'grid'; 
                
                ['modulo-reportes', 'modulo-crear', 'modulo-gestionar'].forEach(modId => {
                    const mod = document.getElementById(modId);
                    if (mod) mod.style.display = 'none';
                });

                vistaAdmin.classList.add('activa'); 
            } else {
                nombreUsuarioSpan.textContent = usuarioActual.nombre;
                vistaPanel.classList.add('activa'); 
                iniciarReloj();

                localStorage.setItem('usuarioLogueadoId', usuarioActual.id);
                
                setTimeout(() => {
                    if (typeof generarQrEmpleado === 'function') generarQrEmpleado();
                    if (typeof renderizarCalendarioEmpleado === 'function') renderizarCalendarioEmpleado();
                }, 100);
            }
        } else {
            errorTexto.textContent = 'Credenciales incorrectas o usuario no existe.';
        }
    });
}

// UTILIDADES 
function iniciarReloj() {
    if (relojTexto) {
        relojTexto.textContent = new Date().toLocaleTimeString('es-CL');
        intervaloReloj = setInterval(() => {
            relojTexto.textContent = new Date().toLocaleTimeString('es-CL');
        }, 1000);
    }
}

const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
        usuarioActual = null;
        localStorage.removeItem('usuarioLogueadoId'); 
        clearInterval(intervaloReloj);
        
        if (typeof intervaloQR !== 'undefined' && intervaloQR) clearInterval(intervaloQR);
        if (typeof intervaloContador !== 'undefined' && intervaloContador) clearInterval(intervaloContador);
        
        const seccionCalendario = document.getElementById('seccion-calendario');
        if (seccionCalendario) seccionCalendario.style.display = 'none';
        
        const btnToggleCalendario = document.getElementById('btn-toggle-calendario');
        if (btnToggleCalendario) btnToggleCalendario.textContent = 'Ver mi Calendario de Asistencia';

        vistaPanel.classList.remove('activa');
        vistaLogin.classList.add('activa');
    });
}

const btnCerrarSesionAdmin = document.getElementById('btn-cerrar-sesion-admin');
if (btnCerrarSesionAdmin) {
    btnCerrarSesionAdmin.addEventListener('click', () => {
        usuarioActual = null;
        const contenedorReporte = document.getElementById('contenedor-reporte');
        if (contenedorReporte) contenedorReporte.innerHTML = ''; 
        vistaAdmin.classList.remove('activa');
        vistaLogin.classList.add('activa');
    });
}

// AUTO-LOGIN AL ABRIR LA APP EN EL CELULAR
window.addEventListener('DOMContentLoaded', () => {
    const idGuardado = localStorage.getItem('usuarioLogueadoId');
    if (idGuardado && vistaLogin) {
        const usuarioEncontrado = usuariosBD.find(u => u.id === parseInt(idGuardado));
        if (usuarioEncontrado && usuarioEncontrado.rol === 'empleado') {
            usuarioActual = usuarioEncontrado;
            vistaLogin.classList.remove('activa');
            
            document.getElementById('nombre-usuario').textContent = usuarioActual.nombre;
            document.getElementById('vista-panel').classList.add('activa'); 
            iniciarReloj();
            
            setTimeout(() => {
                if (typeof generarQrEmpleado === 'function') generarQrEmpleado();
                if (typeof renderizarCalendarioEmpleado === 'function') renderizarCalendarioEmpleado();
            }, 100);
        }
    }
});