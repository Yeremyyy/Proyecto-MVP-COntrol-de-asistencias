/* =========================================
   SISTEMA CORE: CLASES Y ARQUITECTURA POO
========================================= */

// 1. CLASE PADRE (Superclase)
class Usuario {
    constructor(id, nombre, apellidoPaterno, apellidoMaterno, rut, telefono, direccion, correo, contrasena, horaEntrada, horaSalida, rol) {
        this.id = id;
        this.nombre = nombre;
        this.apellido_paterno = apellidoPaterno;
        this.apellido_materno = apellidoMaterno;
        this.rut = rut;
        this.telefono = telefono;
        this.direccion = direccion;
        this.correo = correo;
        this.contrasena = contrasena;
        this.hora_entrada = horaEntrada;
        this.hora_salida = horaSalida;
        this.rol = rol;
    }

    get nombre_completo() {
        return [this.nombre, this.apellido_paterno, this.apellido_materno].filter(Boolean).join(' ');
    }
}

// 2. CLASES HIJAS (Herencia)
class Empleado extends Usuario {
    constructor(id, nombre, apellidoPaterno, apellidoMaterno, rut, telefono, direccion, correo, contrasena, horaEntrada, horaSalida) {
        super(id, nombre, apellidoPaterno, apellidoMaterno, rut, telefono, direccion, correo, contrasena, horaEntrada, horaSalida, 'empleado');
    }
}

class Administrador extends Usuario {
    constructor(id, nombre, apellidoPaterno, apellidoMaterno, rut, telefono, direccion, correo, contrasena, horaEntrada, horaSalida) {
        super(id, nombre, apellidoPaterno, apellidoMaterno, rut, telefono, direccion, correo, contrasena, horaEntrada, horaSalida, 'admin');
    }
}

class RecursosHumanos extends Usuario {
    constructor(id, nombre, apellidoPaterno, apellidoMaterno, rut, telefono, direccion, correo, contrasena, horaEntrada, horaSalida) {
        super(id, nombre, apellidoPaterno, apellidoMaterno, rut, telefono, direccion, correo, contrasena, horaEntrada, horaSalida, 'rrhh');
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
