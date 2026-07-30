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

async function getUserConfig(userId) {
    const { data } = await supabase
        .from('users')
        .select('is_filter, is_confetti_animation, can_reply, can_edit, can_delete, tenor_key')
        .eq('id', userId)
        .single();
    return data;
}

function formatComment(row, replies = []) {
    return {
        uuid: String(row.id),
        own: String(row.id),
        name: row.name,
        presence: row.presence === 1,
        comment: row.comment || null,
        created_at: row.created_at,
        is_admin: false,
        is_parent: true,
        gif_url: row.gif_url || null,
        ip: null,
        user_agent: null,
        comments: replies.map((r) => ({
            ...formatComment(r),
            is_parent: false,
        })),
        like_count: row.like_count || 0,
    };
}

// GET /api/v2/comment
router.get('/v2/comment', authComment, async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: ['Unauthorized'] });
        }

        const per = parseInt(req.query.per) || 10;
        const next = parseInt(req.query.next) || 0;

        const { count: total } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        const { data: comments } = await supabase
            .from('comments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(next, next + per - 1);

        const lists = [];
        for (const c of (comments || [])) {
            const { count: likes } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('comment_id', c.id);

            const { data: replies } = await supabase
                .from('replies')
                .select('*')
                .eq('comment_id', c.id)
                .order('created_at', { ascending: true });

            lists.push(formatComment({ ...c, like_count: likes || 0 }, replies || []));
        }

        res.json({
            data: {
                count: total || 0,
                lists,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

// POST /api/comment
router.post('/comment', authComment, async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: ['Unauthorized'] });
        }

        const config = await getUserConfig(userId);
        const { id: parentId, name, presence, comment, gif_id } = req.body;

        if (!name) {
            return res.status(400).json({ error: ['Name is required'] });
        }

        const filteredComment = config.is_filter ? filterBadWords(comment || '') : (comment || '');

        if (parentId) {
            // Reply
            const { data: parent } = await supabase.from('comments').select('*').eq('id', parentId).eq('user_id', userId).single();
            if (!parent) {
                return res.status(404).json({ error: ['Comment not found'] });
            }

            const { data: created, error } = await supabase
                .from('replies')
                .insert({
                    comment_id: parseInt(parentId),
                    user_id: userId,
                    name,
                    comment: filteredComment,
                    gif_url: gif_id || null,
                })
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: [error.message] });
            }

            res.status(201).json({
                data: {
                    uuid: String(created.id),
                    own: String(created.id),
                    name: created.name,
                    presence: false,
                    comment: created.comment,
                    created_at: created.created_at,
                    is_admin: false,
                    is_parent: false,
                    gif_url: created.gif_url || null,
                    ip: null,
                    user_agent: null,
                    comments: [],
                    like_count: 0,
                },
            });
        } else {
            // Top-level comment
            const { data: created, error } = await supabase
                .from('comments')
                .insert({
                    user_id: userId,
                    name,
                    presence: presence ? 1 : 0,
                    comment: filteredComment,
                    gif_url: gif_id || null,
                })
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: [error.message] });
            }

            res.status(201).json({
                data: {
                    uuid: String(created.id),
                    own: String(created.id),
                    name: created.name,
                    presence: created.presence === 1,
                    comment: created.comment,
                    created_at: created.created_at,
                    is_admin: false,
                    is_parent: true,
                    gif_url: created.gif_url || null,
                    ip: null,
                    user_agent: null,
                    comments: [],
                    like_count: 0,
                },
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

// PUT /api/comment/:id
router.put('/comment/:id', authComment, async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: ['Unauthorized'] });
        }

        const config = await getUserConfig(userId);
        if (!config.can_edit) {
            return res.status(403).json({ error: ['Editing is disabled'] });
        }

        const { id } = req.params;
        const { presence, comment, gif_id } = req.body;

        const existing = await supabase.from('comments').select('*').eq('id', id).eq('user_id', userId).single();
        if (!existing.data) {
            return res.status(404).json({ error: ['Comment not found'] });
        }

        const updateData = { updated_at: new Date().toISOString() };
        if (presence !== undefined) updateData.presence = presence ? 1 : 0;
        if (comment !== undefined) updateData.comment = config.is_filter ? filterBadWords(comment) : comment;
        if (gif_id !== undefined) updateData.gif_url = gif_id || null;

        const { error } = await supabase.from('comments').update(updateData).eq('id', id);

        if (error) {
            return res.status(500).json({ error: [error.message] });
        }

        res.json({ data: { status: true } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

// DELETE /api/comment/:id
router.delete('/comment/:id', authComment, async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: ['Unauthorized'] });
        }

        const config = await getUserConfig(userId);
        if (!config.can_delete) {
            return res.status(403).json({ error: ['Deletion is disabled'] });
        }

        const { id } = req.params;

        const { data: existing } = await supabase.from('comments').select('*').eq('id', id).eq('user_id', userId).single();
        if (!existing) {
            return res.status(404).json({ error: ['Comment not found'] });
        }

        await supabase.from('likes').delete().eq('comment_id', id);
        await supabase.from('replies').delete().eq('comment_id', id);
        const { error } = await supabase.from('comments').delete().eq('id', id);

        if (error) {
            return res.status(500).json({ error: [error.message] });
        }

        res.json({ data: { status: true } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

// POST /api/comment/:id (like)
router.post('/comment/:id', authComment, async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: ['Unauthorized'] });
        }

        const { id } = req.params;
        const sessionId = req.headers['x-session-id'] || req.ip;

        const { data: existing } = await supabase.from('comments').select('*').eq('id', id).eq('user_id', userId).single();
        if (!existing) {
            return res.status(404).json({ error: ['Comment not found'] });
        }

        const { data: liked } = await supabase.from('likes').select('*').eq('comment_id', id).eq('session_id', sessionId).single();

        if (liked) {
            return res.status(409).json({ error: ['Already liked'] });
        }

        const { data: created, error } = await supabase
            .from('likes')
            .insert({ comment_id: id, user_id: userId, session_id: sessionId })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: [error.message] });
        }

        res.status(201).json({ data: { uuid: String(created.id) } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

// PATCH /api/comment/:id (unlike)
router.patch('/comment/:id', authComment, async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: ['Unauthorized'] });
        }

        const { id } = req.params;
        const sessionId = req.headers['x-session-id'] || req.ip;

        const { data: liked } = await supabase.from('likes').select('*').eq('comment_id', id).eq('session_id', sessionId).single();

        if (!liked) {
            return res.status(404).json({ error: ['Like not found'] });
        }

        const { error } = await supabase.from('likes').delete().eq('id', liked.id);

        if (error) {
            return res.status(500).json({ error: [error.message] });
        }

        res.json({ data: { status: true } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: ['Internal server error'], id: Date.now().toString(36) });
    }
});

const BAD_WORDS = ['anjing', 'babi', 'bangsat', 'kontol', 'memek', 'jancok', 'ngentot', 'tolol', 'goblok', 'bego', 'setan', 'bajingan', 'keparat', 'brengsek', 'jembut', 'asu', 'cok', 'fuck', 'shit', 'asshole', 'bastard', 'dick', 'pussy'];

function filterBadWords(text) {
    let result = text;
    for (const word of BAD_WORDS) {
        const regex = new RegExp(word, 'gi');
        result = result.replace(regex, '*'.repeat(word.length));
    }
    return result;
}

export default router;