
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load local environment. .env.local wins when both files define a key.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL in .env.local or .env');
    process.exit(1);
}

// Modify connection string for Session Pooler (port 5432) if needed, 
// but Supabase Transaction Pooler (6543) often supports simple queries.
// Let's try as is first.

const client = new pg.Client({
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
