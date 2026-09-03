
// 1. LÓGICA DE ASISTENCIA (Botones de Entrada/Salida)
document.getElementById('btn-entrada').addEventListener('click', () => registrarMarcaje('ENTRADA'));
document.getElementById('btn-salida').addEventListener('click', () => registrarMarcaje('SALIDA'));

function registrarMarcaje(tipo) {
    const fechaHora = new Date();
    const textoEstado = document.getElementById('mensaje-estado');
    
    // Instanciamos usando la clase global
    const nuevoRegistro = new RegistroAsistencia(usuarioActual.id, tipo, fechaHora);
    registrosAsistencia.push(nuevoRegistro);

    const horaFormateada = fechaHora.toLocaleTimeString('es-CL', { hour12: false });
    textoEstado.textContent = `Registro de ${tipo} guardado a las ${horaFormateada}`;
    textoEstado.style.color = tipo === 'ENTRADA' ? '#198754' : '#dc3545';
}

// 2. LÓGICA DE LICENCIAS Y MOTOR OCR SIMULADO
const formularioJustificacion = document.getElementById('formulario-justificacion');
const mensajeValidacion = document.getElementById('mensaje-validacion');
const licenciasBD = []; // Simulador de base de datos de licencias

formularioJustificacion.addEventListener('submit', (evento) => {
    evento.preventDefault();
    
    const archivoInput = document.getElementById('archivo-licencia');
    if (archivoInput.files.length === 0) return;
    
    const nombreArchivo = archivoInput.files[0].name;

    mensajeValidacion.textContent = "⚙️ Procesando documento con motor OCR...";
    mensajeValidacion.style.color = "#666";

    // Simulamos la carga pesada de un análisis OCR
    setTimeout(() => {
        const folioExtraido = "FOL-" + Math.floor(Math.random() * 90000 + 10000);
        const nuevaLicencia = new LicenciaMedica(usuarioActual.id, folioExtraido, '12345678-9', nombreArchivo);
        
        // Regla de validación: rechaza si el archivo se llama "falso" o "editado"
        if (nombreArchivo.toLowerCase().includes('falso') || nombreArchivo.toLowerCase().includes('editado')) {
            nuevaLicencia.estado = 'DUDOSA';
            mensajeValidacion.textContent = `Licencia enviada, pero etiquetada como DUDOSA (Folio: ${folioExtraido}).`;
            mensajeValidacion.style.color = "#dc3545"; 
        } else {
            nuevaLicencia.estado = 'VERIFICADA';
            mensajeValidacion.textContent = `Licencia VERIFICADA exitosamente (Folio: ${folioExtraido}). Enviada a RRHH.`;
            mensajeValidacion.style.color = "#198754"; 
        }

        licenciasBD.push(nuevaLicencia);
        
        setTimeout(() => {
            formularioJustificacion.reset();
            mensajeValidacion.textContent = "";
        }, 5000);

    }, 2000); 
});