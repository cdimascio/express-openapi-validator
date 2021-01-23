import koa from 'koa';
import koaRouter from 'koa-router';
import koaBodyParser from 'koa-bodyparser';
import * as OpenApiValidator from '../../src';
import { OpenApiValidatorOpts } from 'openapi-core';
import { Server } from 'http';

export function createApp(
  opts?: OpenApiValidatorOpts,
  port = 3000,
  customRoutes = (router: koaRouter) => {},
): Server {
  const app = new koa();
  const router = new koaRouter();

  app.use(koaBodyParser({}));

  customRoutes(router);

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

  app.use(OpenApiValidator.middleware(opts));

  app.use(router.routes()).use(router.allowedMethods());

  return app.listen(port, () => console.log('running on port', port));
}

//   const shutDown = () => {
//     console.log('Received kill signal, shutting down gracefully');
//     server.close(() => {
//       console.log('Closed out remaining connections');
//       process.exit(0);
//     });

//     setTimeout(() => {
//       console.error(
//         'Could not close connections in time, forcefully shutting down',
//       );
//       process.exit(1);
//     }, 10000);
//   };
//   process.on('SIGTERM', shutDown);
//   process.on('SIGINT', shutDown);

//   // export default app;
//   return app;
// }
