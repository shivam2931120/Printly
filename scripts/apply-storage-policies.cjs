
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load explicit env first, then local fallbacks. Earlier files win.
[
    process.env.DOTENV_CONFIG_PATH,
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
].filter(Boolean).forEach((envPath) => dotenv.config({ path: envPath, quiet: true }));

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env.local or .env');
    process.exit(1);
}

function normalizeConnectionString(value) {
    try {
        const url = new URL(value);
        url.searchParams.delete('sslmode');
        return url.toString();
    } catch {
        return value.replace(/([?&])sslmode=[^&]+&?/, '$1').replace(/[?&]$/, '');
    }
}

// Remove sslmode from the URL so the explicit pg SSL options below are used.
const connectionString = normalizeConnectionString(process.env.DATABASE_URL);

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
