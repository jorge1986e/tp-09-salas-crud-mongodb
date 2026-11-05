const express = require("express");
const { validarActualizacion } = require("../middleware/cambios-reservas");

// Caminos relativos: el router se monta en /api/reservas desde app.js.
function crearRouterReservasApi(
  controladorReservas,
  validarReserva,
  validarReemplazo,
) {
  const router = express.Router();

  router.get("/", controladorReservas.listarApi);
  router.get("/:id", controladorReservas.obtenerApi);
  router.post("/", validarReserva, controladorReservas.crearApi);
  router.put("/:id", validarReemplazo, controladorReservas.reemplazarApi);
  router.patch("/:id", validarActualizacion, controladorReservas.actualizarApi);
  router.delete("/:id", controladorReservas.eliminarApi);

  return router;
}

module.exports = { crearRouterReservasApi };
