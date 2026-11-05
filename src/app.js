const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");
const path = require("node:path");

const {
  crearIdentificadorSolicitud,
  medirDuracion,
} = require("./middleware/solicitudes");
const { crearValidadorReserva } = require("./middleware/reservas");
const { crearValidadorReemplazo } = require("./middleware/cambios-reservas");
const { crearManejadorErrores, esRutaApi } = require("./middleware/errores");
const { crearControladorReservas } = require("./controladores/reservas");
const { crearRouterReservas } = require("./rutas/reservas");
const { crearRouterReservasApi } = require("./rutas/reservas-api");

// Crea la aplicación Express con todas sus rutas y middleware.
function crearApp({ servicioReservas, formatoRegistro }) {
  const app = express();
  const controladorReservas = crearControladorReservas(servicioReservas);
  const validarReserva = crearValidadorReserva(servicioReservas);
  const validarReemplazo = crearValidadorReemplazo(servicioReservas);

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));
  app.set("layout", "layouts/main");

  // Pipeline global (el orden importa)
  app.use(morgan(formatoRegistro));
  app.use(crearIdentificadorSolicitud());
  app.use(medirDuracion);
  app.use(expressLayouts);
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // Sitio HTML
  app.get("/", controladorReservas.mostrarInicio);
  app.get("/estado", controladorReservas.mostrarEstado);
  app.use(
    "/reservas",
    crearRouterReservas(controladorReservas, validarReserva),
  );

  // API JSON (mismo servicio que el sitio)
  app.use(
    "/api/reservas",
    crearRouterReservasApi(
      controladorReservas,
      validarReserva,
      validarReemplazo,
    ),
  );

  // Última parada: cualquier URL que nadie atendió. La API responde JSON.
  app.use((req, res) => {
    if (esRutaApi(req)) {
      return res.status(404).json({ error: "Ruta no encontrada." });
    }

    return res.status(404).render("no-encontrado", {
      titulo: "Página no encontrada",
      mensaje: "La dirección solicitada no existe.",
    });
  });

  // Middleware de errores: va después de las rutas y tiene cuatro parámetros.
  const { salasPermitidas, turnosPermitidos } =
    servicioReservas.obtenerOpciones();

  app.use(crearManejadorErrores({ salasPermitidas, turnosPermitidos }));

  return app;
}

module.exports = { crearApp };
