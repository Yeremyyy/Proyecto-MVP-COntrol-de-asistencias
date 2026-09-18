<<<<<<< HEAD
import { Html5Qrcode } from 'html5-qrcode';
import { rpc, configurado } from '../src/db.js';
=======
const { Html5Qrcode } = require('html5-qrcode');
const { rpc, configurado } = require('../src/db');
>>>>>>> e4be5c92cfeb857207d8a1cc7c4ee386e787a5df

const mensaje = document.getElementById('mensaje-kiosco');
const btnVolver = document.getElementById('btn-volver');
const controles = document.getElementById('controles-camara');
const selector = document.getElementById('selector-camara');
const btnReintentar = document.getElementById('btn-reintentar-camara');
let lector = null;
let camaras = [];
let procesando = false;

function mostrar(texto, color = '#666') {
    mensaje.textContent = texto;
    mensaje.style.color = color;
}

function explicarError(error) {
    const texto = String(error?.message || error || 'Error desconocido');
    if (/NotAllowed|Permission|denied/i.test(texto)) {
        return 'Permiso de cámara rechazado. Habilita la cámara para esta aplicación en Configuración de Windows > Privacidad y seguridad > Cámara.';
    }
    if (/NotFound|DevicesNotFound|no cameras/i.test(texto)) {
        return 'No se encontró ninguna cámara conectada al equipo.';
    }
    if (/NotReadable|TrackStart|Could not start/i.test(texto)) {
        return 'La cámara está siendo utilizada por otra aplicación. Cierra Teams, Zoom o la aplicación Cámara y vuelve a intentar.';
    }
    return `No fue posible iniciar la cámara: ${texto}`;
}

async function buscarCamaras() {
<<<<<<< HEAD
    mostrar(configurado ? 'Solicitando permiso de cámara...' : 'Primero configura las variables de Supabase.', configurado ? '#0056b3' : '#dc3545');
=======
    mostrar(configurado ? 'Solicitando permiso de cámara...' : 'Primero configura Supabase en src/config.js.', configurado ? '#0056b3' : '#dc3545');
>>>>>>> e4be5c92cfeb857207d8a1cc7c4ee386e787a5df
    try {
        camaras = await Html5Qrcode.getCameras();
        if (!camaras.length) throw new Error('No cameras found');
        selector.innerHTML = camaras.map((camara, indice) => `<option value="${camara.id}">${camara.label || `Cámara ${indice + 1}`}</option>`).join('');
        controles.style.display = 'block';
        await iniciarCamara(camaras[0].id);
    } catch (error) {
        controles.style.display = 'block';
        mostrar(explicarError(error), '#dc3545');
    }
}

async function iniciarCamara(camaraId) {
    try {
        if (lector?.isScanning) await lector.stop();
        if (!lector) lector = new Html5Qrcode('lector-qr');
        mostrar('Iniciando cámara...', '#0056b3');
        await lector.start(camaraId, {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1
        }, procesarQR, () => {});
        mostrar('Cámara activa. Acerque el QR del empleado.', '#198754');
    } catch (error) {
        mostrar(explicarError(error), '#dc3545');
    }
}

async function procesarQR(textoDecodificado) {
    if (procesando) return;
    procesando = true;
    try { if (lector?.isScanning) lector.pause(true); } catch (_) {}
    mostrar('QR detectado. Validando en Supabase...', '#0056b3');
    try {
        const resultado = await rpc('registrar_marcacion_qr', { p_qr_token: textoDecodificado.trim() });
        mostrar(`${resultado.accion} registrada: ${resultado.empleado} a las ${resultado.hora}`, '#198754');
    } catch (error) {
        mostrar(error.message, '#dc3545');
    }
    setTimeout(() => {
        procesando = false;
        try { lector.resume(); } catch (_) {}
        mostrar('Cámara activa. Lista para el siguiente QR.', '#666');
    }, 3500);
}

btnReintentar.addEventListener('click', () => {
    const id = selector.value || camaras[0]?.id;
    if (id) iniciarCamara(id); else buscarCamaras();
});
selector.addEventListener('change', () => iniciarCamara(selector.value));
btnVolver.addEventListener('click', async () => {
    try { if (lector?.isScanning) await lector.stop(); } catch (_) {}
    window.location.href = 'index.html';
});
window.addEventListener('beforeunload', () => {
    try { if (lector?.isScanning) lector.stop(); } catch (_) {}
});
window.addEventListener('DOMContentLoaded', buscarCamaras);
