const bcrypt = require("bcryptjs");
const { Client } = require("pg");

(async () => {
  const NEW_PASSWORD = process.env.NEW_PASSWORD || "SecurePass123!";
  const email = process.env.USER_EMAIL || "ghawk075@gmail.com";
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);

  const c = new Client({
    connectionString: "postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require",
    ssl: { rejectUnauthorized: false }
  });

  await c.connect();
  const r = await c.query('UPDATE users SET "passwordHash"=$1 WHERE lower(email)=lower($2)', [passwordHash, email]);
  console.log("Rows updated:", r.rowCount);
  await c.end();
})().catch(err => { console.error(err); process.exit(1); });