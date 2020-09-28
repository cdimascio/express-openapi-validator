const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const {
  middleware: openApiMiddleware,
  resolvers,
} = require('express-openapi-validator');

const port = 3000;
const app = express();
const apiSpec = path.join(__dirname, 'api.yaml');

// 1. Install bodyParsers for the request types your API will support
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use(logger('dev'));

app.use('/spec', express.static(apiSpec));

//  2. Install the OpenApiValidator middleware
app.use(
  openApiMiddleware({
    apiSpec,
    validateResponses: true, // default false
    operationHandlers: {
      // 3. Provide the path to the controllers directory
      basePath: path.join(__dirname, 'routes'),
      // 4. Provide a function responsible for resolving an Express RequestHandler
      //    function from the current OpenAPI Route object.
      resolver: resolvers.modulePathResolver,
    },
  }),
);

// 5. Create a custom error handler
app.use((err, req, res, next) => {
  // format errors
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

http.createServer(app).listen(port);
console.log(`Listening on port ${port}`);

module.exports = app;
