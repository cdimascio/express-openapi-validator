const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const { pets } = require('./pets');
const { OpenApiValidator } = require('express-openapi-validator');
const app = express();

// 1. Install bodyParsers for the request types your API will support
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use(logger('dev'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const spec = path.join(__dirname, 'example.yaml');
app.use('/spec', express.static(spec));

// 2. Install the OpenApiValidator on your express app
new OpenApiValidator({
  apiSpec: './example.yaml',
  validateResponses: true,
  // securityHandlers: {
  //   ApiKeyAuth: (req, scopes, schema) => true,
  // },
})
  .install(app)
  .then(() => {
    // 3. Add routes
    app.get('/v1/pets', function(req, res, next) {
      res.json(pets.findAll(req.query));
    });

    app.post('/v1/pets', function(req, res, next) {
      res.json(pets.add({ ...req.body }));
    });

    app.get('/v1/pets/:id', function(req, res, next) {
      const pet = pets.findById(req.params.id);
      return pet
        ? res.json(pet)
        : res.status(404).json({ message: 'not found', errors: [] });
    });

    // 3a. Add a route upload file(s)
    app.post('/v1/pets/:id/photos', function(req, res, next) {
      // DO something with the file
      // files are found in req.files
      // non file multipar params are in req.body['my-param']
      console.log(req.files);

      res.json({
        files_metadata: req.files.map(f => ({
          originalname: f.originalname,
          encoding: f.encoding,
          mimetype: f.mimetype,
          // Buffer of file conents
          // buffer: f.buffer,
        })),
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

    const server = http.createServer(app);
    server.listen(3000);
    console.log('Listening on port 3000');
  });
module.exports = app;
