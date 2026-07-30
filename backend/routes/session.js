import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase, { env } from '../database.js';

const router = Router();

router.post('/session', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: ['Email and password are required'] });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: ['Invalid credentials'] });
        }

        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: ['Invalid credentials'] });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            env.JWT_SECRET,
            { expiresIn: '7d' },
        );

        res.json({ data: { token } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

export default router;