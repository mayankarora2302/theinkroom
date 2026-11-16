/**
 * Creates the administrator account (or resets its password).
 *
 *   npm run admin:create -- --username theartist
 *   npm run admin:create -- --username theartist --email artist@example.com
 *   npm run admin:create -- --username theartist --reset
 *
 * The admin signs in with either the username or the email.
 * The password is typed at a hidden prompt, or read from ADMIN_PASSWORD for automated setups.
 * There is no public registration endpoint; this command is the only way to create an admin.
 */
import { stdin, stdout } from 'node:process';
import readline from 'node:readline';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../services/auth.service.js';
import { getSettingsRow } from '../services/settings.service.js';
import { USERNAME_PATTERN } from '../validators/auth.js';

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    let muted = false;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (!muted) write.call(rl, s);
    };
    rl.question(question, (answer) => {
      rl.close();
      stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const usernameArg = (arg('username') ?? process.env.ADMIN_USERNAME)?.trim().toLowerCase();
  const emailArg = (arg('email') ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase();
  if (!usernameArg && !emailArg) {
    console.error('Usage: npm run admin:create -- --username theartist [--email you@example.com] [--reset]');
    process.exit(1);
  }
  if (usernameArg && !USERNAME_PATTERN.test(usernameArg)) {
    console.error('Usernames are 3–40 characters: lowercase letters, numbers, dots, underscores or hyphens.');
    process.exit(1);
  }
  if (emailArg && !z.string().email().safeParse(emailArg).success) {
    console.error(`"${emailArg}" is not a valid email address.`);
    process.exit(1);
  }
  const label = usernameArg ?? emailArg!;
  const reset = process.argv.includes('--reset');
  const existing = await prisma.adminUser.findFirst({
    where: { OR: [...(usernameArg ? [{ username: usernameArg }] : []), ...(emailArg ? [{ email: emailArg }] : [])] },
  });
  if (existing && !reset) {
    console.error(`An admin with that username or email already exists. Use --reset to change its password.`);
    process.exit(1);
  }
  if (!existing) {
    const count = await prisma.adminUser.count();
    if (count > 0 && !process.argv.includes('--additional')) {
      console.error('An administrator already exists. Pass --additional to create another one deliberately.');
      process.exit(1);
    }
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (!stdin.isTTY) {
      console.error('Set ADMIN_PASSWORD or run this command in an interactive terminal.');
      process.exit(1);
    }
    password = await promptHidden(`Password for ${label} (min ${MIN_PASSWORD_LENGTH} characters): `);
    const confirm = await promptHidden('Repeat password: ');
    if (password !== confirm) {
      console.error('Passwords do not match.');
      process.exit(1);
    }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase of several words works well.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  if (existing) {
    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash, ...(usernameArg ? { username: usernameArg } : {}), ...(emailArg ? { email: emailArg } : {}) },
      }),
      prisma.adminSession.deleteMany({ where: { adminUserId: existing.id } }),
    ]);
    console.log(`Password updated for ${label}. Existing sessions were signed out.`);
  } else {
    await prisma.adminUser.create({ data: { username: usernameArg ?? null, email: emailArg ?? null, passwordHash } });
    console.log(`Admin account created for ${label}.`);
  }
  await getSettingsRow();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
