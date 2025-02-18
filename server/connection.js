const { Client } = require('@elastic/elasticsearch');

// Core ES variables for this project
const index = 'library';
const type = 'book';

// Configuración del cliente de Elasticsearch en Elastic Cloud
const client = new Client({
  cloud: {
    id: process.env.CLOUD_ID, // Cloud ID de Elastic Cloud
  },
  auth: {
    username: process.env.ELASTIC_USERNAME, // Usuario de Elastic Cloud
    password: process.env.ELASTIC_PASSWORD, // Contraseña de Elastic Cloud
  },
});

/** Check the ES connection status */
async function checkConnection() {
  let isConnected = false;
  while (!isConnected) {
    console.log('Connecting to ES');
    try {
      const health = await client.cluster.health({});
      console.log(health);
      isConnected = true;
    } catch (err) {
      console.log('Connection Failed, Retrying...', err);
    }
  }
}

/** Clear the index, recreate it, and add mappings */
async function resetIndex() {
  if (await client.indices.exists({ index })) {
    await client.indices.delete({ index });
  }

  await client.indices.create({ index });
  await putBookMapping();
}

/** Add book section schema mapping to ES */
async function putBookMapping() {
  const schema = {
    title: { type: 'keyword' },
    author: { type: 'keyword' },
    url_original: { type: 'keyword' },
    url_youtube: { type: 'keyword' },
    url_ivoox: { type: 'keyword' },
    location: { type: 'integer' },
    text: { type: 'text' },
  };

  return client.indices.putMapping({ index, type, body: { properties: schema } });
}

module.exports = {
  client, index, type, checkConnection, resetIndex,
};
