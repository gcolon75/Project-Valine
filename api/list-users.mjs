import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const users = await prisma.user.findMany({ select:{ id:true,email:true,username:true } });
console.log("USERS:", users);
await prisma.$disconnect();
