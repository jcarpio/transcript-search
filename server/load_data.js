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

  // Extraer metadatos
const titleMatch = book.match(/^Title:\s(.+)$/m);
const authorMatch = book.match(/^Author:\s(.+)$/m);
const urlYoutubeMatch = book.match(/^Url Youtube:\s(.+)$/m);
const urlOriginalMatch = book.match(/^Url Original:\s(.+)$/m);
const urlIvooxMatch = book.match(/^Url Ivoox:\s(.+)$/m);

if (!titleMatch || !urlOriginalMatch) {
    console.error(`❌ ERROR en archivo ${filePath}: No se pudieron extraer algunos metadatos. titleMatch: ${titleMatch}, urlYoutubeMatch: ${urlYoutubeMatch}, urlOriginalMatch: ${urlOriginalMatch}, urlIvooxMatch: ${urlIvooxMatch}`);
    console.error(`📌 titleMatch: ${titleMatch}, urlYoutubeMatch: ${urlYoutubeMatch}, urlOriginalMatch: ${urlOriginalMatch}, urlIvooxMatch: ${urlIvooxMatch}`);
    throw new Error(`Faltan metadatos en el archivo: ${filePath}`);
}

const title = titleMatch[1];
const url_youtube = urlYoutubeMatch[1].trim();
const url_original = urlOriginalMatch[1].trim();
const url_ivoox = urlIvooxMatch[1].trim();
const author = (!authorMatch || authorMatch[1].trim() === '') ? 'Unknown Author' : authorMatch[1];

  console.log(`📖 Leyendo libro: ${title} | Autor: ${author} | YouTube: ${url_youtube}`);

  // Buscar contenido del libro
  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);
  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length;
  const endOfBookIndex = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m).index;

  // Dividir en párrafos
  const paragraphs = book
    .slice(startOfBookIndex, endOfBookIndex)
    .split(/\n\s+\n/g)
    .map(line => line.replace(/\r\n/g, ' ').trim())
    .map(line => line.replace(/_/g, ''))
    .filter((line) => (line && line !== ''));

  console.log(`📌 Procesados ${paragraphs.length} párrafos\n`);
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
