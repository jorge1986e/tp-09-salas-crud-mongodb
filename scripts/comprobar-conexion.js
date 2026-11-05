const {
  conectarBaseDatos,
  desconectarBaseDatos,
} = require("../src/config/base-datos");
const { leerUriMongo } = require("../src/config/entorno");

const codigosDns = [
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEOUT",
  "ESERVFAIL",
  "EAI_AGAIN",
];

// Muestra solo nombre, código y operación: nunca la URI ni el mensaje completo.
function diagnosticar(error) {
  console.error("No se pudo completar la conexión.");
  console.error("Nombre del error:", error.name);

  if (codigosDns.includes(error.code)) {
    console.error("Código DNS/red:", error.code);
  }
  if (error.syscall === "querySrv" || error.syscall === "queryTxt") {
    console.error("Operación de resolución:", error.syscall);
    console.error("Diagnóstico: falla DNS. Revisar red y resolutores.");
    return;
  }
  if (error.name === "MongoServerError" && error.code === 18) {
    console.error(
      "Diagnóstico: autenticación rechazada. Revisar usuario y clave.",
    );
    return;
  }
  if (error.name === "MongoServerSelectionError") {
    console.error(
      "Diagnóstico: no se alcanzó el servidor. Revisar la IP permitida en Atlas y la red.",
    );
    return;
  }
  console.error("Diagnóstico: revisar MONGODB_URI, servidor, red y permisos.");
}

async function main() {
  // 1) Configuración: falla antes de intentar conectar.
  try {
    leerUriMongo();
  } catch (error) {
    console.error("Fallo de configuración:", error.message);
    process.exitCode = 1;
    return;
  }

  // 2) Conexión: no se anuncia éxito hasta que termina de conectar.
  try {
    await conectarBaseDatos();
    console.log("Conexión con MongoDB establecida");
  } catch (error) {
    diagnosticar(error);
    process.exitCode = 1;
  } finally {
    await desconectarBaseDatos();
  }
}

main();
