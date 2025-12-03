const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await c.connect();
    await c.query('ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "mediaId" TEXT;');
    console.log('Column mediaId added (or already exists).');
  } catch (e) {
    console.error('[PATCH ERROR]', e.message);
    process.exit(1);
  } finally {
    await c.end();
  }
})();
