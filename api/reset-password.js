const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
(async () => {
  const prisma = new PrismaClient();
  const email = "ghawk075@gmail.com";
  const newPassword = "Chewie2017";
  const hash = await bcrypt.hash(newPassword, 12);
  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { passwordHash: hash }
  });
  console.log("Password updated for", user.email, "userId:", user.id);
  await prisma.$disconnect();
})();
