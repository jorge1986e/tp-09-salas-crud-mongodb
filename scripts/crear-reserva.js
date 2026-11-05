const mongoose = require("mongoose");
const {
  conectarBaseDatos,
  desconectarBaseDatos,
} = require("../src/config/base-datos");
const { Reserva } = require("../src/modelos/reserva");

// Datos ficticios fijos. Cada ejecución crea un documento nuevo,
// aunque los campos sean idénticos (no hay índice único todavía).
const datosReserva = {
  estudiante: "Estudiante de Prueba",
  email: "estudiante@ejemplo.com",
  sala: "Sala Sur",
  fecha: "30-10-2026",
  turno: "Tarde",
  personas: 4,
};

async function main() {
  try {
    await conectarBaseDatos();
    const reserva = await Reserva.create(datosReserva);
    // Este mensaje se imprime solo después de que MongoDB confirmó la escritura.
    console.log("Reserva guardada. _id:", reserva._id.toString());
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      console.error("Reserva rechazada por validación (no se guardó).");
      for (const [campo, detalle] of Object.entries(error.errors)) {
        console.error(`- ${campo}: ${detalle.message}`);
      }
    } else {
      console.error("No se pudo crear la reserva.");
      console.error("Nombre del error:", error.name);
      console.error("Revisar configuración y conexión con MongoDB.");
    }
    process.exitCode = 1;
  } finally {
    await desconectarBaseDatos();
  }
}

main();
