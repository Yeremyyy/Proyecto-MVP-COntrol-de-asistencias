/* ==========================================
   MODULO ADMINISTRADOR (Dashboard & CRUD)
========================================== */

const menuPrincipal = document.getElementById('menu-admin-principal');

const modulos = {
    reportes: document.getElementById('modulo-reportes'),
    crear: document.getElementById('modulo-crear'),
    gestionar: document.getElementById('modulo-gestionar')
};

function abrirModulo(moduloHtml) {
    if(!menuPrincipal || !moduloHtml) return;
    menuPrincipal.style.display = 'none';
    
    Object.values(modulos).forEach(mod => {
        if (mod) mod.style.display = 'none';
    });
    
    moduloHtml.style.display = 'block';
}

document.getElementById('btn-menu-reportes')?.addEventListener('click', () => {
    abrirModulo(modulos.reportes);
    renderizarTablaReportes();
});
document.getElementById('btn-menu-crear')?.addEventListener('click', () => abrirModulo(modulos.crear));
document.getElementById('btn-menu-gestionar')?.addEventListener('click', () => {
    abrirModulo(modulos.gestionar);
    renderizarTablaUsuarios();
});

document.querySelectorAll('.btn-volver').forEach(btn => {
    btn.addEventListener('click', () => {
        Object.values(modulos).forEach(mod => {
            if (mod) mod.style.display = 'none';
        });
        menuPrincipal.style.display = 'grid'; 
    });
});

/* --- LOGICA DE REPORTES --- */
function renderizarTablaReportes() {
    const contenedor = document.getElementById('contenedor-reporte');
    const empleados = usuariosBD.filter(u => u.rol === 'empleado'); 

    if (empleados.length === 0) {
        contenedor.innerHTML = '<p class="texto-estado">No hay empleados para reportar.</p>';
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
                <tr style="border-bottom: 2px solid #ddd;">
                    <th style="padding: 10px 5px;">Empleado</th>
                    <th style="padding: 10px 5px;">Horario Asignado</th>
                    <th style="padding: 10px 5px;">Estado General</th>
                    <th style="padding: 10px 5px;">Accion</th>
                </tr>
            </thead>
            <tbody>
    `;

    empleados.forEach(emp => {
        const registroEntrada = registrosAsistencia.find(reg => reg.usuario_id === emp.id && reg.tipo_accion === 'ENTRADA');
        let estado = 'Ausente / Sin Registro';
        let colorEstado = '#6c757d'; 

        if (registroEntrada) {
            const horaReal = registroEntrada.timestamp.getHours();
            const minReal = registroEntrada.timestamp.getMinutes();
            const minRealesTotal = (horaReal * 60) + minReal;

            const [horaEsp, minEsp] = emp.hora_entrada.split(':').map(Number);
            const minEsperadosTotal = (horaEsp * 60) + minEsp;

            if (minRealesTotal > minEsperadosTotal) {
                const minutosTarde = minRealesTotal - minEsperadosTotal;
                estado = `Infraccion (${minutosTarde} min)`;
                colorEstado = '#dc3545';
            } else {
                estado = 'Jornada Cumplida';
                colorEstado = '#198754';
            }
        }

        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 5px; font-weight: bold;">${emp.nombre}</td>
                <td style="padding: 10px 5px;">${emp.hora_entrada} - ${emp.hora_salida}</td>
                <td style="padding: 10px 5px; color: ${colorEstado}; font-weight: bold;">${estado}</td>
                <td style="padding: 10px 5px;">
                    <button onclick="descargarReporteIndividual(${emp.id}, '${emp.nombre}')" class="btn-texto" style="color: #0056b3; font-weight: bold; text-decoration: underline; padding: 0;">Ver Registros (PDF)</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

// PDF DETALLADO: REPORTE GENERAL
window.descargarReporteTotal = function() {
    if (!window.jspdf) {
        alert("La libreria de PDF esta cargando. Por favor, espere un segundo.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); // Formato horizontal para mas datos
    
    doc.setFontSize(18);
    doc.text("Reporte General de Asistencia y Atrasos", 14, 22);
    doc.setFontSize(11);
    doc.text(`Fecha de emision: ${new Date().toLocaleDateString('es-CL')}`, 14, 30);
    
    const empleados = usuariosBD.filter(u => u.rol === 'empleado');
    const data = empleados.map(emp => {
        const regEntrada = registrosAsistencia.find(reg => reg.usuario_id === emp.id && reg.tipo_accion === 'ENTRADA');
        const regSalida = registrosAsistencia.find(reg => reg.usuario_id === emp.id && reg.tipo_accion === 'SALIDA');
        
        let entradaReal = 'Sin marcar';
        let salidaReal = 'Sin marcar';
        let estado = 'Ausente';
        let infraccion = '0 min';
        
        if (regEntrada) {
            entradaReal = regEntrada.timestamp.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
            const horaReal = regEntrada.timestamp.getHours();
            const minReal = regEntrada.timestamp.getMinutes();
            const [horaEsp, minEsp] = emp.hora_entrada.split(':').map(Number);
            const diffEntrada = (horaReal * 60 + minReal) - (horaEsp * 60 + minEsp);
            
            if (diffEntrada > 0) {
                estado = 'Atraso';
                infraccion = `${diffEntrada} min`;
            } else {
                estado = 'Al dia';
            }
        }
        
        if (regSalida) {
            salidaReal = regSalida.timestamp.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
            const horaRealS = regSalida.timestamp.getHours();
            const minRealS = regSalida.timestamp.getMinutes();
            const [horaEspS, minEspS] = emp.hora_salida.split(':').map(Number);
            const diffSalida = (horaEspS * 60 + minEspS) - (horaRealS * 60 + minRealS);
            
            if (diffSalida > 0) {
                estado = estado === 'Atraso' ? 'Atraso / Salida Anticipada' : 'Salida Anticipada';
                infraccion = infraccion === '0 min' ? `${diffSalida} min` : `${parseInt(infraccion) + diffSalida} min total`;
            }
        }

        return [
            emp.id, 
            emp.nombre, 
            emp.rut || 'No registrado', 
            `${emp.hora_entrada} - ${emp.hora_salida}`, 
            entradaReal, 
            salidaReal, 
            estado, 
            infraccion
        ];
    });

    doc.autoTable({
        startY: 40,
        head: [['ID', 'Empleado', 'RUT', 'Horario Asignado', 'Entrada Real', 'Salida Real', 'Estado', 'Infraccion']],
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [51, 51, 51] }
    });
    
    window.open(doc.output('bloburl'), '_blank');
}

// PDF DETALLADO: REPORTE INDIVIDUAL
window.descargarReporteIndividual = function(id, nombre) {
    if (!window.jspdf) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const emp = usuariosBD.find(u => u.id === id);
    
    doc.setFontSize(18);
    doc.text(`Ficha de Asistencia: ${nombre}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`RUT: ${emp.rut || 'No registrado'}  |  Telefono: ${emp.telefono || 'No registrado'}`, 14, 32);
    doc.text(`Correo Corporativo: ${emp.correo}`, 14, 38);
    doc.text(`Horario Contractual: ${emp.hora_entrada} - ${emp.hora_salida}`, 14, 44);
    doc.text(`Documento generado el ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}`, 14, 50);
    
    const registros = registrosAsistencia.filter(reg => reg.usuario_id === id);
    registros.sort((a, b) => a.timestamp - b.timestamp);
    
    const data = registros.map(reg => {
        const fecha = reg.timestamp.toLocaleDateString('es-CL');
        const hora = reg.timestamp.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
        let estado = 'OK';
        let obs = 'A tiempo';
        
        if (reg.tipo_accion === 'ENTRADA') {
            const [hE, mE] = emp.hora_entrada.split(':').map(Number);
            const diff = (reg.timestamp.getHours() * 60 + reg.timestamp.getMinutes()) - (hE * 60 + mE);
            if (diff > 0) {
                estado = 'INFRACCION';
                obs = `Llego ${diff} min tarde`;
            }
        } else if (reg.tipo_accion === 'SALIDA') {
            const [hS, mS] = emp.hora_salida.split(':').map(Number);
            const diff = (hS * 60 + mS) - (reg.timestamp.getHours() * 60 + reg.timestamp.getMinutes());
            if (diff > 0) {
                estado = 'INFRACCION';
                obs = `Se retiro ${diff} min antes`;
            }
        }

        return [fecha, reg.tipo_accion, hora, estado, obs];
    });

    doc.autoTable({
        startY: 60,
        head: [['Fecha', 'Tipo de Marca', 'Hora Registrada', 'Estado', 'Detalle/Observacion']],
        body: data.length > 0 ? data : [['Sin historial', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [13, 110, 253] }
    });
    
    window.open(doc.output('bloburl'), '_blank');
}

/* --- LOGICA CREAR USUARIOS (SOLUCION DEL BUG) --- */
const inputNombre = document.getElementById('nuevo-nombre');
const inputPaterno = document.getElementById('nuevo-paterno');
const inputMaterno = document.getElementById('nuevo-materno');
const inputRut = document.getElementById('nuevo-rut');
const inputTelefono = document.getElementById('nuevo-telefono');
const inputCorreo = document.getElementById('nuevo-correo');
const inputPass = document.getElementById('nueva-pass'); // AQUI ESTABA EL ERROR: Ya esta corregido
const mensajeCreacion = document.getElementById('mensaje-creacion');

[inputNombre, inputPaterno, inputMaterno].forEach(input => {
    if (input) {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[0-9]/g, ''); 
            generarCorreo(); 
        });
    }
});

if (inputTelefono) {
    inputTelefono.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 8); 
    });
}

if (inputRut) {
    inputRut.addEventListener('input', function(e) {
        let valor = this.value.replace(/[^0-9kK]/g, '').toUpperCase();
        if (valor.length > 9) valor = valor.slice(0, 9);
        
        let rutLimpio = valor.slice(0, -1);
        let dv = valor.slice(-1);
        
        let rutFormateado = "";
        if (valor.length > 1) {
            rutFormateado = rutLimpio.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
        } else {
            rutFormateado = valor;
        }
        
        this.value = rutFormateado;

        let soloNumeros = valor.replace(/[^0-9]/g, '');
        if (inputPass) {
            inputPass.value = soloNumeros.length >= 4 ? soloNumeros.substring(0, 4) : '';
        }
    });
}

function generarCorreo() {
    if (!inputNombre || !inputPaterno || !inputCorreo) return;
    
    const n = inputNombre.value.trim().toLowerCase();
    const p = inputPaterno.value.trim().toLowerCase();
    
    if (n && p) {
        const inicialNombre = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").charAt(0);
        const apellidoLimpio = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
        inputCorreo.value = `${inicialNombre}.${apellidoLimpio}@empresa.cl`;
    } else {
        inputCorreo.value = '';
    }
}

// CONTROL MANUAL DEL BOTON DE GUARDADO (EVITA EL BLOQUEO DEL NAVEGADOR)
const btnGuardarEmpleado = document.getElementById('btn-guardar-empleado');
if (btnGuardarEmpleado) {
    btnGuardarEmpleado.addEventListener('click', () => {
        
        // Verifica si las variables existen para evitar crasheos
        if (!inputNombre || !inputRut || !inputCorreo || !inputPass) return;

        // Validacion estricta manual
        if (!inputNombre.value.trim() || !inputRut.value.trim() || !inputCorreo.value.trim() || !inputPass.value.trim()) {
            mensajeCreacion.textContent = 'Error: Por favor, complete todos los campos obligatorios.';
            mensajeCreacion.style.color = '#dc3545';
            return;
        }

        const nombreCompleto = `${inputNombre.value.trim()} ${inputPaterno.value.trim()} ${inputMaterno.value.trim()}`;
        const rut = inputRut.value.trim();
        const telefono = `+56 9 ${inputTelefono.value.trim()}`;
        const direccion = document.getElementById('nueva-direccion').value.trim();
        const correo = inputCorreo.value; 
        const pass = inputPass.value;     
        const entrada = document.getElementById('nueva-entrada').value; 
        const salida = document.getElementById('nueva-salida').value;

        const nuevoId = usuariosBD.length > 0 ? Math.max(...usuariosBD.map(u => u.id)) + 1 : 1;
        
        const nuevoEmpleado = new Empleado(nuevoId, correo, pass, nombreCompleto, entrada, salida);
        nuevoEmpleado.rut = rut;
        nuevoEmpleado.telefono = telefono;
        nuevoEmpleado.direccion = direccion;
        
        usuariosBD.push(nuevoEmpleado);

        mensajeCreacion.textContent = `Registro exitoso. Correo corporativo: ${correo}`;
        mensajeCreacion.style.color = '#198754'; 
        
        const formCrear = document.getElementById('formulario-crear-usuario');
        if (formCrear) formCrear.reset();
        
        inputCorreo.value = '';
        inputPass.value = '';
        
        setTimeout(() => mensajeCreacion.textContent = '', 6000);
    });
}

/* --- LOGICA GESTION (EDITAR / ELIMINAR) --- */
function renderizarTablaUsuarios() {
    const contenedorTabla = document.getElementById('tabla-usuarios');
    const empleados = usuariosBD.filter(u => u.rol === 'empleado'); 
    
    if (empleados.length === 0) {
        contenedorTabla.innerHTML = '<p class="texto-estado">No hay empleados registrados en el sistema.</p>';
        return;
    }
    
    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
                <tr style="border-bottom: 2px solid #ddd;">
                    <th style="padding: 8px;">ID</th>
                    <th style="padding: 8px;">Nombre Completo</th>
                    <th style="padding: 8px;">Correo</th>
                    <th style="padding: 8px;">Horario</th>
                    <th style="padding: 8px;">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    empleados.forEach(emp => {
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${emp.id}</td>
                <td style="padding: 8px;">${emp.nombre}</td>
                <td style="padding: 8px;">${emp.correo}</td>
                <td style="padding: 8px;">${emp.hora_entrada} - ${emp.hora_salida}</td>
                <td style="padding: 8px; display: flex; gap: 5px;">
                    <button onclick="prepararEdicion(${emp.id})" style="background: #333; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">Editar</button>
                    <button onclick="eliminarUsuario(${emp.id})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Borrar</button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    contenedorTabla.innerHTML = html;
}

window.eliminarUsuario = function(id) {
    if(confirm('¿Seguro que deseas eliminar el acceso de este empleado?')) {
        const indice = usuariosBD.findIndex(u => u.id === id);
        if (indice !== -1) {
            usuariosBD.splice(indice, 1); 
            renderizarTablaUsuarios(); 
        }
    }
};

window.prepararEdicion = function(id) {
    const empleado = usuariosBD.find(u => u.id === id);
    if(empleado) {
        document.getElementById('caja-edicion').style.display = 'block';
        document.getElementById('edit-id').value = empleado.id;
        document.getElementById('edit-nombre').value = empleado.nombre;
        document.getElementById('edit-entrada').value = empleado.hora_entrada;
        document.getElementById('edit-salida').value = empleado.hora_salida;
    }
}

window.guardarEdicion = function() {
    const id = parseInt(document.getElementById('edit-id').value);
    const empleado = usuariosBD.find(u => u.id === id);
    if(empleado) {
        empleado.nombre = document.getElementById('edit-nombre').value;
        empleado.hora_entrada = document.getElementById('edit-entrada').value;
        empleado.hora_salida = document.getElementById('edit-salida').value;
        
        document.getElementById('caja-edicion').style.display = 'none';
        renderizarTablaUsuarios(); 
        alert('Informacion del empleado actualizada correctamente.');
    }
}

window.cancelarEdicion = function() {
    document.getElementById('caja-edicion').style.display = 'none';
}