// src/app/(protected)/dashboard/secretaria/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prismaClient as prisma } from "@/lib/prisma"
import { SecretariaOficiosClient } from "@/components/pages/oficio/secretaria-oficios-client"

export default async function SecretariaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any
  const role = user?.role as string
  const userId = user?.id as string
  const secretariaId = user?.secretariaId as string

  if (role !== "SECRETARIA") redirect("/dashboard")
  if (!secretariaId) redirect("/dashboard")

  const oficios = await prisma.oficio.findMany({
    where: {
      secretarias: {
        some: { id: secretariaId },
      },
    },
    include: {
      criadoPor: { select: { id: true, nome: true } },
      respostas: {
        select: { id: true },
      },
      prorrogacoes: true,
      leituras: {
        where: { userId },
      },
      assinatura: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <SecretariaOficiosClient
      oficios={oficios}
      userId={userId}
    />
  )
}