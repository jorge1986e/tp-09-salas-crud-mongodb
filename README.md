# Trabajo práctico 09 - Actualización y eliminación de reservas de salas

Reservas de salas de estudio (Express 5 + EJS) con persistencia en MongoDB Atlas mediante Mongoose. Completa el CRUD: además de crear y leer, la API permite **reemplazar** (`PUT`), **modificar parcialmente** (`PATCH`) y **eliminar** (`DELETE`) una reserva. El sitio HTML y la API JSON usan **el mismo servicio asíncrono** y leen los mismos documentos.

## 1. Origen de la copia

Copia funcional del TP 08 (`tp-08-salas-http-mongodb`), renombrada `tp-09-salas-crud-mongodb`. El TP 08 se conserva intacto en su propia carpeta. No se copiaron historial Git, `node_modules` ni `.env`. Se copiaron fuentes, manifiesto, lockfile y configuración de calidad; las dependencias y el `.env` se prepararon en esta copia.

## 2. Versiones

| Elemento | Versión |
| --- | --- |
| Node.js | _completar con `node -v` (requerido: >=22.13.0)_ |
| npm | _completar con `npm -v`_ |
| express | ^5.2.1 |
| ejs | ^6.0.1 |
| express-ejs-layouts | ^2.5.1 |
| mongoose | ^9.11.4 |
| morgan | ^1.12.1 |
| eslint / prettier | ^10.12.0 / ^3.9.10 |

El proyecto usa módulos CommonJS.

## 3. Preparación de Atlas

1. Clúster **Atlas Free (M0)** (se reutiliza el de las clases).
2. En _Database Access_: usuario con permiso de lectura y escritura sobre `reservas_salas_u9`.
3. En _Network Access_: permitir la IP desde la que se ejecuta el programa.
4. En _Connect → Drivers → Node.js_: copiar la URI `mongodb+srv://...`.
5. Base `reservas_salas_u9`, colección `reservas` (Mongoose la crea al guardar la primera reserva).


## 4. Entorno, DNS y arranque

```
npm install
cp .env.example .env
```

En `.env`, reemplazar `USUARIO`, `CLAVE` y `HOST` por datos reales y conservar la base `reservas_salas_u9` y las opciones `?retryWrites=true&w=majority`. `HOST` es un marcador: no permite conectar. **El `.env` no se entrega** (está en `.gitignore`).

Variables: `PORT`, `NODE_ENV` y `MONGODB_URI`.

**DNS.** En `src/config/base-datos.js` se ejecuta una sola vez `dns.setServers(["8.8.8.8", "1.1.1.1"])` (ajuste autorizado para resolver los registros SRV/TXT de Atlas). No cambia el DNS del sistema, la autenticación ni la lista de IPs.

**Comando de inicio:**

```
npm run start:local        # equivale a: node --env-file=.env src/index.js
```

El arranque lee el entorno, **espera la conexión a MongoDB** y recién entonces escucha el puerto. La conexión se mantiene entre solicitudes. No se inserta ningún dato al iniciar ni al consultar. Con `SIGINT` o `SIGTERM` (Ctrl+C) se cierra el servidor HTTP y luego la conexión.

Otros comandos:

| Tarea | Comando |
| --- | --- |
| Probar conexión | `node --env-file=.env scripts/comprobar-conexion.js` |
| Crear una reserva (terminal) | `npm run crear` |
| Listar reservas (terminal, incluye `estado`) | `npm run listar` |
| Formatear / verificar | `npm run format` / `npm run check` |

Los programas de terminal cierran la conexión al terminar.

## 5. Estructura por capas

```
src/
├── index.js                  # arranque: entorno -> conexión -> listen -> cierre ordenado
├── app.js                    # Express, middleware, routers, 404 y errores
├── config/                   # entorno.js, base-datos.js (conexión y DNS)
├── modelos/reserva.js        # esquema Mongoose (reglas del documento)
├── servicios/
│   ├── reservas-mongo.js     # servicio asíncrono ACTIVO: listar, obtenerPorId, crear,
│   │                         #   reemplazar, actualizar, eliminar, contar
│   └── reservas.js           # servicio en memoria del TP 07 (solo referencia, no se importa)
├── controladores/reservas.js # HTML y API; usan await
├── rutas/
│   ├── reservas.js           # router HTML (/reservas)
│   └── reservas-api.js       # router API (/api/reservas)
├── middleware/
│   ├── solicitudes.js        # identificador y duración
│   ├── reservas.js           # validación del POST (formulario y API)
│   ├── cambios-reservas.js   # validación de PUT y PATCH (NUEVO)
│   └── errores.js            # 400, 404 y 500
scripts/                      # programas de terminal
views/, public/               # sitio HTML
```

El modelo no contiene rutas HTTP y el servicio no envía respuestas. El servicio arma el reemplazo y el `$set` con **listas cerradas de campos**: nunca recibe `req.body` completo.

## 6. Modelo y reglas de validación

| Campo | Regla |
| --- | --- |
| `estudiante` | String obligatorio, `trim` |
| `email` | String obligatorio, `trim`, debe contener `@` |
| `sala` | String obligatorio, enum `Sala Norte` / `Sala Sur` / `Sala Multimedia` |
| `fecha` | String obligatorio, `trim` |
| `turno` | String obligatorio, `trim`, enum `Mañana` / `Tarde` / `Noche` |
| `personas` | Number obligatorio, entero entre 1 y 6 |
| `estado` | Enum `pendiente` / `confirmada`, default `pendiente` al crear |

**Qué acepta cada operación**

| Operación | Campos | Reglas específicas |
| --- | --- | --- |
| `POST` | Los seis campos originales | En la API, `estado`, `_id` o cualquier otro campo extra responde 400; se guarda siempre `pendiente` |
| `PUT` | Los siete campos editables, todos obligatorios | Si falta uno (incluido `estado`) responde 400; no se completa con un default |
| `PATCH` | Solo `personas` y `estado`, al menos uno | Cualquier otro campo responde 400 |

En `PUT` y `PATCH` se rechazan con 400: campos desconocidos, `_id`, operadores enviados por el cliente (`$set`, `$inc`, etc.), cuerpo ausente o que no sea un objeto (arreglo, texto), y valores de tipo incorrecto.

`personas` se admite como número o como texto numérico no vacío (`"3"`). Después se comprueba que sea finito, entero y esté entre 1 y 6. Se rechazan `0`, `7`, `2.5`, `true`, `null`, `""`, arreglos y objetos.

Los controles HTTP y el esquema de Mongoose usan las mismas reglas; el modelo vuelve a validar (`runValidators: true`).

**Límites.** No se agregan validaciones de calendario, disponibilidad de sala, solapamiento, cupo compartido ni unicidad. Cambiar `estado` a `confirmada` es una decisión explícita y no comprueba esas condiciones.

## 7. Sitio HTML

| Ruta | Función |
| --- | --- |
| `/` | Inicio |
| `/reservas` | Listado (lee MongoDB) |
| `/reservas/nueva` | Formulario |
| `/reservas/:id` | Detalle (lee MongoDB) |
| `/estado` | JSON con `servicio`, `reservas` (conteo real desde MongoDB) y `solicitudId` |

POST válido: espera la escritura y redirige 302. POST inválido: responde 400 y conserva los valores. Los cambios hechos por la API se ven en el listado, el detalle y `/estado`.

## 8. API JSON

### Contrato

| Método y dirección | Resultado |
| --- | --- |
| `GET /api/reservas` | 200 y arreglo de reservas (sin metadatos) |
| `GET /api/reservas/:id` | 200 y recurso, o 404 |
| `POST /api/reservas` | 201, recurso guardado, cabecera `Location`; `estado: "pendiente"` |
| `PUT /api/reservas/:id` | 200 y reemplazo completo con el mismo `id` |
| `PATCH /api/reservas/:id` | 200 y cambios parciales con el mismo `id`; los demás campos se conservan |
| `DELETE /api/reservas/:id` | 204 sin cuerpo si eliminó un documento |
| ID mal formado | 400 JSON |
| ID válido ausente (GET, PUT, PATCH, DELETE) | 404 JSON, sin crear nada |
| Entrada inválida o JSON mal formado | 400 JSON, sin modificar la base |
| Ruta `/api/...` desconocida | 404 JSON |
| Fallo inesperado | 500 JSON genérico, sin traza ni secreto |

`PUT` y `PATCH` usan `runValidators: true`, `returnDocument: "after"` (devuelven el documento ya modificado) y `upsert: false`: actualizar un ID ausente **no crea** un documento.

### Lectura simple (se conserva)

`GET /api/reservas` devuelve solo un arreglo y `GET /api/reservas/:id` una reserva o 404. No hay paginación, orden ni metadatos nuevos. El filtro exacto `?sala=` viene del TP 08 y se conserva sin cambios; las consultas avanzadas se tratan en la unidad 10.

### Ejemplos (datos ficticios)

`PUT /api/reservas/:id` — siete campos:

```json
{
  "estudiante": "Ana Ejemplo",
  "email": "ana@example.com",
  "sala": "Sala Norte",
  "fecha": "2026-10-28",
  "turno": "Mañana",
  "personas": 2,
  "estado": "confirmada"
}
```

`PATCH /api/reservas/:id`:

```json
{ "personas": 3 }
```

```json
{ "estado": "pendiente" }
```

## 9. Eliminar un documento vs. cambiar su estado

| | `DELETE` | `PATCH { "estado": ... }` / `PUT` |
| --- | --- | --- |
| Qué hace | **Borrado físico**: `deleteOne` quita el documento de la colección | Modifica un campo; el documento sigue existiendo |
| Después | `GET /api/reservas/:id` responde 404, el listado tiene una reserva menos y `/estado` baja en uno | `GET` responde 200 con el nuevo valor; la cantidad no cambia |
| Repetir | Un segundo `DELETE` responde 404 | Se puede repetir y siempre responde 200 |
| Reversible | No: el dato se pierde | Sí: se vuelve al estado anterior |

Pasar una reserva a `pendiente` **no** la elimina ni la cancela: el estado solo admite `pendiente` y `confirmada`. No hay marca de borrado lógico ni ruta para vaciar la colección; `DELETE` actúa sobre un solo ID.

## 10. Cómo reproducir las solicitudes en Postman

Con el servidor iniciado (`npm run start:local`) y el puerto 3000 (adaptar si se cambió). En `GET` y `DELETE`: Body = none. En `POST`, `PUT` y `PATCH`: Body > raw > JSON (Postman agrega `Content-Type: application/json`).

| # | Método y URL | Body | Respuesta esperada |
| --- | --- | --- | --- |
| 1 | GET `/api/reservas` | none | 200 y arreglo; registrar la cantidad inicial |
| 2 | POST `/api/reservas` | los seis campos del ejemplo | 201, `id`, `estado: "pendiente"` y `Location` en Headers; guardar el `id` |
| 2b | POST con `estado` o `_id` agregado | seis campos + el extra | 400; el listado no suma documentos |
| 3 | GET `http://localhost:3000` + `Location` | none | 200, mismo `id` |
| 4 | PUT `/api/reservas/ID_RECIBIDO` | siete campos con `estado: "confirmada"` | 200, mismo `id`, siete valores enviados |
| 5 | PATCH `/api/reservas/ID_RECIBIDO` | `{ "personas": 3 }` | 200, `personas` 3 y los demás campos intactos (incluido `estado`) |
| 6 | PATCH `/api/reservas/ID_RECIBIDO` | `{ "estado": "pendiente" }` | 200, `estado: "pendiente"` |
| 7 | PUT con un campo omitido | seis campos | 400; GET posterior: recurso intacto |
| 8 | PATCH `{}`, con campo extra, con `_id` o con `$set` | según el caso | 400; GET posterior: recurso intacto |
| 9 | PATCH/PUT con `personas` 0, 7, 2.5, `true`, `[2]`, `{"a":1}` | según el caso | 400 |
| 10 | PATCH/PUT con `estado` inválido | según el caso | 400 |
| 11 | PUT/PATCH/DELETE a `/api/reservas/1` | según el caso | 400 |
| 12 | PUT/PATCH/DELETE a `/api/reservas/000000000000000000000000` | según el caso | 404; el listado no suma documentos |
| 13 | PUT/PATCH con JSON mal formado o sin cuerpo | `{"estudiante":` / none | 400 JSON |
| 14 | DELETE `/api/reservas/ID_DE_EJERCICIO` | none | 204 y cuerpo vacío |
| 15 | GET `/api/reservas/ID_DE_EJERCICIO` y repetir DELETE | none | 404 en ambos |
| 16 | GET `/api/reservas` | none | arreglo con una reserva menos; las demás se conservan |

Antes de borrar, verificar el ID por GET y elegir una reserva creada para este ejercicio. No se borran datos del TP 08 ni se vacía la colección.

## 11. Prueba de persistencia (reinicio)

1. Actualizar una reserva (PUT o PATCH) y guardar su `id` y valores.
2. Esperar la respuesta, detener el servidor (Ctrl+C) y volver a iniciarlo con la misma base.
3. GET con el mismo `id`: debe conservar el estado posterior.
4. Eliminar otra reserva de ejercicio, reiniciar y comprobar que sigue ausente (404) y que el listado no la incluye.
5. Revisar `/reservas` y `/estado`: reflejan los mismos datos.

_Completar con lo observado: id actualizado ___, valores ___; id eliminado ___; cantidad antes ___ / después ___._

## 12. Comparación con el TP 08

| Aspecto | TP 08 | TP 09 |
| --- | --- | --- |
| Operaciones API | `GET` y `POST` | `GET`, `POST`, `PUT`, `PATCH` y `DELETE` |
| Servicio | `listar`, `obtenerPorId`, `crear`, `contar` | agrega `reemplazar`, `actualizar` y `eliminar` |
| Validación | Middleware del POST | agrega `cambios-reservas.js` para PUT y PATCH |
| Base | `reservas_salas_u8` | `reservas_salas_u9` |
| Datos | Se crean y se leen | Se reemplazan, se modifican y se eliminan |

## 14. Calidad y seguridad

```
npm run format
npm run check
```

`format` y `check` se ejecutan sobre `src` y `scripts`. El `.env` no se entrega ni se publica. No hay `node_modules`, secretos ni datos personales reales. Los diagnósticos no imprimen la URI ni la clave. Los datos de los ejemplos son ficticios.

Esta entrega no incluye autenticación ni despliegue público. Las consultas avanzadas y las relaciones de datos se planifican en la unidad 10.
