
const puppeteer = require("puppeteer");

async function scrape() {
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

        // 🔥 limpiar basura
        banco = banco
          .replace("Bancos públicos", "")
          .replace("Bancos privados", "")
          .replace("\t", "")
          .trim();

        // 🔥 normalizar SIN acentos
        const nombre = banco
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        // 🔥 filtro correcto (SIN acentos)
        if (
          nombre.includes("banco de costa rica") ||
          nombre.includes("banco nacional") ||
          nombre.includes("bac") ||
          nombre.includes("promerica") || // ← FIX CLAVE
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

  console.log("RESULTADO FINAL:");
  console.log(data);

  await browser.close();
}

scrape();