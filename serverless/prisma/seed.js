import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const artist = await prisma.user.upsert({
    where: { email: 'artist@example.com' },
    update: {},
    create: { email: 'artist@example.com', name: 'Demo Artist', role: 'artist' }
  });
  const observer = await prisma.user.upsert({
    where: { email: 'observer@example.com' },
    update: {},
    create: { email: 'observer@example.com', name: 'Demo Observer', role: 'observer' }
  });
  await prisma.script.create({
    data: { title: 'First Script', summary: 'A short logline about hope and risk.', authorId: artist.id }
  });
  await prisma.audition.create({
    data: { title: 'Cold Read — Lead', summary: '2 minute dramatic monologue.', hostId: observer.id }
  });
  console.log('Seed complete.');
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
