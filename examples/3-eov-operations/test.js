const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const { OpenApiValidator } = require('express-openapi-validator');

const port = 3000;
const app = express();
const apiSpec = path.join(__dirname, 'api.yaml');

// 1. Install bodyParsers for the request types your API will support
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use(logger('dev'));

app.use('/spec', express.static(apiSpec));

//  2. Install the OpenApiValidator on your express app
app.use(
  OpenApiValidator.middleware({
    apiSpec,
    validateResponses: true, // default false
    // 3. Provide the base path to the operation handlers directory
    operationHandlers: path.join(__dirname), // default false
  }),
);

// 4. Woah sweet! With auto-wired operation handlers, I don't have to declare my routes!
//    See api.yaml for x-eov-* vendor extensions

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
