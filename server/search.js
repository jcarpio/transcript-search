const { client, index } = require('./connection');

module.exports = {
  /** ✅ Query ES index for the provided term */
  async queryTerm(term, offset = 0) {
    try {
      const body = {
        from: offset,
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

      console.log(`🔍 Buscando término: "${term}" con offset: ${offset}`);

      const response = await client.search({ index, body });
      return response.body.hits;
    } catch (error) {
      console.error('❌ Error en la búsqueda:', error);
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
      return response.body.hits;
    } catch (error) {
      console.error('❌ Error al obtener párrafos:', error);
      throw new Error('Error al obtener párrafos en Elasticsearch.');
    }
  }
};
