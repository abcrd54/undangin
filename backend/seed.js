import bcrypt from 'bcryptjs';
import supabase, { generateAccessKey } from './database.js';

const email = 'admin@undangan.my.id';
const password = 'IkiJeporo1954';
const name = 'Admin';

const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();

if (existing) {
    console.log('Admin user exists, deleting and recreating...');
    await supabase.from('users').delete().eq('id', existing.id);
}

const hash = bcrypt.hashSync(password, 10);
const accessKey = generateAccessKey();

const { error } = await supabase.from('users').insert({
    email,
    password: hash,
    name,
    access_key: accessKey,
});

if (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
}

console.log('=== Admin user created ===');
console.log(`Email     : ${email}`);
console.log(`Password  : ${password}`);
console.log(`Access Key: ${accessKey}`);
console.log('');
console.log('Simpan access key ini!');