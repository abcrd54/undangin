import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
    const env = { ...process.env };

    const envPath = join(__dirname, '.env');
    if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        for (const line of envContent.split('\n').filter(Boolean)) {
            const idx = line.indexOf('=');
            const key = line.slice(0, idx).trim();
            const val = line.slice(idx + 1).trim();
            if (!env[key]) {
                env[key] = val;
            }
        }
    }

    return env;
}

const env = loadEnv();

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

export function generateAccessKey() {
    return randomBytes(24).toString('hex');
}

export function hashAppKey(key) {
    return createHash('sha3-512').update(key).digest('hex');
}

export default supabase;
export { env };