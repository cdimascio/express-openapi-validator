const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const OpenApiValidator = require('express-openapi-validator');

const port = 3000;
const app = express();
const apiSpec = path.join(__dirname, 'ems.yaml');

// 1. Install bodyParsers for the request types your API will support
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use(logger('dev'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/spec', express.static(apiSpec));

// 2. Install the OpenApiValidator middleware
app.use(
  OpenApiValidator.middleware({
    apiSpec,
    validateResponses: true,
  }),
);

// 3. Install routes
app.put('/v1/queries', function (req, res, next) {
  res.status(200).json([]);
});
app.post('/v1/queries', function (req, res, next) {
  res.status(201).json({});
});
app.get('/v1/queries', function (req, res, next) {
  res.json([]);
});

// 4. Install a custom error handler
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
