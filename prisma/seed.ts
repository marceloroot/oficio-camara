import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcrypt";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}

async function main() {
  const nome     = process.env.MASTER_NOME     || 'Master';
  const email    = process.env.MASTER_EMAIL    || 'adminprefeitura@gmail.com';
  const password = process.env.MASTER_PASSWORD || '@adminPrefeitura';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      nome,
      email,
      password: hashPassword(password),
      role: 'MASTER',
    },
  });

  console.log('Usuário master criado ou existente:', {
    id:    user.id,
    nome:  user.nome,
    email: user.email,
    role:  user.role,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
