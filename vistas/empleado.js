
// Variable para recordar qué día está abierto
let fechaSeleccionada = null; 

function renderizarCalendarioEmpleado() {
    const contenedorCalendario = document.getElementById('calendario-empleado');
    if (!contenedorCalendario) return;

    contenedorCalendario.innerHTML = '';

    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth(); 

    const diasSemana = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
    diasSemana.forEach(d => {
        const headerDia = document.createElement('div');
        headerDia.textContent = d;
        headerDia.style.fontWeight = 'bold';
        headerDia.style.fontSize = '0.75rem';
        headerDia.style.color = '#555';
        contenedorCalendario.appendChild(headerDia);
    });

    const totalDiasMes = new Date(año, mes + 1, 0).getDate();

    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const celda = document.createElement('div');
        celda.textContent = dia;
        celda.style.padding = '10px 0';
        celda.style.fontSize = '0.85rem';
        celda.style.cursor = 'pointer';
        celda.style.border = '1px solid #e0e0e0';
        // Agregamos una transición suave para cuando el usuario haga clic
        celda.style.transition = 'transform 0.1s ease-in-out, background-color 0.2s';

        const fechaStr = `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        
        const asistenciaDia = registrosAsistencia.find(reg => {
            const regFecha = reg.timestamp.toISOString().split('T')[0];
            return reg.usuario_id === usuarioActual.id && regFecha === fechaStr && reg.tipo_accion === 'ENTRADA';
        });

        const esDiaPasado = new Date(fechaStr) <= new Date();

        if (asistenciaDia) {
            // Días asistidos (Verde)
            celda.style.backgroundColor = '#d1e7dd';
            celda.style.color = '#0f5132';
            celda.title = 'Asistencia registrada';
            celda.addEventListener('click', () => ocultarFormulario());
            
        } else if (esDiaPasado && dia < hoy.getDate()) {
            // Días inasistentes (Rojo)
            celda.style.backgroundColor = '#f8d7da';
            celda.style.color = '#842029';
            celda.title = 'Inasistencia - Clic para justificar';

            // LÓGICA DE TOGGLE Y ANIMACIÓN
            celda.addEventListener('click', () => {
                // Pequeño rebote visual al hacer clic
                celda.style.transform = 'scale(0.90)';
                setTimeout(() => celda.style.transform = 'scale(1)', 100);

                const form = document.getElementById('contenedor-formulario-fecha');
                
                if (fechaSeleccionada === fechaStr) {
                    // Si toca el mismo día que ya está abierto, lo cierra
                    ocultarFormulario();
                } else {
                    // Si toca un día nuevo, abre el form con transición
                    fechaSeleccionada = fechaStr;
                    form.style.display = 'block';
                    
                    // Animación de aparición (Fade In)
                    form.style.opacity = '0';
                    form.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => form.style.opacity = '1', 10);
                    
                    document.getElementById('titulo-fecha-seleccionada').textContent = `Justificar inasistencia del día: ${fechaStr}`;
                    document.getElementById('fecha-objetivo').value = fechaStr;
                }
            });
        } else {
            // Días futuros (Gris)
            celda.style.backgroundColor = '#f8f9fa';
            celda.style.color = '#6c757d';
            celda.addEventListener('click', () => ocultarFormulario());
        }

        contenedorCalendario.appendChild(celda);
    }
}

// Función auxiliar para cerrar el formulario con animación
function ocultarFormulario() {
    const form = document.getElementById('contenedor-formulario-fecha');
    if (form.style.display === 'block') {
        form.style.opacity = '0';
        // Espera a que termine la animación antes de quitarlo del HTML
        setTimeout(() => {
            form.style.display = 'none';
            fechaSeleccionada = null;
        }, 300);
    }
}

// Lógica del motor OCR simulado
const formularioJustificacionCalendario = document.getElementById('formulario-justificacion-calendario');
if (formularioJustificacionCalendario) {
    formularioJustificacionCalendario.addEventListener('submit', (evento) => {
        evento.preventDefault();
        
        const archivoInput = document.getElementById('archivo-licencia-calendario');
        const fechaObjetivo = document.getElementById('fecha-objetivo').value;
        const mensajeValidacion = document.getElementById('mensaje-validacion-calendario');
        
        if (archivoInput.files.length === 0) return;

        mensajeValidacion.textContent = "Analizando documento con motor OCR...";
        mensajeValidacion.style.color = "#666";

        setTimeout(() => {
            const folioExtraido = "FOL-" + Math.floor(Math.random() * 90000 + 10000);
            
            mensajeValidacion.textContent = `Documento validado para el ${fechaObjetivo} (Folio: ${folioExtraido}). Enviado a RRHH.`;
            mensajeValidacion.style.color = "#198754"; 

            setTimeout(() => {
                formularioJustificacionCalendario.reset();
                ocultarFormulario(); // Usamos la nueva función para cerrarlo suavemente
                mensajeValidacion.textContent = "";
            }, 4000);

        }, 2000); 
    });
}