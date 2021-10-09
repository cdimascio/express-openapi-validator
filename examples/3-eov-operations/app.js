const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const OpenApiValidator = require('express-openapi-validator');

const port = 3000;
const app = express();
const apiSpec = path.join(__dirname, 'api.yaml');

// 1. Install bodyParsers for the request types your API will support
app.use(express.urlencoded({ extended: false }));
app.use(express.text());
app.use(express.json());

app.use(logger('dev'));
app.use('/spec', express.static(apiSpec));

// 2. Add the OpenApiValidator middleware
app.use(
  OpenApiValidator.middleware({
    apiSpec,
    validateResponses: true, // default false
    // 3. Provide the path to the controllers directory
    operationHandlers: path.join(__dirname), // default false
  }),
);

// 4. Add an error handler
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
