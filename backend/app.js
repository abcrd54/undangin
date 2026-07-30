import express from 'express';
import { hashAppKey, env } from './database.js';
import sessionRouter from './routes/session.js';
import userRouter from './routes/user.js';
import statsRouter from './routes/stats.js';
import commentsRouter from './routes/comments.js';
import configRouter from './routes/config.js';
import guestsRouter from './routes/guests.js';

const app = express();

app.use(express.json());

app.use('/api', sessionRouter);
app.use('/api', userRouter);
app.use('/api', statsRouter);
app.use('/api', commentsRouter);
app.use('/api', configRouter);
app.use('/api', guestsRouter);

const migrate = (req, res) => {
    const { hash } = req.query;
    const expected = hashAppKey(env.APP_KEY);

    if (hash === expected) {
        return res.json({ data: { status: true, message: 'Use SQL migration file instead. Run schema.sql in Supabase SQL Editor.' } });
    }

    return res.status(403).json({ error: ['Invalid hash'] });
};

app.get('/migrate', migrate);
app.get('/api/migrate', migrate);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
});

export default app;
