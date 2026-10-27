// src/app/(protected)/dashboard/secretaria/[id]/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prismaClient as prisma } from "@/lib/prisma"
import { SecretariaOficioDetalheClient } from "@/components/pages/oficio/secretaria-oficio-detalhe-client"
import { marcarComoLido } from "@/lib/services/officio.service"

interface Props {
  params: Promise<{ id: string }>
}

export default async function SecretariaOficioDetalhePage({ params }: Props) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any
  const role = user?.role as string
  const userId = user?.id as string
  const secretariaId = user?.secretariaId as string

  if (role !== "SECRETARIA") redirect("/dashboard")

  const oficio = await prisma.oficio.findUnique({
    where: { id },
    include: {
      secretarias: true,
      criadoPor: { select: { id: true, nome: true, email: true } },
      respostas: {
        include: {
          respondidoPor: { select: { id: true, nome: true } },
          anexos: true,
          assinatura: { include: { signedBy: { select: { id: true, nome: true } } } },
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
      assinatura: {
        include: { signedBy: { select: { id: true, nome: true } } },
      },
      leituras: { where: { userId } },
    },
  })

  if (!oficio) notFound()

  // Verifica se pertence à secretaria do usuário
  const pertenceSecretaria = oficio.secretarias.some((sec) => sec.id === secretariaId)
  if (!pertenceSecretaria) redirect("/dashboard/secretaria")

  // Marca como lido automaticamente ao abrir
  await marcarComoLido({ oficioId: id, userId })

  return (
    <SecretariaOficioDetalheClient
      oficio={oficio}
      userId={userId}
    />
  )
}