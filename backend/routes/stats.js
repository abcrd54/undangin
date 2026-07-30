import { Router } from 'express';
import supabase from '../database.js';
import { authComment } from '../middleware/auth.js';

const router = Router();

async function getUserId(req) {
    if (req.user) {
        return req.user.id;
    }
    if (req.accessKey) {
        const { data } = await supabase.from('users').select('id').eq('access_key', req.accessKey).single();
        return data ? data.id : null;
    }
    return null;
}

router.get('/stats', authComment, async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: ['Unauthorized'] });
        }

        const { count: comments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        const { count: present } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('presence', 1);
        const { count: absent } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('presence', 2);

        const { data: commentIds } = await supabase.from('comments').select('id').eq('user_id', userId);
        const ids = commentIds?.map((c) => c.id) || [];
        const { count: likes } = ids.length > 0
            ? await supabase.from('likes').select('*', { count: 'exact', head: true }).in('comment_id', ids)
            : { count: 0 };

        res.json({
            data: {
                comments: comments || 0,
                likes: likes || 0,
                present: present || 0,
                absent: absent || 0,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

router.get('/download', authComment, async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: ['Unauthorized'] });
        }

        const { data: rows } = await supabase
            .from('comments')
            .select('name, presence, comment, gif_url, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        const presenceMap = { 1: 'Hadir', 2: 'Berhalangan', 0: 'Belum' };

        const csv = ['Nama,Presensi,Komentar,GIF,Tanggal']
            .concat((rows || []).map((r) => `"${r.name}","${presenceMap[r.presence] || 'Belum'}","${(r.comment || '').replace(/"/g, '""')}","${r.gif_url || ''}","${r.created_at}"`))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="comments.csv"');
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

export default router;