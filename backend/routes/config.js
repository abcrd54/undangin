import { Router } from 'express';
import supabase from '../database.js';
import { authAccessKey } from '../middleware/auth.js';

const router = Router();

router.get('/v2/config', authAccessKey, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('is_filter, is_confetti_animation, can_reply, can_edit, can_delete, tenor_key')
            .eq('access_key', req.accessKey)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: ['Invalid access key'] });
        }

        res.json({ data: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

export default router;