// src/app/(protected)/dashboard/oficios/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prismaClient as prisma } from "@/lib/prisma"
import { OficiosClient } from "@/components/pages/oficio/oficios-client"

export default async function OficiosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any)?.role as string

  const [oficios, secretarias] = await Promise.all([
    prisma.oficio.findMany({
      include: {
        secretarias: { select: { id: true, nome: true } },
        criadoPor: { select: { id: true, nome: true } },
        respostas: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.secretaria.findMany({
      where: { ativa: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ])

  return <OficiosClient oficios={oficios} secretarias={secretarias} role={role} />
}