const { Client } = require('@elastic/elasticsearch');

// Verificar que las variables de entorno necesarias estén configuradas
if (!process.env.ELASTIC_NODE || !process.env.ELASTIC_API_KEY_ID || !process.env.ELASTIC_API_KEY) {
  console.error("❌ ERROR: Faltan variables de entorno para la autenticación con API Key.");
  process.exit(1); // Detiene la ejecución si faltan credenciales
}

// Configurar la conexión con Elasticsearch usando API Key
const client = new Client({
  node: process.env.ELASTIC_NODE,
  auth: {
    apiKey: {
      id: process.env.ELASTIC_API_KEY_ID,
      api_key: process.env.ELASTIC_API_KEY
    }
  }
});

// Nombre del índice y tipo de documento
const index = 'library';
const type = '_doc';

/** Verifica el estado de la conexión con Elasticsearch */
async function checkConnection() {
  try {
    console.log("🔍 Verificando conexión con Elasticsearch usando API Key...");
    const health = await client.cluster.health({});
    console.log("✅ Elasticsearch Health:", health);
    return true;
  } catch (err) {
    console.error("❌ Error de conexión con Elasticsearch:", err);
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
  client, index, type, checkConnection, resetIndex
};
