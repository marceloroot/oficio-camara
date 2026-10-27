"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prismaClient as prisma } from "@/lib/prisma"

export async function getSecretariasAction() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  return await prisma.secretaria.findMany({
    where: { ativa: true },
    select: { id: true, nome: true, slaDias: true },
    orderBy: { nome: "asc" },
  })
}
