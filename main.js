const { app, BrowserWindow, session, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const tiposPermitidos = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp'
};

ipcMain.handle('abrir-documento-solicitud', async (_evento, archivo) => {
    try {
        const datos = String(archivo?.datos || '');
        const coincidencia = datos.match(/^data:([^;,]+);base64,([\s\S]+)$/);
        if (!coincidencia) throw new Error('El documento guardado no tiene un formato válido.');

        const mime = coincidencia[1].toLowerCase();
        const extension = tiposPermitidos[mime];
        if (!extension) throw new Error('El tipo de documento no está permitido.');

        const contenido = Buffer.from(coincidencia[2], 'base64');
        if (!contenido.length) throw new Error('El documento está vacío.');
        if (contenido.length > 4 * 1024 * 1024) throw new Error('El documento supera el tamaño permitido.');
        if (mime === 'application/pdf' && contenido.subarray(0, 4).toString() !== '%PDF') {
            throw new Error('El archivo almacenado no corresponde a un PDF válido.');
        }

        const nombreBase = path.parse(path.basename(String(archivo?.nombre || 'documento'))).name
            .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_')
            .slice(0, 70) || 'documento';
        const carpeta = path.join(app.getPath('temp'), 'sistema-asistencia-documentos');
        fs.mkdirSync(carpeta, { recursive: true });
        const ruta = path.join(carpeta, `${Date.now()}-${nombreBase}${extension}`);
        fs.writeFileSync(ruta, contenido);

        const errorApertura = await shell.openPath(ruta);
        if (errorApertura) throw new Error(errorApertura);
        return { ok: true };
    } catch (error) {
        return { ok: false, error: error.message || 'No fue posible abrir el documento.' };
    }
});

ipcMain.handle('guardar-reporte-csv', async (_evento, reporte) => {
    try {
        const nombreSeguro = path.basename(String(reporte?.nombre || 'reporte_asistencia.csv'));
        const seleccion = await dialog.showSaveDialog({
            title: 'Guardar reporte de asistencia',
            defaultPath: nombreSeguro,
            filters: [{ name: 'Archivo compatible con Excel', extensions: ['csv'] }]
        });
        if (seleccion.canceled || !seleccion.filePath) return { ok: false, cancelado: true };
        fs.writeFileSync(seleccion.filePath, `\uFEFF${String(reporte?.contenido || '')}`, 'utf8');
        return { ok: true, ruta: seleccion.filePath };
    } catch (error) {
        return { ok: false, cancelado: false, error: error.message || 'No fue posible guardar el reporte.' };
    }
});

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Carga el archivo HTML de la vista principal
    mainWindow.loadFile(path.join(__dirname, 'vistas', 'index.html'));
}

app.whenReady().then(() => {
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => permission === 'media');
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        callback(permission === 'media');
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
