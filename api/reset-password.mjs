import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const email = 'ghawk075@gmail.com';
const password = 'Test123!';

try {
  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user. update({
    where: { email: email.toLowerCase() },
    data: { passwordHash: hash }
  });
  console.log('UPDATED', user.id, user. email);
} catch (e) {
  console.error('ERROR', e. message);
} finally {
  await prisma. disconnect();
}
