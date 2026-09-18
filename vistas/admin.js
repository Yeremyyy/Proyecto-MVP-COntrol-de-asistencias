
const menuPrincipal = document.getElementById('menu-admin-principal');
const modulos = {
    reportes: document.getElementById('modulo-reportes'),
    crear: document.getElementById('modulo-crear'),
    gestionar: document.getElementById('modulo-gestionar'),
    qr: document.getElementById('modulo-qr')
};

function abrirModulo(moduloHtml) {
    if(!menuPrincipal || !moduloHtml) return;
    menuPrincipal.style.display = 'none';
    Object.values(modulos).forEach(mod => mod.style.display = 'none');
    moduloHtml.style.display = 'block';
}

// Navegación
document.getElementById('btn-menu-reportes')?.addEventListener('click', () => {
    abrirModulo(modulos.reportes);
    renderizarTablaReportes();
});
document.getElementById('btn-menu-crear')?.addEventListener('click', () => abrirModulo(modulos.crear));
document.getElementById('btn-menu-gestionar')?.addEventListener('click', () => {
    abrirModulo(modulos.gestionar);
    renderizarTablaUsuarios();
});
document.getElementById('btn-menu-qr')?.addEventListener('click', () => abrirModulo(modulos.qr));

document.querySelectorAll('.btn-volver').forEach(btn => {
    btn.addEventListener('click', () => {
        Object.values(modulos).forEach(mod => mod.style.display = 'none');
        menuPrincipal.style.display = 'grid'; 
    });
});

/* --- LÓGICA DE REPORTES UNIFICADOS --- */
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
                    <th style="padding: 10px 5px;">Descargar</th>
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
                estado = `Infracción (Atraso ${minutosTarde} min)`;
                colorEstado = '#dc3545';
            } else {
                estado = 'Jornada Cumplida';
                colorEstado = '#198754';
            }
        }

        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 5px; font-weight: bold;">${emp.nombre_completo}</td>
                <td style="padding: 10px 5px;">${emp.hora_entrada} - ${emp.hora_salida}</td>
                <td style="padding: 10px 5px; color: ${colorEstado}; font-weight: bold;">${estado}</td>
                <td style="padding: 10px 5px;">
                    <button onclick="descargarReporteIndividual(${emp.id}, '${emp.nombre_completo}')" class="btn-texto" style="color: #0056b3; font-weight: bold; text-decoration: underline; padding: 0;">Descargar PDF</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

window.descargarReporteIndividual = function(id, nombre) {
    alert(`Generando reporte PDF individual para: ${nombre}...`);
}

window.descargarReporteTotal = function() {
    alert(`Generando reporte global en Excel/PDF con todos los empleados...`);
}

/* --- LÓGICA CREAR USUARIOS (VALIDACIONES ESTRICTAS) --- */
/* --- LÓGICA CREAR USUARIOS (MÁSCARAS Y AUTOFORMATO) --- */
const formCrearUsuario = document.getElementById('formulario-crear-usuario');
const inputNombre = document.getElementById('nuevo-nombre');
const inputPaterno = document.getElementById('nuevo-paterno');
const inputMaterno = document.getElementById('nuevo-materno');
const inputRut = document.getElementById('nuevo-rut');
const inputTelefono = document.getElementById('nuevo-telefono');
const inputCorreo = document.getElementById('nuevo-correo');
const inputPass = document.getElementById('nueva-pass');
const mensajeCreacion = document.getElementById('mensaje-creacion');

// Validación y limpieza de nombres en tiempo real
[inputNombre, inputPaterno, inputMaterno].forEach(input => {
    if (input) {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[0-9]/g, ''); 
            generarCorreo(); 
        });
    }
});

// Teléfono: Estricto a 8 dígitos numéricos
if (inputTelefono) {
    inputTelefono.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 8); 
    });
}

// MÁSCARA AUTOMÁTICA DE RUT (Ej: 12.345.678-9)
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

        // Autogenerar contraseña con los primeros 4 dígitos numéricos del RUT
        let soloNumeros = valor.replace(/[^0-9]/g, '');
        if (inputPass) {
            inputPass.value = soloNumeros.length >= 4 ? soloNumeros.substring(0, 4) : '';
        }
    });
}

// Generador de correo corporativo inteligente (ej: p.ramirez@empresa.cl)
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

if (formCrearUsuario) {
    formCrearUsuario.addEventListener('submit', (evento) => {
        evento.preventDefault();
        
        const nombre = inputNombre.value.trim();
        const apellidoPaterno = inputPaterno.value.trim();
        const apellidoMaterno = inputMaterno.value.trim();
        const rut = inputRut.value.trim();
        const telefono = `+56 9 ${inputTelefono.value.trim()}`; // Guardamos con formato completo
        const direccion = document.getElementById('nueva-direccion').value.trim();
        const correo = inputCorreo.value; 
        const pass = inputPass.value;     
        const entrada = document.getElementById('nueva-entrada').value; 
        const salida = document.getElementById('nueva-salida').value;
        const rol = document.getElementById('nuevo-rol').value;

        if (usuariosBD.some(usuario => usuario.rut === rut)) {
            mensajeCreacion.textContent = 'Ya existe un usuario registrado con este RUT.';
            mensajeCreacion.style.color = '#dc3545';
            return;
        }

        if (usuariosBD.some(usuario => usuario.correo.toLowerCase() === correo.toLowerCase())) {
            mensajeCreacion.textContent = 'Ya existe un usuario registrado con este correo.';
            mensajeCreacion.style.color = '#dc3545';
            return;
        }

        const nuevoId = usuariosBD.length > 0 ? Math.max(...usuariosBD.map(u => u.id)) + 1 : 1;

        const datosUsuario = [
            nuevoId, nombre, apellidoPaterno, apellidoMaterno, rut,
            telefono, direccion, correo, pass, entrada, salida
        ];

        let nuevoUsuario;
        if (rol === 'admin') {
            nuevoUsuario = new Administrador(...datosUsuario);
        } else if (rol === 'rrhh') {
            nuevoUsuario = new RecursosHumanos(...datosUsuario);
        } else {
            nuevoUsuario = new Empleado(...datosUsuario);
        }

        usuariosBD.push(nuevoUsuario);

        mensajeCreacion.textContent = `Usuario registrado como ${nombreRol(rol)}. Correo corporativo: ${correo}`;
        mensajeCreacion.style.color = '#198754'; 
        
        formCrearUsuario.reset();
        inputCorreo.value = '';
        inputPass.value = '';
        
        setTimeout(() => mensajeCreacion.textContent = '', 6000);
    });
}

/* --- LÓGICA GESTIÓN (EDITAR / ELIMINAR) --- */
function renderizarTablaUsuarios() {
    const contenedorTabla = document.getElementById('tabla-usuarios');
    const usuarios = usuariosBD;
    
    if (usuarios.length === 0) {
        contenedorTabla.innerHTML = '<p class="texto-estado">No hay usuarios registrados en el sistema.</p>';
        return;
    }
    
    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
                <tr style="border-bottom: 2px solid #ddd;">
                    <th style="padding: 8px;">ID</th>
                    <th style="padding: 8px;">Nombre Completo</th>
                    <th style="padding: 8px;">RUT</th>
                    <th style="padding: 8px;">Rol</th>
                    <th style="padding: 8px;">Correo</th>
                    <th style="padding: 8px;">Horario</th>
                    <th style="padding: 8px;">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    usuarios.forEach(emp => {
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${emp.id}</td>
                <td style="padding: 8px;">${emp.nombre_completo}</td>
                <td style="padding: 8px;">${emp.rut}</td>
                <td style="padding: 8px;">${nombreRol(emp.rol)}</td>
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

function nombreRol(rol) {
    const roles = {
        empleado: 'Empleado',
        rrhh: 'Recursos Humanos',
        admin: 'Administrador'
    };
    return roles[rol] || rol;
}

window.eliminarUsuario = function(id) {
    if (usuarioActual && usuarioActual.id === id) {
        alert('No puedes eliminar tu propia cuenta mientras la estás usando.');
        return;
    }

    if(confirm('¿Seguro que deseas eliminar el acceso de este usuario?')) {
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
        document.getElementById('edit-paterno').value = empleado.apellido_paterno;
        document.getElementById('edit-materno').value = empleado.apellido_materno;
        document.getElementById('edit-rut').value = empleado.rut;
        document.getElementById('edit-telefono').value = empleado.telefono;
        document.getElementById('edit-direccion').value = empleado.direccion;
        document.getElementById('edit-correo').value = empleado.correo;
        document.getElementById('edit-contrasena').value = empleado.contrasena;
        document.getElementById('edit-entrada').value = empleado.hora_entrada;
        document.getElementById('edit-salida').value = empleado.hora_salida;
    }
}

window.guardarEdicion = function() {
    const id = parseInt(document.getElementById('edit-id').value);
    const empleado = usuariosBD.find(u => u.id === id);
    if(empleado) {
        empleado.nombre = document.getElementById('edit-nombre').value.trim();
        empleado.apellido_paterno = document.getElementById('edit-paterno').value.trim();
        empleado.apellido_materno = document.getElementById('edit-materno').value.trim();
        empleado.rut = document.getElementById('edit-rut').value.trim();
        empleado.telefono = document.getElementById('edit-telefono').value.trim();
        empleado.direccion = document.getElementById('edit-direccion').value.trim();
        empleado.correo = document.getElementById('edit-correo').value.trim();
        empleado.contrasena = document.getElementById('edit-contrasena').value;
        empleado.hora_entrada = document.getElementById('edit-entrada').value;
        empleado.hora_salida = document.getElementById('edit-salida').value;
        
        document.getElementById('caja-edicion').style.display = 'none';
        renderizarTablaUsuarios(); 
        alert('Información del usuario actualizada correctamente.');
    }
}

window.cancelarEdicion = function() {
    document.getElementById('caja-edicion').style.display = 'none';
}
