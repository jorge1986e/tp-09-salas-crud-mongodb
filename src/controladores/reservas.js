// Lee parámetros, llama al servicio y responde (render, JSON, 404, redirect).
// Express 5 captura los errores de funciones async y los envía al middleware de errores.
function crearControladorReservas(servicioReservas) {
  function mostrarInicio(req, res) {
    res.render("inicio", { titulo: "Salas de estudio" });
  }

  async function mostrarEstado(req, res) {
    const cantidad = await servicioReservas.contar();

    res.json({
      servicio: "activo",
      reservas: cantidad,
      solicitudId: res.locals.solicitudId,
    });
  }

  // ---------- Sitio HTML ----------

  async function listarReservas(req, res) {
    const reservas = await servicioReservas.listar();

    res.render("reservas/lista", {
      titulo: "Reservas",
      reservas,
    });
  }

  function mostrarNuevaReserva(req, res) {
    const { salasPermitidas, turnosPermitidos } =
      servicioReservas.obtenerOpciones();

    res.render("reservas/nueva", {
      titulo: "Nueva reserva",
      salasPermitidas,
      turnosPermitidos,
      valores: {},
      errores: [],
    });
  }

  async function mostrarDetalleReserva(req, res) {
    // El id llega como texto: no se convierte con Number.
    const reserva = await servicioReservas.obtenerPorId(req.params.id);

    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "La reserva solicitada no existe.",
      });
    }

    return res.render("reservas/detalle", {
      titulo: "Detalle de reserva",
      reserva,
    });
  }

  async function crearReserva(req, res) {
    // Se espera la escritura antes de redirigir.
    await servicioReservas.crear(req.reservaValidada);
    res.redirect("/reservas");
  }

  // ---------- API JSON ----------

  async function listarApi(req, res) {
    // Si "sala" se repite, Express entrega un arreglo y el servicio lo rechaza (400).
    const reservas = await servicioReservas.listar(req.query.sala);
    res.json(reservas);
  }

  async function obtenerApi(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);

    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada." });
    }

    return res.json(reserva);
  }

  async function crearApi(req, res) {
    const reserva = await servicioReservas.crear(req.reservaValidada);

    // 201 y Location se envían después de guardar.
    res.status(201).location(`/api/reservas/${reserva.id}`).json(reserva);
  }

  async function reemplazarApi(req, res) {
    // Solo se envían los siete campos ya validados, nunca req.body completo.
    const reserva = await servicioReservas.reemplazar(
      req.params.id,
      req.cambiosValidos,
    );

    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada." });
    }

    return res.json(reserva);
  }

  async function actualizarApi(req, res) {
    const reserva = await servicioReservas.actualizar(
      req.params.id,
      req.cambiosValidos,
    );

    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada." });
    }

    return res.json(reserva);
  }

  async function eliminarApi(req, res) {
    const eliminada = await servicioReservas.eliminar(req.params.id);

    if (!eliminada) {
      return res.status(404).json({ error: "Reserva no encontrada." });
    }

    // 204: sin cuerpo.
    return res.status(204).end();
  }

  return {
    mostrarInicio,
    mostrarEstado,
    listarReservas,
    mostrarNuevaReserva,
    mostrarDetalleReserva,
    crearReserva,
    listarApi,
    obtenerApi,
    crearApi,
    reemplazarApi,
    actualizarApi,
    eliminarApi,
  };
}

module.exports = { crearControladorReservas };
