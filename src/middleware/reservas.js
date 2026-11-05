// Middleware de router: solo corre para rutas montadas bajo /reservas.
function prepararAreaReservas(req, res, next) {
  res.locals.seccion = "Reservas de salas";
  next();
}

const camposPost = [
  "estudiante",
  "email",
  "sala",
  "fecha",
  "turno",
  "personas",
];

function esObjetoPlano(valor) {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

// Texto recortado; cualquier otro tipo (número, booleano, arreglo, objeto) cuenta como vacío.
function leerTexto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

// Para volver a mostrar el formulario: solo textos y números, nunca objetos.
function valorParaFormulario(valor) {
  return typeof valor === "string" || typeof valor === "number"
    ? String(valor)
    : "";
}

// La API recibe JSON: personas debe ser un número. El formulario HTML envía texto
// y solo se aceptan dígitos (así "2.5", "abc" o "1e0" no se convierten).
function leerPersonas(valor, esApi) {
  if (esApi) {
    return typeof valor === "number" ? valor : NaN;
  }

  if (typeof valor === "string" && /^\d+$/.test(valor.trim())) {
    return Number(valor.trim());
  }

  return NaN;
}

// Middleware de ruta: valida el cuerpo del POST (formulario HTML o API JSON).
function crearValidadorReserva(servicioReservas) {
  return function validarReserva(req, res, next) {
    const { salasPermitidas, turnosPermitidos } =
      servicioReservas.obtenerOpciones();

    const esApi = req.baseUrl === "/api/reservas";

    // Sin parser aplicable (cuerpo ausente o texto plano) req.body es undefined.
    const cuerpo = esObjetoPlano(req.body) ? req.body : {};

    const datos = {
      estudiante: leerTexto(cuerpo.estudiante),
      email: leerTexto(cuerpo.email),
      sala: leerTexto(cuerpo.sala),
      fecha: leerTexto(cuerpo.fecha),
      turno: leerTexto(cuerpo.turno),
      personas: leerPersonas(cuerpo.personas, esApi),
    };

    const errores = [];

    // En la API el cliente no puede asignar estado ni _id (ni ningún otro campo
    // fuera de los seis). El formulario HTML solo envía sus propios campos.
    if (esApi) {
      for (const campo of Object.keys(cuerpo)) {
        if (!camposPost.includes(campo)) {
          errores.push(`El campo ${campo} no se puede enviar en el POST.`);
        }
      }
    }

    if (!esObjetoPlano(req.body)) {
      errores.push(
        "Falta el cuerpo de la solicitud o no tiene un formato válido.",
      );
    }

    if (!datos.estudiante) {
      errores.push("El nombre del estudiante es obligatorio.");
    }

    if (!datos.email) {
      errores.push("El email es obligatorio.");
    } else if (!datos.email.includes("@")) {
      errores.push("El email debe contener un @.");
    }

    if (!datos.fecha) {
      errores.push("La fecha es obligatoria.");
    }

    if (!salasPermitidas.includes(datos.sala)) {
      errores.push("Elegí una de las salas disponibles.");
    }

    if (!turnosPermitidos.includes(datos.turno)) {
      errores.push("Elegí uno de los turnos disponibles.");
    }

    if (
      !Number.isInteger(datos.personas) ||
      datos.personas < 1 ||
      datos.personas > 6
    ) {
      errores.push(
        "La cantidad de personas debe ser un número entero entre 1 y 6.",
      );
    }

    if (errores.length > 0) {
      if (esApi) {
        return res.status(400).json({
          error: "Los datos de la reserva no son válidos.",
          detalles: errores,
        });
      }

      return res.status(400).render("reservas/nueva", {
        titulo: "Nueva reserva",
        salasPermitidas,
        turnosPermitidos,
        valores: {
          estudiante: valorParaFormulario(cuerpo.estudiante),
          email: valorParaFormulario(cuerpo.email),
          sala: valorParaFormulario(cuerpo.sala),
          fecha: valorParaFormulario(cuerpo.fecha),
          turno: valorParaFormulario(cuerpo.turno),
          personas: valorParaFormulario(cuerpo.personas),
        },
        errores,
      });
    }

    // Solo los seis campos admitidos; el estado lo asigna el modelo (pendiente).
    req.reservaValidada = datos;

    return next();
  };
}

module.exports = {
  prepararAreaReservas,
  crearValidadorReserva,
  esObjetoPlano,
  leerTexto,
};
