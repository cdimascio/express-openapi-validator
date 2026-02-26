const express = require('express');
const path = require('path');
const { middleware } = require('../../dist');

const app = express();

const spec = path.join(__dirname, 'openapi.yaml');

app.use(
    middleware({
        apiSpec: spec,
        validateRequests: true,
        validateResponses: true,
    })
);

app.get('/test', (req, res) => {
    res.json({ result: 'OK' });
});

app.listen(3000, () => {
    console.log('CJS Server running on port 3000');

});
