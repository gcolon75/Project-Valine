import pg from 'pg';
const { Client } = pg;
const c = new Client({
  connectionString: 'postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
c.connect()
  .then(() => c.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "budgetMin" INTEGER; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "budgetMax" INTEGER;'))
  .then(() => { console.log('Columns added successfully'); c.end(); })
  .catch(e => { console.error(e); c.end(); });
