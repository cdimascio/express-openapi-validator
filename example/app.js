const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const MongoClient = require('mongodb').MongoClient;
const OpenApiValidator = require('express-openapi-validator').OpenApiValidator;
const app = express();

// 1. Install bodyParsers for the request types your API will support
app.use(bodyParser.urlencoded());
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const spec = path.join(__dirname, 'openapi.yaml');
app.use('/spec', express.static(spec));

// Connect to MongoDB before installing OpenApiValidator
const client = MongoClient.connect('mongodb://localhost:27017/example', {
  useUnifiedTopology: true,
})
  .then(client => client.db())
  .catch(e => {
    console.error(e);
    process.exit(1);
  });

// Load some dummy data
client
  .then(db =>
    db
      .collection('example')
      .insertMany([{ id: 2, name: 'sparky' }, { id: 3, name: 'spot' }]),
  )
  .catch(e => {
    console.error(e);
    process.exit(1);
  });

//  Install the OpenApiValidator on your express app
new OpenApiValidator({
  apiSpec: './example.yaml',
}).install(app);

app.get('/v1/pets', function(req, res, next) {
  client
    .then(db =>
      db
        .collection('example')
        .find()
        .toArray(),
    )
    .then(pets => res.json(pets))
    .catch(next);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

const server = http.createServer(app);
server.listen(3000);
console.log('Listening on port 3000');

module.exports = app;
