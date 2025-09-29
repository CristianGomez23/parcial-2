const express = require("express");
const dotenv = require("dotenv");
const neo4j = require("neo4j-driver");
const os = require("os"); // 🔹 Para obtener el hostname del contenedor

dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const EXPRESS_PORT = process.env.EXPRESS_PORT || 3000;

// 🔹 Conexión a Neo4j usando el nombre del servicio
const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

const app = express();
app.use(express.json());

// 🔹 Endpoint health (para observabilidad en Traefik)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    hostname: os.hostname(), // Muestra en qué contenedor responde
  });
});

// GET estudiantes
app.get("/estudiantes", async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (e:Estudiante)
      RETURN e.id AS id, e.nombre AS nombre, e.edad AS edad
      ORDER BY e.id ASC
    `);

    const estudiantes = result.records.map((r) => ({
      id: r.get("id"),
      nombre: r.get("nombre"),
      edad: r.get("edad"),
    }));

    res.json({
      hostname: os.hostname(), // 🔹 Se añade el hostname aquí también
      estudiantes,
    });
  } catch (err) {
    console.error("❌ Error en GET /estudiantes:", err.message);
    res.status(500).json({ error: "No se pudo conectar a la base de datos" });
  } finally {
    await session.close();
  }
});

// POST estudiante aleatorio
app.post("/estudiantes", async (req, res) => {
  const session = driver.session();
  try {
    const nuevoId = Math.floor(Math.random() * 90000) + 10000;
    const nombre = `Estudiante_${nuevoId}`;
    const edad = Math.floor(Math.random() * (30 - 18 + 1)) + 18;

    await session.run(
      `CREATE (e:Estudiante {id: $id, nombre: $nombre, edad: $edad})`,
      { id: nuevoId, nombre, edad }
    );

    res.status(201).json({
      message: "Estudiante creado exitosamente",
      hostname: os.hostname(), // 🔹 También aquí para ver qué contenedor respondió
      estudiante: { id: nuevoId, nombre, edad },
    });
  } catch (err) {
    console.error("❌ Error en POST /estudiantes:", err.message);
    res.status(500).json({ error: "No se pudo crear el estudiante" });
  } finally {
    await session.close();
  }
});

app.listen(EXPRESS_PORT, () => {
  console.log(`🚀 Servidor Express en http://0.0.0.0:${EXPRESS_PORT}`);
});

