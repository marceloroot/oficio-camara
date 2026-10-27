import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function createPrismaClient() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

// Definir o tipo global
declare global {
  // eslint-disable-next-line no-var
  var cachePrisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.cachePrisma) {
    global.cachePrisma = createPrismaClient();
  }
  prisma = global.cachePrisma;
}

// Exportar como prismaClient (compatibilidade com código existente)
export const prismaClient = prisma;

// Também exportar como default para flexibilidade
export default prisma;
