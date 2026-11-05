// Validación de PUT y PATCH en la API. Solo responde 400 JSON o deja el
// resultado en req.cambiosValidos; no toca la base de datos.
const { esObjetoPlano, leerTexto } = require("./reservas");

const camposPut = [
  "estudiante",
  "email",
  "sala",
  "fecha",
  "turno",
  "personas",
  "estado",
];
const camposPatch = ["personas", "estado"];
const estadosPermitidos = ["pendiente", "confirmada"];

function rechazar(res, errores) {
  return res.status(400).json({
    error: "Los datos de la reserva no son válidos.",
    detalles: errores,
  });
}

// Personas llega como número o como texto numérico no vacío. Después se
// comprueban finitud, entero y rango. Booleanos, null, arreglos y objetos
// no son números.
function leerPersonas(valor) {
  if (typeof valor === "number") {
    return valor;
  }

  if (typeof valor === "string" && valor.trim() !== "") {
    return Number(valor.trim());
  }

  return NaN;
}

function personasValidas(personas) {
  return (
    Number.isFinite(personas) &&
    Number.isInteger(personas) &&
    personas >= 1 &&
    personas <= 6
  );
}

// Cuerpo ausente, arreglo o texto plano: req.body no es un objeto.
// Campos desconocidos, _id u operadores ($set, $inc...): no están en la lista.
function validarCuerpo(cuerpo, camposAdmitidos) {
  if (!esObjetoPlano(cuerpo)) {
    return ["Falta el cuerpo de la solicitud o no es un objeto JSON."];
  }

  return Object.keys(cuerpo)
    .filter((campo) => !camposAdmitidos.includes(campo))
    .map((campo) => `El campo ${campo} no se puede enviar en esta solicitud.`);
}

function validarEstado(estado) {
  return estadosPermitidos.includes(estado);
}

// PUT: exige los siete campos editables. No completa faltantes con defaults.
function crearValidadorReemplazo(servicioReservas) {
  return function validarReemplazo(req, res, next) {
    const { salasPermitidas, turnosPermitidos } =
      servicioReservas.obtenerOpciones();

    const errores = validarCuerpo(req.body, camposPut);

    if (errores.length > 0) {
      return rechazar(res, errores);
    }

    const cuerpo = req.body;

    for (const campo of camposPut) {
      if (!Object.hasOwn(cuerpo, campo)) {
        errores.push(`Falta el campo ${campo}.`);
      }
    }

    if (errores.length > 0) {
      return rechazar(res, errores);
    }

    const datos = {
      estudiante: leerTexto(cuerpo.estudiante),
      email: leerTexto(cuerpo.email),
      sala: leerTexto(cuerpo.sala),
      fecha: leerTexto(cuerpo.fecha),
      turno: leerTexto(cuerpo.turno),
      personas: leerPersonas(cuerpo.personas),
      estado: cuerpo.estado,
    };

    if (!datos.estudiante) {
      errores.push("El nombre del estudiante es obligatorio.");
    }

    if (!datos.email) {
      errores.push("El email es obligatorio.");
    } else if (!datos.email.includes("@")) {
      errores.push("El email debe contener un @.");
    }

    if (!salasPermitidas.includes(datos.sala)) {
      errores.push("Elegí una de las salas disponibles.");
    }

    if (!datos.fecha) {
      errores.push("La fecha es obligatoria.");
    }

    if (!turnosPermitidos.includes(datos.turno)) {
      errores.push("Elegí uno de los turnos disponibles.");
    }

    if (!personasValidas(datos.personas)) {
      errores.push(
        "La cantidad de personas debe ser un número entero entre 1 y 6.",
      );
    }

    if (!validarEstado(datos.estado)) {
      errores.push("El estado debe ser pendiente o confirmada.");
    }

    if (errores.length > 0) {
      return rechazar(res, errores);
    }

    req.cambiosValidos = datos;
    return next();
  };
}

// PATCH: solo personas y estado, con al menos uno presente.
function validarActualizacion(req, res, next) {
  const errores = validarCuerpo(req.body, camposPatch);

  if (errores.length > 0) {
    return rechazar(res, errores);
  }

  const cuerpo = req.body;
  const cambios = {};

  if (!camposPatch.some((campo) => Object.hasOwn(cuerpo, campo))) {
    return rechazar(res, ["Enviá personas, estado o ambos."]);
  }

  if (Object.hasOwn(cuerpo, "personas")) {
    const personas = leerPersonas(cuerpo.personas);

    if (personasValidas(personas)) {
      cambios.personas = personas;
    } else {
      errores.push(
        "La cantidad de personas debe ser un número entero entre 1 y 6.",
      );
    }
  }

  if (Object.hasOwn(cuerpo, "estado")) {
    if (validarEstado(cuerpo.estado)) {
      cambios.estado = cuerpo.estado;
    } else {
      errores.push("El estado debe ser pendiente o confirmada.");
    }
  }

  if (errores.length > 0) {
    return rechazar(res, errores);
  }

  req.cambiosValidos = cambios;
  return next();
}

module.exports = { crearValidadorReemplazo, validarActualizacion };
