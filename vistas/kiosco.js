const mensajeKiosco = document.getElementById('mensaje-kiosco');
let escanerQR = null;

document.addEventListener("DOMContentLoaded", () => {
    escanerQR = new Html5QrcodeScanner("lector-qr", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    }, false);

    escanerQR.render(onScanSuccess, onScanFailure);
});

function onScanSuccess(textoDecodificado) {
    const datosQR = textoDecodificado.split('-');
    
    if (datosQR.length !== 2) {
        mostrarMensajeTemporal('Acceso Denegado: Codigo QR no valido o antiguo.', '#dc3545');
        return;
    }

    const idEscaneado = parseInt(datosQR[0]);
    const bloqueEscaneado = parseInt(datosQR[1]);
    
    const bloqueActual = Math.floor(Date.now() / 30000);
    if (Math.abs(bloqueActual - bloqueEscaneado) > 1) {
        mostrarMensajeTemporal('Acceso Denegado: El codigo QR ha caducado.', '#dc3545');
        return;
    }

    const empleado = usuariosBD.find(u => u.id === idEscaneado && u.rol === 'empleado');

    if (empleado) {
        escanerQR.pause(); 
        
        const hoy = new Date().toISOString().split('T')[0];
        const entradasHoy = registrosAsistencia.filter(r => r.usuario_id === empleado.id && r.tipo_accion === 'ENTRADA' && r.timestamp.toISOString().split('T')[0] === hoy);
        const salidasHoy = registrosAsistencia.filter(r => r.usuario_id === empleado.id && r.tipo_accion === 'SALIDA' && r.timestamp.toISOString().split('T')[0] === hoy);
        
        let accion = 'ENTRADA';
        if (entradasHoy.length > salidasHoy.length) {
            accion = 'SALIDA';
        }

        registrosAsistencia.push(new RegistroAsistencia(empleado.id, accion, new Date()));

        mostrarMensajeTemporal(`Registro exitoso: ${accion} - ${empleado.nombre}`, '#198754', true);
    } else {
        mostrarMensajeTemporal('Acceso Denegado: Empleado no encontrado.', '#dc3545');
    }
}

function mostrarMensajeTemporal(texto, color, pausar = false) {
    if (mensajeKiosco) {
        mensajeKiosco.textContent = texto;
        mensajeKiosco.style.color = color; 
        
        setTimeout(() => {
            mensajeKiosco.textContent = '';
            if(pausar && escanerQR) escanerQR.resume();
        }, 3000);
    }
}

function onScanFailure(error) {
    // Se ignora para no saturar la consola
}