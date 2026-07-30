import { Router } from 'express';
import bcrypt from 'bcryptjs';
import supabase, { generateAccessKey } from '../database.js';
import { authJWT } from '../middleware/auth.js';

const router = Router();

router.get('/user', authJWT, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, tz, access_key, tenor_key, is_filter, is_confetti_animation, can_reply, can_edit, can_delete, created_at')
            .eq('id', req.user.id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: ['User not found'] });
        }

        res.json({ data: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

router.patch('/user', authJWT, async (req, res) => {
    try {
        const { name, old_password, new_password, tz, tenor_key, is_filter, is_confetti_animation, can_reply, can_edit, can_delete } = req.body;

        const updateData = { updated_at: new Date().toISOString() };

        if (name !== undefined) {
            updateData.name = name;
        }

        if (old_password && new_password) {
            const { data: user } = await supabase.from('users').select('password').eq('id', req.user.id).single();
            const valid = bcrypt.compareSync(old_password, user.password);
            if (!valid) {
                return res.status(400).json({ error: ['Old password is incorrect'] });
            }
            updateData.password = bcrypt.hashSync(new_password, 10);
        }

        if (tz !== undefined) {
            updateData.tz = tz;
        }

        if (tenor_key !== undefined) {
            updateData.tenor_key = tenor_key || null;
        }

        if (is_filter !== undefined) updateData.is_filter = is_filter ? 1 : 0;
        if (is_confetti_animation !== undefined) updateData.is_confetti_animation = is_confetti_animation ? 1 : 0;
        if (can_reply !== undefined) updateData.can_reply = can_reply ? 1 : 0;
        if (can_edit !== undefined) updateData.can_edit = can_edit ? 1 : 0;
        if (can_delete !== undefined) updateData.can_delete = can_delete ? 1 : 0;

        const { error } = await supabase.from('users').update(updateData).eq('id', req.user.id);

        if (error) {
            return res.status(500).json({ error: [error.message] });
        }

        res.json({ data: { status: true } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

router.put('/key', authJWT, async (req, res) => {
    try {
        const newKey = generateAccessKey();
        const { error } = await supabase.from('users').update({ access_key: newKey, updated_at: new Date().toISOString() }).eq('id', req.user.id);

        if (error) {
            return res.status(500).json({ error: [error.message] });
        }

        res.json({ data: { status: true } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

export default router;