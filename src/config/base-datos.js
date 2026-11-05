const dns = require("node:dns");
const mongoose = require("mongoose");
const { leerUriMongo } = require("./entorno");

// Corrección presentada en clase: Node resuelve los registros SRV/TXT de Atlas
// con estos resolutores. No cambia el DNS del sistema, la autenticación ni la
// lista de IPs permitidas. Se configura aquí una sola vez.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function conectarBaseDatos() {
  await mongoose.connect(leerUriMongo(), {
    serverSelectionTimeoutMS: 5000,
  });
}

// Es seguro llamarla aunque la conexión no se haya establecido.
async function desconectarBaseDatos() {
  await mongoose.disconnect();
}

module.exports = { conectarBaseDatos, desconectarBaseDatos };
