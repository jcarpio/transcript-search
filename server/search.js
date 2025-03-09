const { client, index } = require('./connection');

module.exports = {
  /** ✅ Query ES index for the provided term */
  async queryTerm(term, offset = 0) {
    try {
      const body = {
        from: offset,
        size: 9, // Asegurar que obtenemos exactamente 9 resultados por página
        query: {
          match: {
            text: {
              query: term,
              operator: 'and',
              fuzziness: 'auto'
            }
          }
        },
        highlight: { fields: { text: {} } }
      };

      console.log("🔍 Consulta enviada a Elasticsearch:", JSON.stringify(body, null, 2));
      console.log(`🔍 Buscando término: "${term}" con offset: ${offset}`);

      const response = await client.search({ index, body });

      // 🛠 Ajuste para Elasticsearch 7: `hits.total` es un objeto, no un número.
      const totalHits = typeof response.body.hits.total === 'object' ? response.body.hits.total.value : response.body.hits.total;

      // 🛠 Asegurar que la respuesta tiene 'hits'
      if (!response.body.hits || !response.body.hits.hits) {
        throw new Error('Elasticsearch no devolvió resultados válidos.');
      }

      return {
        total: totalHits,
        hits: response.body.hits.hits
      };
    } catch (error) {
      console.error('❌ Error en la búsqueda:', error.message);
      throw new Error('Error al realizar la búsqueda en Elasticsearch.');
    }
  },

  /** ✅ Get the specified range of paragraphs from a book */
  async getParagraphs(bookTitle, startLocation, endLocation) {
    try {
      const filter = [
        { term: { title: bookTitle } },
        { range: { location: { gte: startLocation, lte: endLocation } } }
      ];

      const body = {
        size: endLocation - startLocation,
        sort: [{ location: 'asc' }],
        query: { bool: { filter } }
      };

      console.log(`📖 Obteniendo párrafos de "${bookTitle}" de ${startLocation} a ${endLocation}`);

      const response = await client.search({ index, body });

      // 🛠 Ajuste para Elasticsearch 7: `hits.total` es un objeto, no un número.
      const totalHits = typeof response.body.hits.total === 'object' ? response.body.hits.total.value : response.body.hits.total;

      // 🛠 Asegurar que la respuesta tiene 'hits'
      if (!response.body.hits || !response.body.hits.hits) {
        throw new Error('Elasticsearch no devolvió resultados válidos.');
      }

      return {
        total: totalHits,
        hits: response.body.hits.hits
      };
    } catch (error) {
      console.error('❌ Error al obtener párrafos:', error.message);
      throw new Error('Error al obtener párrafos en Elasticsearch.');
    }
  }
};
