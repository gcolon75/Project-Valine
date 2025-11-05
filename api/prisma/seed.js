import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Create test user with fixed ID for auth stub
  await prisma.user.upsert({
    where: { id: 'user_123' },
    update: { 
      email: 'demo@valine.app', 
      username: 'demo_user',
      password: 'hashed_password',
      displayName: 'Valine User',
      role: 'artist',
      theme: null
    },
    create: { 
      id: 'user_123',
      email: 'demo@valine.app',
      username: 'demo_user', 
      password: 'hashed_password',
      displayName: 'Valine User',
      role: 'artist',
      theme: null
    }
  });

  const artist = await prisma.user.upsert({
    where: { email: 'artist@example.com' },
    update: {},
    create: { 
      email: 'artist@example.com', 
      username: 'artist',
      password: 'hashed_password',
      displayName: 'Demo Artist', 
      role: 'artist' 
    }
  });
  const observer = await prisma.user.upsert({
    where: { email: 'observer@example.com' },
    update: {},
    create: { 
      email: 'observer@example.com', 
      username: 'observer',
      password: 'hashed_password',
      displayName: 'Demo Observer', 
      role: 'observer' 
    }
  });
  
  // Only create scripts/auditions if they don't exist
  const scriptCount = await prisma.script.count();
  if (scriptCount === 0) {
    await prisma.script.create({
      data: { title: 'First Script', summary: 'A short logline about hope and risk.', authorId: artist.id }
    });
  }
  
  const auditionCount = await prisma.audition.count();
  if (auditionCount === 0) {
    await prisma.audition.create({
      data: { title: 'Cold Read — Lead', summary: '2 minute dramatic monologue.', hostId: observer.id }
    });
  }
  
  console.log('Seed complete.');
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
