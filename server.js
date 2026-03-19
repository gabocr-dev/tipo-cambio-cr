const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = 3000;

// 🔥 CACHE GLOBAL
let cache = {
  data: [],
  lastUpdate: null
};

// 🔥 FUNCIÓN DE SCRAPING
async function obtenerDatos() {
  console.log("⏳ Actualizando datos...");

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(
    "https://gee.bccr.fi.cr/IndicadoresEconomicos/Cuadros/frmConsultaTCVentanilla.aspx",
    { waitUntil: "networkidle2" }
  );

  await new Promise(resolve => setTimeout(resolve, 5000));

  const data = await page.evaluate(() => {
    const tables = document.querySelectorAll("table");
    const texto = tables[1].innerText;

    const lineas = texto.split("\n");

    let resultado = [];

    lineas.forEach(linea => {
      const limpia = linea.trim();

      const match = limpia.match(/(.+?)\s+(\d{3},\d{2})\s+(\d{3},\d{2})/);

      if (match) {
        let banco = match[1].trim();
        const compra = match[2];
        const venta = match[3];

        banco = banco
          .replace("Bancos públicos", "")
          .replace("Bancos privados", "")
          .replace("\t", "")
          .trim();

        const nombre = banco
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (
          nombre.includes("banco de costa rica") ||
          nombre.includes("banco nacional") ||
          nombre.includes("bac") ||
          nombre.includes("promerica") ||
          nombre.includes("lafise")
        ) {
          resultado.push({
            banco,
            compra,
            venta
          });
        }
      }
    });

    return resultado;
  });

  await browser.close();

  cache.data = data;
  cache.lastUpdate = new Date();

  console.log("✅ Datos actualizados:", cache.lastUpdate);
}

// 🔥 ACTUALIZAR CADA 3 HORAS
setInterval(obtenerDatos, 3 * 60 * 60 * 1000);

// 🔥 PRIMERA EJECUCIÓN AL INICIAR
obtenerDatos();

// 🔥 ENDPOINT API
app.get("/api/tipo-cambio", (req, res) => {
  res.json({
    actualizado: cache.lastUpdate,
    datos: cache.data
  });
});

// 🔥 SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});