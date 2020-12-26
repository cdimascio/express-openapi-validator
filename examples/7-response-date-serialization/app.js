const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const OpenApiValidator = require('express-openapi-validator');

const port = 3000;
const app = express();
const apiSpec = path.join(__dirname, 'api.yaml');

// 1. Install bodyParsers for the request types your API will support
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json());

// Optionally serve the API spec
app.use('/spec', express.static(apiSpec));

//  2. Install the OpenApiValidator on your express app
app.use(
  OpenApiValidator.middleware({
    apiSpec,
    validateResponses: true,
  }),
);
// 3. Add routes
app.get('/v1/ping', function (req, res, next) {
  res.send('pong');
});

app.get('/v1/date-time', function (req, res, next) {
  res.json({
    id: 1,
    created_at: new Date(),
  });
});

app.get('/v1/date', function (req, res, next) {
  res.json({
    id: 1,
    created_at: new Date(),
  });
});

// 4. Create a custom error handler
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
