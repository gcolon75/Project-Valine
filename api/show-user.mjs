import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({
  where: { email: 'ghawk075@gmail.com' },
  select: { id:true,email:true,username:true,passwordHash:true }
});
console.log('VERIFY', user);
await prisma.();
