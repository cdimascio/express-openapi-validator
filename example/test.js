const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const app = express();

// 1. Import the express-openapi-validator library
const OpenApiValidator = require('express-openapi-validator').OpenApiValidator;

// 2. Set up body parsers for the request body types you expect
//    Must be specified prior to endpoints in 5.
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(logger('dev'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 3. (optionally) Serve the OpenAPI spec
const spec = path.join(__dirname, 'example.yaml');
app.use('/spec', express.static(spec));

// 4. Install the OpenApiValidator onto your express app
new OpenApiValidator({
  apiSpec: './example.yaml',
  validateResponses: true, // <-- to validate responses
  // securityHandlers: { ... }, // <-- if using security
  // unknownFormats: ['my-format'] // <-- to provide custom formats
})
  .install(app)
  .then(app => {
    // 5. Define routes using Express
    app.get('/v1/pets', function(req, res, next) {
      res.json([{ id: 1, name: 'max' }, { id: 2, name: 'mini' }]);
    });

    app.post('/v1/pets', function(req, res, next) {
      res.json({ name: 'sparky' });
    });

    app.get('/v1/pets/:id', function(req, res, next) {
      res.json({ id: req.params.id, name: 'sparky' });
    });

    // 5a. Define route(s) to upload file(s)
    app.post('/v1/pets/:id/photos', function(req, res, next) {
      // files are found in req.files
      // non-file multipart params can be found as such: req.body['my-param']

      res.json({
        files_metadata: req.files.map(f => ({
          originalname: f.originalname,
          encoding: f.encoding,
          mimetype: f.mimetype,
          // Buffer of file conents
          buffer: f.buffer,
        })),
      });
    });

    // 6. Create an Express error handler
    app.use((err, req, res, next) => {
      // 7. Customize errors
      res.status(err.status || 500).json({
        message: err.message,
        errors: err.errors,
      });
    });
  });

const server = http.createServer(app);
server.listen(3000);
console.log('Listening on port 3000');
