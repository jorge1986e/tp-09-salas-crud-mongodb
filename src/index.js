const { leerConfiguracion } = require("./config/entorno");
const {
  conectarBaseDatos,
  desconectarBaseDatos,
} = require("./config/base-datos");
const { crearServicioReservasMongo } = require("./servicios/reservas-mongo");
const { salasPermitidas, turnosPermitidos } = require("./modelos/reserva");
const { crearApp } = require("./app");

async function main() {
  const { puerto, formatoRegistro } = leerConfiguracion();

  // La conexión se espera ANTES de escuchar y se mantiene entre solicitudes.
  await conectarBaseDatos();

  const servicioReservas = crearServicioReservasMongo({
    salasPermitidas,
    turnosPermitidos,
  });

  const app = crearApp({ servicioReservas, formatoRegistro });

  // En Express 5 el callback recibe el error si no se pudo escuchar el puerto.
  const servidor = app.listen(puerto, (error) => {
    if (error) {
      console.error("No se pudo escuchar el puerto:", error.code ?? error.name);
      process.exitCode = 1;
      desconectarBaseDatos().catch((fallo) => {
        console.error("Error al cerrar la conexión:", fallo.name);
      });
      return;
    }

    console.log(`Aplicación escuchando en http://localhost:${puerto}`);
  });

  // Cierre ordenado: primero deja de aceptar solicitudes, después cierra MongoDB.
  let cerrando = false;

  function cerrar() {
    if (cerrando) return;
    cerrando = true;

    servidor.close(async () => {
      try {
        await desconectarBaseDatos();
        console.log("Servidor y conexión cerrados.");
      } catch (error) {
        console.error("Error al cerrar la conexión:", error.name);
        process.exitCode = 1;
      }
    });
    servidor.closeIdleConnections();
  }

  process.once("SIGINT", cerrar);
  process.once("SIGTERM", cerrar);
}

main().catch(async (error) => {
  // No se imprime la URI: solo el nombre del error y pistas de diagnóstico.
  console.error("No se pudo iniciar la aplicación:", error.name);
  console.error("Revisar entorno (.env), DNS, red, acceso de Atlas y puerto.");
  process.exitCode = 1;

  try {
    await desconectarBaseDatos();
  } catch (fallo) {
    console.error("Error al cerrar la conexión:", fallo.name);
  }
});
