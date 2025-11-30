const { PrismaClient } = require("@prisma/client");
(async () => {
  const p = new PrismaClient();
  const u = await p.user.findUnique({ 
    where: { email: "ghawk075@gmail.com" },
    select: { id:true,email:true,username:true,passwordHash:true }
  });
  console.log("User:", u);
  await p.$disconnect();
})();
