/* =========================================
   SISTEMA CORE: CLASES Y ARQUITECTURA POO
========================================= */

// 1. CLASE PADRE (Superclase)
class Usuario {
    constructor(id, correo, contrasena, nombre, rol) {
        this.id = id;
        this.correo = correo;
        this.contrasena = contrasena;
        this.nombre = nombre;
        this.rol = rol;
    }
}

// 2. CLASES HIJAS (Herencia)
class Empleado extends Usuario {
    constructor(id, correo, contrasena, nombre, horaEntrada, horaSalida) {
        // La función super() llama al constructor del padre (Usuario)
        super(id, correo, contrasena, nombre, 'empleado'); 
        this.hora_entrada = horaEntrada;
        this.hora_salida = horaSalida;
    }
}

class Administrador extends Usuario {
    constructor(id, correo, contrasena, nombre) {
        super(id, correo, contrasena, nombre, 'admin');
        // El admin no tiene horarios fijos en esta etapa
    }
}

// 3. CLASES DE GESTIÓN (Transacciones)
class RegistroAsistencia {
    constructor(usuario_id, tipo_accion, timestamp) {
        this.usuario_id = usuario_id;
        this.tipo_accion = tipo_accion; // 'ENTRADA' o 'SALIDA'
        this.timestamp = timestamp;     // Objeto Date de JavaScript
    }
}

class LicenciaMedica {
    constructor(usuario_id, folio, rut, nombre_archivo) {
        this.usuario_id = usuario_id;
        this.folio = folio;
        this.rut = rut;
        this.nombre_archivo = nombre_archivo;
        this.estado = 'PENDIENTE'; // Estados: PENDIENTE, VERIFICADA, DUDOSA, RECHAZADA
        this.fecha_subida = new Date();
    }
}