const fs = require('fs');
const path = require('path');
const esConnection = require('./connection');

/** Read an individual book txt file, and extract the title, author, and paragraphs */
function parseBookFile(filePath) {
  const book = fs.readFileSync(filePath, 'utf8');

  // Find book title and author
  const title = book.match(/^Title:\s(.+)$/m)[1];
  const authorMatch = book.match(/^Author:\s(.+)$/m);
  var url_youtube = book.match(/^Url Youtube:\s(.+)$/m)[1];
  var url_original = book.match(/^Url Original:\s(.+)$/m)[1];
  var url_ivoox = book.match(/^Url Ivoox:\s(.+)$/m)[1];

  url_youtube = url_youtube.trim();
  url_original = url_original.trim();
  url_ivoox = url_ivoox.trim();

  const author = (!authorMatch || authorMatch[1].trim() === '') ? 'Unknown Author' : authorMatch[1];

  console.log(`📖 Leyendo libro: ${title} | Autor: ${author} | YouTube: ${url_youtube}`);

  // Find Guttenberg metadata header and footer
  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m);
  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length;
  const endOfBookIndex = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m).index;

  // Clean book text and split into array of paragraphs
  const paragraphs = book
    .slice(startOfBookIndex, endOfBookIndex)
    .split(/\n\s+\n/g)
    .map(line => line.replace(/\r\n/g, ' ').trim())
    .map(line => line.replace(/_/g, '')) // Remove "_" for italics
    .filter((line) => (line && line !== ''));

  console.log(`📌 Procesados ${paragraphs.length} párrafos\n`);
  return { title, author, url_original, url_youtube, url_ivoox, paragraphs };
}

/** Bulk index the book data in Elasticsearch */
async function insertBookData(title, author, url_original, url_youtube, url_ivoox, paragraphs) {
  let bulkOps = [];

  for (let i = 0; i < paragraphs.length; i++) {
    bulkOps.push({ index: { _index: esConnection.index, _type: esConnection.type } });

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

/** Clear ES index, parse and index all files from the books directory */
async function readAndInsertBooks() {
  await esConnection.checkConnection();

  try {
    console.log("🔄 Reiniciando índice en Elasticsearch...");
    await esConnection.resetIndex();

    const files = fs.readdirSync('./books').filter(file => file.slice(-4) === '.txt');
    console.log(`📚 Encontrados ${files.length} libros.`);

    for (let file of files) {
      console.log(`📖 Procesando archivo: ${file}`);
      const filePath = path.join('./books', file);
      const { title, author, url_original, url_youtube, url_ivoox, paragraphs } = parseBookFile(filePath);
      await insertBookData(title, author, url_original, url_youtube, url_ivoox, paragraphs);
    }

    console.log("✅ Todos los libros han sido indexados en Elasticsearch.");
  } catch (err) {
    console.error("❌ Error en la indexación:", err);
    throw err;
  }
}

// ✅ Exportar la función para que `app.js` pueda llamarla
module.exports = readAndInsertBooks;
