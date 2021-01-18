const koa = require('koa');
const c2k = require('koa-connect');
const koaRouter = require('koa-router');
const OpenApiValidator = require('koa-openapi-validator');

const app = new koa();
const router = new koaRouter();

router.get('koala', '/v1/pets', (ctx) => {
  ctx.body = {
    message: 'Welcome! To the Koala Book of Everything!',
  };
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    // console.error(err);
    ctx.status = err.statusCode || err.status || 500;
    ctx.body = {
      message: err.message,
      errors: err.errors ?? [],
    };
  }
});

app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yml',
  }),
);

app.use(router.routes()).use(router.allowedMethods());

app.listen(1234, () => console.log('running on port 1234'));
