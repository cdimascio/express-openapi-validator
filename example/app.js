var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var http = require('http');
// var OpenApiMiddleware = require('./middleware').OpenApiMiddleware;
var OpenApiMiddleware = require('express-middleware-openapi').OpenApiMiddleware
var app = express();

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(new OpenApiMiddleware({
    apiSpecPath: './openapi.yaml',
    validate: true,
    enableObjectCoercion: true // should be default
}).middleware());


app.get('/v1/pets', function (req, res, next) {
    console.log('at /v1/pets here');
    res.json({
        test: 'hi'
    });
});
var server = http.createServer(app);
server.listen(3000);
console.log('Listening on port 3000');
module.exports = app;
