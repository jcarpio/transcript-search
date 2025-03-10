const fs = require('fs');
const path = require('path');
const esConnection = require('./connection');

/** Ruta base de los libros en Vercel */
const BOOKS_DIR = path.join(__dirname, '../public/books/');

/** Verifica que la carpeta `public/books/` existe */
function checkBooksDirectory() {
  if (!fs.existsSync(BOOKS_DIR)) {
    throw new Error(`❌ ERROR: La carpeta ${BOOKS_DIR} no existe. Asegúrate de subir los libros.`);
  }
}

/** Leer un libro y extraer los datos */
function parseBookFile(filePath) {
  const book = fs.readFileSync(filePath, 'utf8');

  console.log(`📖 Leyendo archivo: ${filePath}`);

  // Dividir el archivo en líneas
  const lines = book.split('\n');

  // Imprimir las primeras 20 líneas del archivo para depuración
  console.log("📌 Primeras 20 líneas del archivo:");
  for (let i = 0; i < Math.min(20, lines.length); i++) {
      console.log(`${i + 1}: ${lines[i]}`);
  }

  // Extraer metadatos con validaciones (solo los obligatorios generan error si faltan)
  function extractMetadata(regex, name, isOptional = false, defaultValue = '') {
      const match = book.match(regex);
      if (!match || !match[1]) {
          if (isOptional) {
              console.warn(`⚠️ Advertencia: No se encontró "${name}". Se usará: "${defaultValue}"`);
              return defaultValue;
          }
          console.error(`❌ ERROR: No se pudo extraer "${name}" en archivo: ${filePath}`);
          throw new Error(`Faltan metadatos (${name}) en archivo: ${filePath}`);
      }
      return match[1].trim();
  }

  // Campos obligatorios
  const title = extractMetadata(/^Title:\s(.+)$/m, "Title");
  const author = extractMetadata(/^Author:\s(.+)$/m, "Author");

  // Campos opcionales (se asignan valores predeterminados si no están)
  const url_youtube = extractMetadata(/^Url Youtube:\s(.+)$/m, "Url Youtube", true, "N/A");
  const url_original = extractMetadata(/^Url Original:\s(.+)$/m, "Url Original", true, "N/A");
  const url_ivoox = extractMetadata(/^Url Ivoox:\s(.+)$/m, "Url Ivoox", true, "N/A");

  console.log(`✅ Metadatos extraídos correctamente para: ${title}`);

  // Buscar contenido del libro
  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);
  const endOfBookMatch = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);

  if (!startOfBookMatch || !endOfBookMatch) {
      console.error(`❌ ERROR: No se encontraron los marcadores de inicio/fin en ${filePath}`);
      throw new Error(`Formato incorrecto en ${filePath}`);
  }

  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length;
  const endOfBookIndex = endOfBookMatch.index;

  // Dividir en párrafos y mostrar el primero para depuración
  const paragraphs = book
      .slice(startOfBookIndex, endOfBookIndex)
      .split(/\n\s*\n/g)
      .map(line => line.replace(/\r\n/g, ' ').trim())
      .map(line => line.replace(/_/g, ''))
      .filter(line => line && line !== '');

  console.log(`📌 Se encontraron ${paragraphs.length} párrafos en "${title}"`);
  if (paragraphs.length > 0) {
      console.log(`📖 Primer párrafo: ${paragraphs[0]}`);
  }

  return { title, author, url_original, url_youtube, url_ivoox, paragraphs };
}
  // Extraer metadatos con validaciones
  function extractMetadata(regex, name) {
      const match = book.match(regex);
      if (!match || !match[1]) {
          console.error(`❌ ERROR: No se pudo extraer "${name}" en archivo: ${filePath}`);
          throw new Error(`Faltan metadatos (${name}) en archivo: ${filePath}`);
      }
      return match[1].trim();
  }

  const title = extractMetadata(/^Title:\s(.+)$/m, "Title");
  const author = extractMetadata(/^Author:\s(.+)$/m, "Author");
  const url_youtube = extractMetadata(/^Url Youtube:\s(.+)$/m, "Url Youtube");
  const url_original = extractMetadata(/^Url Original:\s(.+)$/m, "Url Original");
  const url_ivoox = extractMetadata(/^Url Ivoox:\s(.+)$/m, "Url Ivoox");

  console.log(`✅ Metadatos extraídos correctamente para: ${title}`);

  // Buscar contenido del libro
  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);
  const endOfBookMatch = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);

  if (!startOfBookMatch || !endOfBookMatch) {
      console.error(`❌ ERROR: No se encontraron los marcadores de inicio/fin en ${filePath}`);
      throw new Error(`Formato incorrecto en ${filePath}`);
  }

  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length;
  const endOfBookIndex = endOfBookMatch.index;

  // Dividir en párrafos y mostrar el primero para depuración
  const paragraphs = book
      .slice(startOfBookIndex, endOfBookIndex)
      .split(/\n\s*\n/g)
      .map(line => line.replace(/\r\n/g, ' ').trim())
      .map(line => line.replace(/_/g, ''))
      .filter(line => line && line !== '');

  console.log(`📌 Se encontraron ${paragraphs.length} párrafos en "${title}"`);
  if (paragraphs.length > 0) {
      console.log(`📖 Primer párrafo: ${paragraphs[0]}`);
  }

  return { title, author, url_original, url_youtube, url_ivoox, paragraphs };
}

/** Insertar los libros en Elasticsearch con manejo de errores mejorado */
async function insertBookData(title, author, url_original, url_youtube, url_ivoox, paragraphs, fileName) {
  let bulkOps = [];
  let paragraphIndex = 0; // Contador para identificar el párrafo con error

  for (let i = 0; i < paragraphs.length; i++) {
    paragraphIndex = i + 1; // Índice real del párrafo

    bulkOps.push({ index: { _index: esConnection.index } });
    bulkOps.push({
      author,
      title,
      url_original,
      url_youtube,
      url_ivoox,
      location: i,
      text: paragraphs[i]
    });

    if (i > 0 && i % 500 === 0) {
      console.log(`📤 Insertando párrafos ${i - 499} - ${i} en Elasticsearch...`);
      try {
        const response = await esConnection.client.bulk({ body: bulkOps });
        handleBulkErrors(response, fileName, paragraphIndex, bulkOps);
      } catch (err) {
        console.error(`❌ Error crítico en archivo "${fileName}" en párrafo ${paragraphIndex}: ${err.message}`);
      }
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    console.log(`📤 Insertando últimos ${bulkOps.length / 2} párrafos...`);
    try {
      const response = await esConnection.client.bulk({ body: bulkOps });
      handleBulkErrors(response, fileName, paragraphIndex, bulkOps);
    } catch (err) {
      console.error(`❌ Error crítico en archivo "${fileName}" en párrafo ${paragraphIndex}: ${err.message}`);
    }
  }

  console.log(`✅ Libro "${title}" indexado completamente en Elasticsearch.\n`);
}

/** ✅ Manejo de errores detallado en la indexación */
function handleBulkErrors(response, fileName, paragraphIndex, bulkOps) {
  if (response.errors) {
    console.error(`❌ Error en la indexación del archivo "${fileName}", párrafo ${paragraphIndex}`);
    response.items.forEach((item, idx) => {
      if (item.index && item.index.error) {
        console.error(`❌ Error en documento ${paragraphIndex - (bulkOps.length / 2) + idx + 1}: ${item.index.error.reason}`);
        console.error(`📌 Párrafo problemático: "${bulkOps[idx * 2 + 1].text}"`);
      }
    });
  }
}

/** Leer y cargar todos los libros en Elasticsearch con logs mejorados */
async function readAndInsertBooks() {
  await esConnection.checkConnection();

  try {
    console.log("🔄 Reiniciando índice en Elasticsearch...");
    await esConnection.resetIndex();

    checkBooksDirectory(); // Asegurar que la carpeta existe

    const files = fs.readdirSync(BOOKS_DIR).filter(file => file.endsWith('.txt'));
    console.log(`📚 Encontrados ${files.length} libros en ${BOOKS_DIR}.`);

    for (let file of files) {
      console.log(`📖 Procesando archivo: ${file}`);
      const filePath = path.join(BOOKS_DIR, file);
      const { title, author, url_original, url_youtube, url_ivoox, paragraphs } = parseBookFile(filePath);
      await insertBookData(title, author, url_original, url_youtube, url_ivoox, paragraphs, file);
    }

    console.log("✅ Todos los libros han sido indexados en Elasticsearch.");
  } catch (err) {
    console.error("❌ Error en la indexación:", err);
    throw err;
  }
}

module.exports = readAndInsertBooks;
