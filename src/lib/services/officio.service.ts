import { prismaClient as prisma } from "@/lib/prisma"
import { OficioStatus } from "@/generated/prisma/client"
import { criarNotificacaoOficio } from "@/lib/services/notificacao.service"
import { createHash, randomBytes } from "crypto"
import { enviarEmailNovoOficio } from "./email.service"
async function verificarAssinatura(oficioId: string) {
  const assinatura = await prisma.assinatura.findUnique({
    where: { oficioId }
  })
  if (assinatura) throw new Error("Ofício assinado não pode ser alterado.")
}


export async function criarOficio(data: {
  numero: string
  assunto: string
  descricao: string
  secretariaIds: string[]
  prazoDias: number
  userId: string
}) {
  if (data.secretariaIds.length === 0) {
    throw new Error("Selecione ao menos uma secretaria.")
  }

  // Verifica número duplicado
  const existente = await prisma.oficio.findUnique({
    where: { numero: data.numero },
    select: { id: true },
  })
  if (existente) {
    throw new Error(`O número de ofício "${data.numero}" já está em uso.`)
  }

  const oficio = await prisma.oficio.create({
    data: {
      numero: data.numero,
      assunto: data.assunto,
      descricao: data.descricao,
      secretarias: {
        connect: data.secretariaIds.map((id) => ({ id })),
      },
      prazoDias: data.prazoDias,
      criadoPorId: data.userId,
    },
  })

  await prisma.historico.create({
    data: {
      oficioId: oficio.id,
      evento: "OFICIO_CRIADO",
      userId: data.userId,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: "CREATE",
      entity: "OFICIO",
      entityId: oficio.id,
    },
  })

  // Email (sem await — não bloqueia)
  const [secretarias, criador] = await Promise.all([
    prisma.secretaria.findMany({
      where: {
        id: { in: data.secretariaIds },
      },
      include: {
        users: {
          where: { role: "SECRETARIA", ativo: true },
          select: { email: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: data.userId },
      select: { nome: true },
    }),
  ])

  for (const secretaria of secretarias) {
    if (secretaria.users.length === 0) continue

    enviarEmailNovoOficio({
      emailsSecretaria: secretaria.users.map((u) => u.email),
      nomeSecretaria: secretaria.nome,
      numeroOficio: data.numero,
      assunto: data.assunto,
      descricao: data.descricao,
      prazo: data.prazoDias,
      criadorNome: criador?.nome ?? "Promotor",
      oficioId: oficio.id,
    }).catch((err) => console.error("Erro ao enviar email:", err))
  }

  // Notificação em tempo real (sem await — não bloqueia)
  criarNotificacaoOficio({
    oficioId: oficio.id,
    secretariaIds: data.secretariaIds,
    numeroOficio: data.numero,
    assunto: data.assunto,
  }).catch((err) => console.error("Erro ao criar notificação:", err))

  return oficio
}

export async function responderOficio(data: {
  oficioId: string
  texto: string
  userId: string
}) {
  // Permite múltiplas respostas no mesmo ofício (ex.: após encaminhamento
  // ou complemento da secretaria), sem bloquear pelo status atual.

  const resposta = await prisma.resposta.create({
    data: {
      texto: data.texto,
      respondidoPorId: data.userId,
      oficioId: data.oficioId,
    },
  })

  await prisma.oficio.update({
    where: { id: data.oficioId },
    data: { status: OficioStatus.RESPONDIDO },
  })

  await prisma.historico.create({
    data: {
      oficioId: data.oficioId,
      evento: "OFICIO_RESPONDIDO",
      userId: data.userId,
    },
  })

  return resposta
}

export async function prorrogarOficio(data: {
  oficioId: string
  dias: number
  motivo: string
  userId: string
}) {
  await verificarAssinatura(data.oficioId)

  await prisma.prorrogacao.create({
    data: {
      oficioId: data.oficioId,
      diasSolicitados: data.dias,   // ← campo correto
      motivo: data.motivo,
      solicitadaPorId: data.userId, // ← campo correto
      aprovada: true,               // ← MPMG já aprova direto
      aprovadaPorId: data.userId,
    },
  })

  await prisma.historico.create({
    data: {
      oficioId: data.oficioId,
      evento: "OFICIO_PRORROGADO",
      userId: data.userId,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: "UPDATE",
      entity: "OFICIO",
      entityId: data.oficioId,
    },
  })
}

export async function assinarOficio(data: {
  oficioId: string
  userId: string
}) {
  const hash = randomBytes(32).toString("hex")

  await prisma.assinatura.create({
    data: {
      oficioId: data.oficioId,
      signedById: data.userId, // ← estava faltando
      hash,
    },
  })

  await prisma.historico.create({
    data: {
      oficioId: data.oficioId,
      evento: "OFICIO_ASSINADO",
      userId: data.userId,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: "SIGN",
      entity: "OFICIO",
      entityId: data.oficioId,
    },
  })
}

export async function removerProrrogacao(data: {
  prorrogacaoId: string
  oficioId: string
  userId: string
}) {
  await verificarAssinatura(data.oficioId)

  await prisma.prorrogacao.delete({
    where: { id: data.prorrogacaoId }
  })

  await prisma.historico.create({
    data: {
      oficioId: data.oficioId,
      evento: "PRORROGACAO_REMOVIDA",
      userId: data.userId,
    },
  })
}

export async function editarOficio(data: {
  oficioId: string
  assunto: string
  descricao: string
  prazoDias: number
  secretariaIds?: string[]
  observacaoRedirecionamento?: string
  userId: string
}) {
  await verificarAssinatura(data.oficioId)

  if (data.secretariaIds && data.secretariaIds.length === 0) {
    throw new Error("Selecione ao menos uma secretaria.")
  }

  const oficioAtual = data.secretariaIds
    ? await prisma.oficio.findUnique({
        where: { id: data.oficioId },
        include: { secretarias: { select: { id: true } } },
      })
    : null

  await prisma.oficio.update({
    where: { id: data.oficioId },
    data: {
      assunto: data.assunto,
      descricao: data.descricao,
      prazoDias: data.prazoDias,
      ...(data.secretariaIds
        ? {
            secretarias: {
              set: data.secretariaIds.map((id) => ({ id })),
            },
          }
        : {}),
    },
  })

  const houveMudancaSecretarias = !!(
    data.secretariaIds &&
    oficioAtual &&
    (oficioAtual.secretarias.length !== data.secretariaIds.length ||
      oficioAtual.secretarias.some((sec) => !data.secretariaIds?.includes(sec.id)))
  )

  await prisma.historico.create({
    data: {
      oficioId: data.oficioId,
      evento: "OFICIO_EDITADO",
      userId: data.userId,
    },
  })

  if (houveMudancaSecretarias) {
    await prisma.historico.create({
      data: {
        oficioId: data.oficioId,
        evento: data.observacaoRedirecionamento
          ? `OFICIO_REDIRECIONADO_OBS|${data.observacaoRedirecionamento}`
          : "OFICIO_REDIRECIONADO",
        userId: data.userId,
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: "UPDATE",
      entity: "OFICIO",
      entityId: data.oficioId,
    },
  })
}

export async function atualizarSecretariasOficio(data: {
  oficioId: string
  secretariaIds: string[]
  observacaoRedirecionamento?: string
  userId: string
}) {
  if (data.secretariaIds.length === 0) {
    throw new Error("O ofício deve ter ao menos uma secretaria.")
  }

  const oficioAtual = await prisma.oficio.findUnique({
    where: { id: data.oficioId },
    include: {
      secretarias: { select: { id: true } },
      criadoPor: { select: { nome: true } },
    },
  })

  if (!oficioAtual) throw new Error("Ofício não encontrado.")

  const idsAnteriores = oficioAtual.secretarias.map((sec) => sec.id)
  const novasSecretariaIds = data.secretariaIds.filter((id) => !idsAnteriores.includes(id))

  const houveMudancaSecretarias =
    idsAnteriores.length !== data.secretariaIds.length ||
    oficioAtual.secretarias.some((sec) => !data.secretariaIds.includes(sec.id))

  await prisma.oficio.update({
    where: { id: data.oficioId },
    data: {
      secretarias: {
        set: data.secretariaIds.map((id) => ({ id })),
      },
      // Reabre para a nova secretaria poder responder após o encaminhamento
      ...(houveMudancaSecretarias ? { status: OficioStatus.PENDENTE } : {}),
    },
  })

  if (houveMudancaSecretarias) {
    await prisma.historico.create({
      data: {
        oficioId: data.oficioId,
        evento: data.observacaoRedirecionamento
          ? `OFICIO_REDIRECIONADO_OBS|${data.observacaoRedirecionamento}`
          : "OFICIO_REDIRECIONADO",
        userId: data.userId,
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: "UPDATE",
      entity: "OFICIO_SECRETARIAS",
      entityId: data.oficioId,
    },
  })

  // Avisa só as secretarias recém-incluídas
  if (novasSecretariaIds.length > 0) {
    const secretariasNovas = await prisma.secretaria.findMany({
      where: { id: { in: novasSecretariaIds } },
      include: {
        users: {
          where: { role: "SECRETARIA", ativo: true },
          select: { email: true },
        },
      },
    })

    for (const secretaria of secretariasNovas) {
      if (secretaria.users.length === 0) continue

      enviarEmailNovoOficio({
        emailsSecretaria: secretaria.users.map((u) => u.email),
        nomeSecretaria: secretaria.nome,
        numeroOficio: oficioAtual.numero,
        assunto: oficioAtual.assunto,
        descricao: oficioAtual.descricao,
        prazo: oficioAtual.prazoDias,
        criadorNome: oficioAtual.criadoPor?.nome ?? "Promotor",
        oficioId: oficioAtual.id,
      }).catch((err) => console.error("Erro ao enviar email de encaminhamento:", err))
    }

    criarNotificacaoOficio({
      oficioId: oficioAtual.id,
      secretariaIds: novasSecretariaIds,
      numeroOficio: oficioAtual.numero,
      assunto: oficioAtual.assunto,
      titulo: `Ofício encaminhado: ${oficioAtual.numero}`,
      mensagem: `Um ofício foi encaminhado para sua secretaria: ${oficioAtual.assunto}`,
    }).catch((err) => console.error("Erro ao criar notificação de encaminhamento:", err))
  }
}



///Secretarias



// ── Marcar como lido ─────────────────────────────────────────────────────────
export async function marcarComoLido(data: {
  oficioId: string
  userId: string
}) {
  const jaLeu = await prisma.leitura.findFirst({
    where: { oficioId: data.oficioId, userId: data.userId },
  })

  if (jaLeu) return // já marcado, não duplica

  await prisma.leitura.create({
    data: {
      oficioId: data.oficioId,
      userId: data.userId,
    },
  })
}

// ── Solicitar prorrogação ────────────────────────────────────────────────────
export async function solicitarProrrogacao(data: {
  oficioId: string
  diasSolicitados: number
  motivo: string
  userId: string
}) {


  // Verifica se já tem prorrogação pendente
  const pendente = await prisma.prorrogacao.findFirst({
    where: { oficioId: data.oficioId, aprovada: null },
  })

  if (pendente) throw new Error("Já existe uma solicitação de prorrogação pendente para este ofício.")

  await prisma.prorrogacao.create({
    data: {
      oficioId: data.oficioId,
      diasSolicitados: data.diasSolicitados,
      motivo: data.motivo,
      solicitadaPorId: data.userId,
    },
  })

  await prisma.historico.create({
    data: {
      oficioId: data.oficioId,
      evento: "PRORROGACAO_SOLICITADA",
      userId: data.userId,
    },
  })
}

// ── Assinar resposta ─────────────────────────────────────────────────────────
export async function assinarResposta(data: {
  respostaId: string
  oficioId: string
  userId: string
}) {
  const resposta = await prisma.resposta.findUnique({
    where: { id: data.respostaId },
    include: { oficio: true },
  })

  if (!resposta) throw new Error("Resposta não encontrada.")

  const jaAssinada = await prisma.assinatura.findUnique({
    where: { respostaId: data.respostaId },
  })

  if (jaAssinada) throw new Error("Resposta já assinada.")

  const salt = randomBytes(8).toString("hex")
  const conteudo = JSON.stringify({
    respostaId: data.respostaId,
    oficioId: data.oficioId,
    texto: resposta.texto,
    signedBy: data.userId,
    signedAt: new Date().toISOString(),
    salt,
  })

  const hash = createHash("sha256").update(conteudo).digest("hex")

  await prisma.assinatura.create({
    data: {
      respostaId: data.respostaId,
      signedById: data.userId,
      hash,
    },
  })

  await prisma.historico.create({
    data: {
      oficioId: data.oficioId,
      evento: "RESPOSTA_ASSINADA",
      userId: data.userId,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: "SIGN",
      entity: "RESPOSTA",
      entityId: data.respostaId,
    },
  })
}

export async function editarResposta(data: {
  respostaId: string
  oficioId: string
  texto: string
  userId: string
}) {
  // Verifica se a resposta já foi assinada
  const assinatura = await prisma.assinatura.findUnique({
    where: { respostaId: data.respostaId },
  })
  if (assinatura) throw new Error("Resposta assinada não pode ser editada.")

  await prisma.resposta.update({
    where: { id: data.respostaId },
    data: { texto: data.texto },
  })

  await prisma.historico.create({
    data: {
      oficioId: data.oficioId,
      evento: "RESPOSTA_EDITADA",
      userId: data.userId,
    },
  })
}