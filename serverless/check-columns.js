import pg from 'pg';
const { Client } = pg;
const c = new Client({
  connectionString: 'postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
c.connect()
  .then(() => c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='profiles' ORDER BY ordinal_position"))
  .then(r => { console.log(r.rows); c.end(); })
  .catch(e => { console. error(e); c.end(); });
