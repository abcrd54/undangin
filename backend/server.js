import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashAppKey, env } from './database.js';
import sessionRouter from './routes/session.js';
import userRouter from './routes/user.js';
import statsRouter from './routes/stats.js';
import commentsRouter from './routes/comments.js';
import configRouter from './routes/config.js';
import guestsRouter from './routes/guests.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

app.use('/api', sessionRouter);
app.use('/api', userRouter);
app.use('/api', statsRouter);
app.use('/api', commentsRouter);
app.use('/api', configRouter);
app.use('/api', guestsRouter);

app.use(express.static(join(__dirname, '..')));

app.get('/migrate', (req, res) => {
    const { hash } = req.query;
    const expected = hashAppKey(env.APP_KEY);

    if (hash === expected) {
        res.json({ data: { status: true, message: 'Use SQL migration file instead. Run schema.sql in Supabase SQL Editor.' } });
    } else {
        res.status(403).json({ error: ['Invalid hash'] });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
});

const PORT = env.PORT || 3000;

if (process.env.VERCEL) {
    export default app;
} else {
    app.listen(PORT, () => {
        console.log(`Undangan running at http://localhost:${PORT}`);
        console.log(`Dashboard : http://localhost:${PORT}/dashboard.html`);
    });
}