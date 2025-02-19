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
  const title = book.match(/^Title:\s(.+)$/m)[1];
  const authorMatch = book.match(/^Author:\s(.+)$/m);
  const url_youtube = book.match(/^Url Youtube:\s(.+)$/m)[1].trim();
  const url_original = book.match(/^Url Original:\s(.+)$/m)[1].trim();
  const url_ivoox = book.match(/^Url Ivoox:\s(.+)$/m)[1].trim();
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

/** Insertar los libros en Elasticsearch */
async function insertBookData(title, author, url_original, url_youtube, url_ivoox, paragraphs) {
  let bulkOps = [];

  for (let i = 0; i < paragraphs.length; i++) {
    bulkOps.push({ index: { _index: esConnection.index, _type: esConnection.type } });
    bulkOps.push({ author, title, url_original, url_youtube, url_ivoox, location: i, text: paragraphs[i] });

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
      const { title, author, url_original, url_youtube, url_ivoox, paragraphs } = parseBookFile(filePath);
      await insertBookData(title, author, url_original, url_youtube, url_ivoox, paragraphs);
    }

    console.log("✅ Todos los libros han sido indexados en Elasticsearch.");
  } catch (err) {
    console.error("❌ Error en la indexación:", err);
    throw err;
  }
}

module.exports = readAndInsertBooks;
