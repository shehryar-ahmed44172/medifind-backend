/**
 * Creates a signed-in session file for a DEMO account (email ending @medifind.test),
 * used to open the debug mobile app on an emulator without typing credentials.
 *
 *   npx ts-node scripts/demo-session.ts <demo-email> <output.json>
 *
 * The mobile debug build picks the file up via DemoSessionLoader. Refuses any
 * account that is not a demo account.
 */
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import prisma from '../src/lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../src/utils/jwt';

const [email, output] = process.argv.slice(2);

(async () => {
  if (!email || !output) {
    console.error('Usage: ts-node scripts/demo-session.ts <demo-email> <output.json>');
    process.exit(1);
  }
  if (!email.endsWith('@medifind.test')) {
    console.error('Only demo accounts (@medifind.test) can be used.');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Demo account not found: ${email}. Run npm run db:seed-demo first.`);
    process.exit(1);
  }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const token = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  fs.writeFileSync(output, JSON.stringify({ token, refreshToken, userId: user.id, role: user.role }));
  console.log(`Session for ${user.fullName} (${user.role}) written to ${output}`);
  await prisma.$disconnect();
})();
