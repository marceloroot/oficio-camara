// src/lib/services/notificacao.service.ts
import { prismaClient as prisma } from "@/lib/prisma"
import { enviarNotificacaoParaUsuario } from "@/app/api/notificacoes/stream/route"

export async function criarNotificacaoOficio({
  oficioId,
  secretariaIds,
  numeroOficio,
  assunto,
  titulo,
  mensagem,
}: {
  oficioId: string
  secretariaIds: string[]
  numeroOficio: string
  assunto: string
  titulo?: string
  mensagem?: string
}) {
  // Busca todos os usuários ativos das secretarias destinatárias
  const usuarios = await prisma.user.findMany({
    where: {
      secretariaId: { in: secretariaIds },
      ativo: true,
      role: "SECRETARIA",
    },
    select: { id: true },
    distinct: ["id"],
  })

  if (usuarios.length === 0) return

  const tituloFinal = titulo ?? `Novo Ofício: ${numeroOficio}`
  const mensagemFinal = mensagem ?? `Você recebeu um novo ofício: ${assunto}`

  // Cria notificação no banco para cada usuário da secretaria
  await prisma.notificacao.createMany({
    data: usuarios.map((u) => ({
      titulo: tituloFinal,
      mensagem: mensagemFinal,
      userId: u.id,
      oficioId,
    })),
  })

  // Envia via SSE em tempo real para cada usuário conectado
  for (const u of usuarios) {
    enviarNotificacaoParaUsuario(u.id, {
      type: "nova_notificacao",
      titulo: tituloFinal,
      mensagem: mensagemFinal,
      oficioId,
    })
  }
}