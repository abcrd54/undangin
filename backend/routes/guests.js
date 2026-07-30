import { Router } from 'express';
import supabase from '../database.js';
import { authJWT } from '../middleware/auth.js';

const router = Router();

router.get('/guests', authJWT, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('guests')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: [error.message] });
        }

        res.json({ data: data || [] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

router.post('/guests', authJWT, async (req, res) => {
    try {
        const { name, address } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: ['Name is required'] });
        }

        const { data, error } = await supabase
            .from('guests')
            .insert({
                user_id: req.user.id,
                name: name.trim(),
                address: address ? address.trim() : null,
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: [error.message] });
        }

        res.status(201).json({ data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

router.delete('/guests/:id', authJWT, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existing } = await supabase
            .from('guests')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (!existing) {
            return res.status(404).json({ error: ['Guest not found'] });
        }

        const { error } = await supabase.from('guests').delete().eq('id', id);

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