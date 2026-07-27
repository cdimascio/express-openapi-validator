import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { middleware } from '../../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

app.listen(3001, () => {
    console.log('ESM Server running on port 3001');

});
