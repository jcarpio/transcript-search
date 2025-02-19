const Koa = require('koa');
const Router = require('koa-router');
const serve = require('koa-static');
const path = require('path');
const joi = require('joi');
const validate = require('koa-joi-validate');
const search = require('./search');
const { checkConnection } = require('./connection');
const loadData = require('./load_data');

const app = new Koa();
const router = new Router();

// 📌 Servir archivos estáticos desde la carpeta 'public'
app.use(serve(path.join(__dirname, '../public')));

// Log each request to the console
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// Log percolated errors to the console
app.on('error', err => {
  console.error('Server Error', err);
});

// Set permissive CORS header
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  return next();
});

// ✅ Ruta para verificar la conexión con Elasticsearch
router.get('/health', async (ctx) => {
  try {
    await checkConnection();
    ctx.body = { success: true, message: 'Conectado a Elasticsearch' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

// ✅ Ruta para ejecutar `load_data.js` manualmente
router.get('/load-data', async (ctx) => {
  try {
    await loadData();
    ctx.body = { success: true, message: 'Datos cargados en Elasticsearch' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

/**
 * ✅ GET /search - Búsqueda en la librería
 */
router.get('/search',
  validate({
    query: {
      term: joi.string().max(60).required(),
      offset: joi.number().integer().min(0).default(0)
    }
  }),
  async (ctx) => {
    const { term, offset } = ctx.request.query;
    ctx.body = await search.queryTerm(term, offset);
  }
);

/**
 * ✅ GET /paragraphs - Obtener párrafos de un libro
 */
router.get('/paragraphs',
  validate({
    query: {
      bookTitle: joi.string().max(256).required(),
      start: joi.number().integer().min(0).default(0),
      end: joi.number().integer().greater(joi.ref('start')).default(10)
    }
  }),
  async (ctx) => {
    const { bookTitle, start, end } = ctx.request.query;
    ctx.body = await search.getParagraphs(bookTitle, start, end);
  }
);

// ✅ Ruta catch-all para servir `index.html` en rutas desconocidas
router.get('(.*)', async (ctx) => {
  ctx.type = 'html';
  ctx.body = require('fs').createReadStream(path.join(__dirname, '../public/index.html'));
});

const port = process.env.PORT || 3000;
app.use(router.routes()).use(router.allowedMethods());

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

module.exports = app;
