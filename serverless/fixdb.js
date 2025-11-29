const{Client}=require("pg");
const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
(async()=>{
await c.connect();
const r=await c.query('UPDATE users SET "profileComplete"=true WHERE email IN ($1,$2)',["ghawk075@gmail.com","valinejustin@gmail.com"]);
console. log("Updated:",r.rowCount);
await c.end();
})(). catch(console.error);
