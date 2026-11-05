const {
  conectarBaseDatos,
  desconectarBaseDatos,
} = require("../src/config/base-datos");
const { Reserva } = require("../src/modelos/reserva");

async function main() {
  try {
    await conectarBaseDatos();
    const reservas = await Reserva.find({});

    // Solo lectura: no crea, no borra y no carga semillas.
    for (const reserva of reservas) {
      console.log(
        `${reserva._id.toString()} | ${reserva.estudiante} | ${reserva.email} | ` +
          `${reserva.sala} | ${reserva.fecha} | ${reserva.turno} | ${reserva.personas} personas | ${reserva.estado}`,
      );
    }
    console.log("Cantidad de reservas:", reservas.length);
  } catch (error) {
    console.error("No se pudo consultar las reservas.");
    console.error("Nombre del error:", error.name);
    console.error("Revisar configuración y conexión con MongoDB.");
    process.exitCode = 1;
  } finally {
    await desconectarBaseDatos();
  }
}

main();
