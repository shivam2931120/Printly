
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env.local');
    process.exit(1);
}

// Remove sslmode=require from connection string as it conflicts with client options sometimes
const connectionString = process.env.DATABASE_URL.replace(/\?sslmode=require(&.*)?$/, '');

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function applyPolicies() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/create_prints_bucket.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL from:', sqlPath);
        await client.query(sql);

        console.log('Storage policies applied successfully.');
    } catch (err) {
        console.error('Error applying policies:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyPolicies();
