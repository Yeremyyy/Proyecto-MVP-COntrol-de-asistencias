// 1. BASE DE DATOS SIMULADA
const usuariosBD = [
    { id: 1, correo: 'jordan@empresa.cl', contrasena: '123', nombre: 'Jordan' },
    { id: 2, correo: 'castro@empresa.cl', contrasena: '123', nombre: 'Luis Castro' },
    { id: 3, correo: 'liberona@empresa.cl', contrasena: '123', nombre: 'Luis Liberona' }
];

// Array para guardar los registros de asistencia temporalmente
const registrosAsistencia = [];
let usuarioActual = null;
let intervaloReloj = null;

// 2. REFERENCIAS AL DOM 
const vistaLogin = document.getElementById('vista-login');
const vistaPanel = document.getElementById('vista-panel');
const formularioLogin = document.getElementById('formulario-login');
const errorTexto = document.getElementById('mensaje-error');
const nombreUsuarioSpan = document.getElementById('nombre-usuario');
const relojTexto = document.getElementById('reloj-actual');
const textoEstado = document.getElementById('mensaje-estado');

// 3. LÓGICA DE LOGIN 
formularioLogin.addEventListener('submit', (evento) => {
    evento.preventDefault(); 
    
    const correoIngresado = document.getElementById('correo').value;
    const passIngresada = document.getElementById('contrasena').value;

    // Buscar si el usuario existe en nuestra lista
    const usuarioEncontrado = usuariosBD.find(u => u.correo === correoIngresado && u.contrasena === passIngresada);

    if (usuarioEncontrado) {
        // Ingreso exitoso
        usuarioActual = usuarioEncontrado;
        nombreUsuarioSpan.textContent = usuarioActual.nombre;
        errorTexto.textContent = '';
        formularioLogin.reset();
        
        // Cambiar vista
        vistaLogin.classList.remove('activa');
        vistaPanel.classList.add('activa');
        
        iniciarReloj();
    } else {
        errorTexto.textContent = 'Credenciales incorrectas.';
    }
});

// 4. LÓGICA DE ASISTENCIA 
document.getElementById('btn-entrada').addEventListener('click', () => registrarMarcaje('ENTRADA'));
document.getElementById('btn-salida').addEventListener('click', () => registrarMarcaje('SALIDA'));

function registrarMarcaje(tipo) {
    const fechaHora = new Date();
    
    // Guardar en la Base de datos
    registrosAsistencia.push({
        usuario_id: usuarioActual.id,
        tipo_accion: tipo,
        timestamp: fechaHora
    });

    // Mostrar feedback en pantalla
    const horaFormateada = fechaHora.toLocaleTimeString('es-CL');
    textoEstado.textContent = `Registro de ${tipo} guardado a las ${horaFormateada}`;
    textoEstado.style.color = tipo === 'ENTRADA' ? '#2b6a42' : '#8a2525';

    // Imprimir en consola de desarrollo para verificar que funciona internamente
    console.log("Tabla de Registros Interna:", registrosAsistencia);
}

// 5. UTILIDADES (Reloj y Cerrar Sesión)
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