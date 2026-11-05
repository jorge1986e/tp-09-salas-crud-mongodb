// Servicio persistente: habla con Mongoose. No conoce req, res, EJS ni códigos HTTP.
const mongoose = require("mongoose");
const { Reserva } = require("../modelos/reserva");

// Convierte un documento de Mongo en un objeto simple para las vistas y la API.
// El _id (ObjectId) pasa a ser un texto llamado "id".
function representarReserva(documento) {
  return {
    id: documento._id.toString(),
    estudiante: documento.estudiante,
    email: documento.email,
    sala: documento.sala,
    fecha: documento.fecha,
    turno: documento.turno,
    personas: documento.personas,
    estado: documento.estado,
  };
}

function crearError(mensaje, codigo) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
}

// Un ID mal formado es un error de entrada (400), no un recurso ausente (404).
function comprobarId(id) {
  if (typeof id !== "string" || !mongoose.isObjectIdOrHexString(id)) {
    throw crearError("Identificador inválido", "ID_INVALIDO");
  }
}

function crearServicioReservasMongo({
  salasPermitidas = [],
  turnosPermitidos = [],
} = {}) {
  // sala es opcional. Si llega, debe ser un texto no vacío (no un arreglo ni un objeto).
  async function listar(sala) {
    const filtro = {};

    if (sala !== undefined) {
      if (typeof sala !== "string" || sala.trim() === "") {
        throw crearError("Filtro de sala inválido", "FILTRO_INVALIDO");
      }
      filtro.sala = sala;
    }

    const documentos = await Reserva.find(filtro).lean();
    return documentos.map(representarReserva);
  }

  // Devuelve la reserva o null si no existe. Un ID mal formado es un error de entrada.
  async function obtenerPorId(id) {
    comprobarId(id);

    const documento = await Reserva.findById(id).lean();
    return documento ? representarReserva(documento) : null;
  }

  // Se copian solo los seis campos admitidos: nunca "datos" completo.
  async function crear(datos) {
    const documento = await Reserva.create({
      estudiante: datos.estudiante,
      email: datos.email,
      sala: datos.sala,
      fecha: datos.fecha,
      turno: datos.turno,
      personas: datos.personas,
    });

    return representarReserva(documento);
  }

  async function contar() {
    return Reserva.countDocuments();
  }

  function obtenerOpciones() {
    return {
      salasPermitidas: [...salasPermitidas],
      turnosPermitidos: [...turnosPermitidos],
    };
  }

  // PUT: reemplazo completo con los siete campos editables. El _id se conserva
  // porque el filtro lo fija. upsert:false: un ID ausente no crea nada (null).
  async function reemplazar(id, datos) {
    comprobarId(id);

    const documento = await Reserva.findOneAndReplace(
      { _id: id },
      {
        estudiante: datos.estudiante,
        email: datos.email,
        sala: datos.sala,
        fecha: datos.fecha,
        turno: datos.turno,
        personas: datos.personas,
        estado: datos.estado,
      },
      { returnDocument: "after", runValidators: true, upsert: false },
    );

    return documento ? representarReserva(documento) : null;
  }

  // PATCH: solo personas y estado, con al menos uno. El $set se arma campo por
  // campo con una lista cerrada: nunca se pasa el cuerpo completo.
  async function actualizar(id, datos) {
    comprobarId(id);

    const cambios = {};
    for (const campo of ["personas", "estado"]) {
      if (Object.hasOwn(datos, campo)) {
        cambios[campo] = datos[campo];
      }
    }

    if (Object.keys(cambios).length === 0) {
      throw crearError("Actualización vacía", "ENTRADA_INVALIDA");
    }

    const documento = await Reserva.findOneAndUpdate(
      { _id: id },
      { $set: cambios },
      { returnDocument: "after", runValidators: true, upsert: false },
    );

    return documento ? representarReserva(documento) : null;
  }

  // Borrado físico de un solo documento. true si lo eliminó, false si no existía.
  async function eliminar(id) {
    comprobarId(id);

    const resultado = await Reserva.deleteOne({ _id: id });
    return resultado.deletedCount === 1;
  }

  return {
    listar,
    obtenerPorId,
    crear,
    reemplazar,
    actualizar,
    eliminar,
    contar,
    obtenerOpciones,
  };
}

module.exports = { crearServicioReservasMongo };
