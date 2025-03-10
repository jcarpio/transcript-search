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

  // Extraer metadatos con validaciones (solo los obligatorios generan error si faltan)
  function extractMetadata(regex, name, isOptional = false, defaultValue = '') {
    const match = book.match(regex);
    if (!match || !match[1]) {
      if (isOptional) {
        console.warn(`⚠️ Advertencia: No se encontró "${name}". Se usará: "${defaultValue}"`);
        return defaultValue;
      }
      throw new Error(`Faltan metadatos (${name}) en archivo: ${filePath}`);
    }
    return match[1].trim();
  }

  // Extraer metadatos
  const title = extractMetadata(/^Title:\s(.+)$/m, "Title");
  const author = extractMetadata(/^Author:\s(.+)$/m, "Author", true, "Unknown Author");
  const url_youtube = extractMetadata(/^Url Youtube:\s(.+)$/m, "Url Youtube", true, "N/A");
  const url_original = extractMetadata(/^Url Original:\s(.+)$/m, "Url Original", true, "N/A");
  const url_ivoox = extractMetadata(/^Url Ivoox:\s(.+)$/m, "Url Ivoox", true, "N/A");

  console.log(`✅ Metadatos extraídos: ${title} - ${author}`);

  // Buscar contenido del libro
  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);
  const endOfBookMatch = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);

  if (!startOfBookMatch || !endOfBookMatch) {
    throw new Error(`❌ ERROR: No se encontraron los marcadores de inicio/fin en ${filePath}`);
  }

  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length;
  const endOfBookIndex = endOfBookMatch.index;

  // Dividir en párrafos
  const paragraphs = book
    .slice(startOfBookIndex, endOfBookIndex)
    .split(/\n\s*\n/g)
    .map(line => line.replace(/\r\n/g, ' ').trim())
    .map(line => line.replace(/_/g, ''))
    .filter(line => line && line !== '');

  console.log(`📌 Se encontraron ${paragraphs.length} párrafos en "${title}"`);

  return { title, author, url_original, url_youtube, url_ivoox, paragraphs };
}

/** Insertar los libros en Elasticsearch sin `_type` (compatible con Elasticsearch 7+) */
async function insertBookData(title, author, url_original, url_youtube, url_ivoox, paragraphs) {
  let bulkOps = [];

  for (let i = 0; i < paragraphs.length; i++) {
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
      await esConnection.client.bulk({ body: bulkOps });
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    console.log(`📤 Insertando últimos ${bulkOps.length / 2} párrafos...`);
    await esConnection.client.bulk({ body: bulkOps });
  }

  console.log(`✅ Libro "${title}" indexado completamente en Elasticsearch.\n`);
}

/** Leer y cargar todos los libros en Elasticsearch */
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
      
      try {
        const { title, author, url_original, url_youtube, url_ivoox, paragraphs } = parseBookFile(filePath);
        await insertBookData(title, author, url_original, url_youtube, url_ivoox, paragraphs);
      } catch (err) {
        console.error(`❌ Error procesando ${file}:`, err.message);
      }
    }

    console.log("✅ Todos los libros han sido indexados en Elasticsearch.");
  } catch (err) {
    console.error("❌ Error en la indexación:", err);
    throw err;
  }
}

module.exports = readAndInsertBooks;
