// Lógica de datos en memoria. No conoce req, res, EJS ni códigos HTTP.
function crearServicioReservas({
  reservasIniciales = [],
  salasPermitidas = [],
  turnosPermitidos = [],
} = {}) {
  // Único arreglo de reservas de toda la aplicación (privado del servicio).
  const reservas = reservasIniciales.map((reserva) => ({ ...reserva }));
  let siguienteId = Math.max(0, ...reservas.map((reserva) => reserva.id)) + 1;

  function listar() {
    return [...reservas];
  }

  function obtenerPorId(id) {
    return reservas.find((reserva) => reserva.id === id);
  }

  function contar() {
    return reservas.length;
  }

  function crear(datos) {
    const nuevaReserva = { id: siguienteId, ...datos };
    siguienteId += 1;
    reservas.push(nuevaReserva);
    return nuevaReserva;
  }

  function obtenerOpciones() {
    return {
      salasPermitidas: [...salasPermitidas],
      turnosPermitidos: [...turnosPermitidos],
    };
  }

  return { listar, obtenerPorId, contar, crear, obtenerOpciones };
}

module.exports = { crearServicioReservas };
