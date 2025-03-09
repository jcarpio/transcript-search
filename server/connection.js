const { Client } = require('@elastic/elasticsearch');

console.log("🛠️ Versión de Elasticsearch instalada:", require('@elastic/elasticsearch/package.json').version);

// Verificar que las variables de entorno necesarias estén configuradas
if (!process.env.BONSAI_URL) {
  console.error("❌ ERROR: La variable de entorno BONSAI_URL no está definida.");
  process.exit(1);
}

// Configurar la conexión con Elasticsearch en Bonsai.io
const client = new Client({
  node: process.env.BONSAI_URL, // URL de conexión a Bonsai.io
  ssl: { rejectUnauthorized: false } // Evita problemas con certificados SSL
});

// Nombre del índice
const index = 'library';

/** Verifica el estado de la conexión con Elasticsearch */
async function checkConnection() {
  try {
    console.log("🔍 Verificando conexión con Bonsai.io...");
    const health = await client.cluster.health();
    console.log("✅ Elasticsearch Health:", health);
    return true;
  } catch (err) {
    console.error("❌ Error de conexión con Bonsai.io:", err);
    throw err;
  }
}

/** Reinicia el índice en Elasticsearch */
async function resetIndex() {
  try {
    console.log("🔄 Reiniciando índice...");
    const exists = await client.indices.exists({ index });
    if (exists) {
      await client.indices.delete({ index });
      console.log(`🗑️ Índice '${index}' eliminado.`);
    }

    await client.indices.create({ index });
    console.log(`✅ Índice '${index}' creado.`);
    await putBookMapping();
  } catch (err) {
    console.error("❌ Error al reiniciar el índice:", err);
    throw err;
  }
}

/** Agrega el mapeo de los documentos en Elasticsearch */
async function putBookMapping() {
  try {
    console.log("📌 Configurando mapeo de documentos...");
    const schema = {
      properties: {
        title: { type: 'keyword' },
        author: { type: 'keyword' },
        url_original: { type: 'keyword' },
        url_youtube: { type: 'keyword' },
        url_ivoox: { type: 'keyword' },
        location: { type: 'integer' },
        text: { type: 'text' }
      }
    };

    await client.indices.putMapping({ index, body: schema });
    console.log("✅ Mapeo de documentos configurado.");
  } catch (err) {
    console.error("❌ Error al configurar el mapeo:", err);
    throw err;
  }
}

module.exports = {
  client, index, checkConnection, resetIndex
};
