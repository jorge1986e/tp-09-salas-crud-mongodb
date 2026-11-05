// Convierte y valida las variables de entorno. No crea Express ni imprime secretos.
function leerConfiguracion(entorno = process.env) {
  const puerto = Number(entorno.PORT ?? 3000);

  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error(
      `PORT inválido ("${entorno.PORT}"): debe ser un entero entre 1 y 65535`,
    );
  }

  // Solo diferencia el formato de registro de Morgan.
  const formatoRegistro =
    entorno.NODE_ENV === "production" ? "combined" : "dev";

  return { puerto, formatoRegistro };
}

// Lee la URI de Atlas. Se lee al arrancar el servidor y en los programas de terminal:
// sin ella el servidor no arranca. Los mensajes nunca incluyen la URI.
function leerUriMongo(entorno = process.env) {
  const uri = entorno.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error("Falta MONGODB_URI en el entorno");
  }

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(
      "MONGODB_URI debe comenzar con mongodb:// o mongodb+srv://",
    );
  }

  return uri;
}

module.exports = { leerConfiguracion, leerUriMongo };
