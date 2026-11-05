// Middleware globales: identificador consecutivo y medición hasta "finish".
function crearIdentificadorSolicitud() {
  let totalSolicitudes = 0;

  return function identificarSolicitud(req, res, next) {
    totalSolicitudes += 1;
    res.locals.solicitudId = `BIB-${String(totalSolicitudes).padStart(4, "0")}`;
    next();
  };
}

function medirDuracion(req, res, next) {
  const inicio = process.hrtime.bigint();

  res.on("finish", () => {
    const fin = process.hrtime.bigint();
    const ms = Number(fin - inicio) / 1_000_000;
    console.log(
      `[${res.locals.solicitudId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(2)} ms)`,
    );
  });

  next();
}

module.exports = { crearIdentificadorSolicitud, medirDuracion };
