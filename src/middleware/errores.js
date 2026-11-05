// Las rutas /api y /api/... responden siempre JSON.
function esRutaApi(req) {
  return req.path === "/api" || req.path.startsWith("/api/");
}

function crearManejadorErrores({ salasPermitidas, turnosPermitidos }) {
  // Express reconoce un middleware de errores por sus CUATRO parámetros.
  return function manejarErrores(error, req, res, next) {
    if (res.headersSent) {
      return next(error);
    }

    const esValidacion = error.name === "ValidationError";
    const esJsonInvalido = error.type === "entity.parse.failed";

    const esEntrada =
      esValidacion ||
      esJsonInvalido ||
      error.codigo === "ID_INVALIDO" ||
      error.codigo === "FILTRO_INVALIDO" ||
      error.codigo === "ENTRADA_INVALIDA";

    const estado = esEntrada ? 400 : 500;

    let mensaje = esEntrada
      ? "Revisá los datos enviados."
      : "No se pudo completar la operación.";

    if (esJsonInvalido) {
      mensaje = "El cuerpo de la solicitud contiene un JSON inválido.";
    } else if (error.codigo === "ID_INVALIDO") {
      mensaje = "El identificador debe tener 24 caracteres hexadecimales.";
    } else if (error.codigo === "FILTRO_INVALIDO") {
      mensaje = "El filtro de sala debe ser un único texto no vacío.";
    }

    // Diagnóstico sin secretos: solo identificador de solicitud y nombre del error.
    console.error("Solicitud fallida:", res.locals.solicitudId, error.name);

    if (esRutaApi(req)) {
      return res.status(estado).json({
        error: mensaje,
        campos: esValidacion ? Object.keys(error.errors) : [],
      });
    }

    // Validación del modelo durante un POST del formulario: se vuelve a mostrar.
    if (esValidacion && req.method === "POST") {
      return res.status(400).render("reservas/nueva", {
        titulo: "Nueva reserva",
        salasPermitidas,
        turnosPermitidos,
        valores: {},
        errores: Object.values(error.errors).map((detalle) => detalle.message),
      });
    }

    return res.status(estado).render("no-encontrado", {
      titulo: esEntrada ? "Solicitud inválida" : "Error del servicio",
      mensaje,
      codigo: estado,
    });
  };
}

module.exports = { crearManejadorErrores, esRutaApi };
