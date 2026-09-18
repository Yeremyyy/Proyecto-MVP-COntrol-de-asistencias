const mensajeKiosco = document.getElementById('mensaje-kiosco');
const btnVolver = document.getElementById('btn-volver');
let escanerQR = null;

// 1. Iniciar la cámara al cargar la pantalla
window.addEventListener('DOMContentLoaded', () => {
    mensajeKiosco.textContent = "Iniciando cámara...";
    
    escanerQR = new Html5QrcodeScanner(
        "lector-qr", { fps: 10, qrbox: { width: 250, height: 250 } }, false
    );
    escanerQR.render(qrLeidoExitosamente, qrErrorLectura);
});

// 2. Procesar el QR
function qrLeidoExitosamente(textoDecodificado) {
    mensajeKiosco.textContent = `¡QR Detectado! Dato: ${textoDecodificado}`;
    mensajeKiosco.style.color = "#198754"; 
    
    escanerQR.pause(true);
    
    setTimeout(() => {
        mensajeKiosco.textContent = "Listo para el siguiente QR...";
        mensajeKiosco.style.color = "#666";
        escanerQR.resume();
    }, 3000);
}

function qrErrorLectura(error) {
    // Ignoramos errores de "no se detecta código" para no saturar
}

// 3. Volver al index.html
btnVolver.addEventListener('click', () => {
    if (escanerQR) {
        escanerQR.clear().then(() => {
            window.location.href = 'index.html';
        });
    } else {
        window.location.href = 'index.html';
    }
});