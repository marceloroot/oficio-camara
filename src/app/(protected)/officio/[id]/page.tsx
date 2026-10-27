// src/app/(protected)/dashboard/oficios/[id]/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prismaClient as prisma } from "@/lib/prisma"
import { OficioDetalheClient } from "@/components/pages/oficio/oficio-detalhe-client"

interface Props {
  params: Promise<{ id: string }>
}

export default async function OficioDetalhePage({ params }: Props) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any)?.role as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string

  const [oficio, secretariasDisponiveis] = await Promise.all([
    prisma.oficio.findUnique({
      where: { id },
      include: {
        secretarias: true,
        criadoPor: { select: { id: true, nome: true, email: true } },
        respostas: {
          include: {
            respondidoPor: { select: { id: true, nome: true } },
            anexos: true,
            assinatura: {
              include: {
                signedBy: { select: { id: true, nome: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        prorrogacoes: {
          include: {
            solicitadaPor: { select: { id: true, nome: true } },
            aprovadaPor: { select: { id: true, nome: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        anexos: {
          where: { respostaId: null },
          orderBy: { createdAt: "desc" },
        },
        historico: {
          orderBy: { createdAt: "asc" },
        },
        assinatura: true,
      },
    }),
    prisma.secretaria.findMany({
      where: { ativa: true },
      select: { id: true, nome: true, slaDias: true },
      orderBy: { nome: "asc" },
    }),
  ])

  if (!oficio) notFound()

  return (
    <OficioDetalheClient
      oficio={oficio}
      role={role}
      userId={userId}
      secretariasDisponiveis={secretariasDisponiveis}
    />
  )
}