const express = require("express");

const { prepararAreaReservas } = require("../middleware/reservas");

// Caminos relativos: el router se monta en /reservas desde app.js.
function crearRouterReservas(controladorReservas, validarReserva) {
  const router = express.Router();

  router.use(prepararAreaReservas);

  router.get("/", controladorReservas.listarReservas);
  // "/nueva" va antes de "/:id", si no Express la tomaría como un id.
  router.get("/nueva", controladorReservas.mostrarNuevaReserva);
  router.get("/:id", controladorReservas.mostrarDetalleReserva);
  router.post("/", validarReserva, controladorReservas.crearReserva);

  return router;
}

module.exports = { crearRouterReservas };
