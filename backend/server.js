import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.js';
import { env } from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, '..')));

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Undangan running at http://localhost:${PORT}`);
    console.log(`Dashboard : http://localhost:${PORT}/dashboard.html`);
});
