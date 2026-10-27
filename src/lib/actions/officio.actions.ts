"use server"
import { getServerSession } from "next-auth"
import { atualizarSecretariasOficio, criarOficio, editarOficio, editarResposta, removerProrrogacao } from "@/lib/services/officio.service"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { menuByRole } from "@/lib/permissions"



import {
  marcarComoLido,
  solicitarProrrogacao,
  assinarResposta,
} from "@/lib/services/officio.service"

import { responderOficio, prorrogarOficio, assinarOficio } from "@/lib/services/officio.service"
import { revalidatePath } from "next/cache"
export async function removerProrrogacaoAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string

  await removerProrrogacao({
    prorrogacaoId: formData.get("prorrogacaoId") as string,
    oficioId: formData.get("oficioId") as string,
    userId,
  })

  revalidatePath(`/officio/${formData.get("oficioId")}`)
}
export async function criarOficioAction(formData: FormData) {
    const session = await getServerSession(authOptions)
    
  if (!session) throw new Error("Não autenticado")
const role =
    ((session.user as unknown) as { role?: keyof typeof menuByRole })?.role ?? ("MASTER" as keyof typeof menuByRole);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string


  if (!userId) throw new Error("ID do usuário não encontrado na sessão")
  if (role !== "MPMG")
    throw new Error("Sem permissão")

  const secretariaIds = formData
    .getAll("secretariaIds")
    .map((value) => String(value))
    .filter(Boolean)
  const secretariaIdLegada = formData.get("secretariaId")

  if (secretariaIds.length === 0 && typeof secretariaIdLegada === "string" && secretariaIdLegada) {
    secretariaIds.push(secretariaIdLegada)
  }

  await criarOficio({
    numero: formData.get("numero") as string,
    assunto: formData.get("assunto") as string,
    descricao: formData.get("descricao") as string,
    secretariaIds,
    prazoDias: Number(formData.get("prazoDias")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userId: (session.user as any)?.id 
  })

  redirect("/officio")
}


export async function responderOficioAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string
  if (!userId) throw new Error("ID do usuário não encontrado")

  await responderOficio({
    oficioId: formData.get("oficioId") as string,
    texto: formData.get("texto") as string,
    userId,
  })

  revalidatePath(`/officio/${formData.get("oficioId")}`)
}

export async function prorrogarOficioAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string
  if (!userId) throw new Error("ID do usuário não encontrado")

  await prorrogarOficio({
    oficioId: formData.get("oficioId") as string,
    dias: Number(formData.get("dias")),
    motivo: formData.get("motivo") as string,
    userId,
  })

  revalidatePath(`/officio/${formData.get("oficioId")}`)
}

export async function assinarOficioAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string
  if (!userId) throw new Error("ID do usuário não encontrado")

  await assinarOficio({
    oficioId: formData.get("oficioId") as string,
    userId,
  })

  revalidatePath(`/officio/${formData.get("oficioId")}`)
}

export async function editarOficioAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string
  const secretariaIds = formData
    .getAll("secretariaIds")
    .map((value) => String(value))
    .filter(Boolean)
  const observacaoRedirecionamento = (formData.get("observacaoRedirecionamento") as string | null)?.trim()

  await editarOficio({
    oficioId: formData.get("oficioId") as string,
    assunto: formData.get("assunto") as string,
    descricao: formData.get("descricao") as string,
    prazoDias: Number(formData.get("prazoDias")),
    ...(secretariaIds.length > 0 ? { secretariaIds } : {}),
    ...(observacaoRedirecionamento ? { observacaoRedirecionamento } : {}),
    userId,
  })

  revalidatePath(`/officio/${formData.get("oficioId")}`)
}

export async function atualizarSecretariasOficioAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any)?.role as string

  if (role !== "MASTER" && role !== "MPMG") {
    throw new Error("Sem permissão para alterar secretarias do ofício.")
  }

  const secretariaIds = formData
    .getAll("secretariaIds")
    .map((value) => String(value))
    .filter(Boolean)
  const observacaoRedirecionamento = (formData.get("observacaoRedirecionamento") as string | null)?.trim()

  await atualizarSecretariasOficio({
    oficioId: formData.get("oficioId") as string,
    secretariaIds,
    ...(observacaoRedirecionamento ? { observacaoRedirecionamento } : {}),
    userId,
  })

  revalidatePath(`/officio/${formData.get("oficioId")}`)
}

// Adicione essas funções ao src/lib/actions/oficio.action.ts
//SECRETARIA

// ── Marcar ofício como lido ──────────────────────────────────────────────────
export async function marcarComoLidoAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string

  await marcarComoLido({
    oficioId: formData.get("oficioId") as string,
    userId,
  })

  revalidatePath(`/dashboard/officio/${formData.get("oficioId")}`)
  revalidatePath("/dashboard/secretaria")
}

// ── Solicitar prorrogação (Secretaria solicita, MPMG aprova) ─────────────────
export async function solicitarProrrogacaoAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any)?.role as string

  if (role !== "SECRETARIA") throw new Error("Apenas a secretaria pode solicitar prorrogação.")

  await solicitarProrrogacao({
    oficioId: formData.get("oficioId") as string,
    diasSolicitados: Number(formData.get("diasSolicitados")),
    motivo: formData.get("motivo") as string,
    userId,
  })

  revalidatePath(`/officio/${formData.get("oficioId")}`)
}

// ── Assinar resposta ─────────────────────────────────────────────────────────
export async function assinarRespostaAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string

  await assinarResposta({
    respostaId: formData.get("respostaId") as string,
    oficioId: formData.get("oficioId") as string,
    userId,
  })

  revalidatePath(`/officio/${formData.get("oficioId")}`)
}

// ── Aprovar ou rejeitar prorrogação (MPMG / MASTER) ──────────────────────────
export async function avaliarProrrogacaoAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any)?.role as string

  if (role !== "MPMG" && role !== "MASTER") {
    throw new Error("Sem permissão para avaliar prorrogações.")
  }

  const { prismaClient: prisma } = await import("@/lib/prisma")
  const prorrogacaoId = formData.get("prorrogacaoId") as string
  const oficioId = formData.get("oficioId") as string
  const aprovada = formData.get("aprovada") === "true"

  const prorrogacao = await prisma.prorrogacao.findUnique({
    where: { id: prorrogacaoId },
    select: { id: true, aprovada: true, oficioId: true },
  })

  if (!prorrogacao) throw new Error("Solicitação de prorrogação não encontrada.")
  if (prorrogacao.aprovada !== null) throw new Error("Esta prorrogação já foi avaliada.")

  await prisma.prorrogacao.update({
    where: { id: prorrogacaoId },
    data: {
      aprovada,
      aprovadaPorId: userId,
    },
  })

  await prisma.historico.create({
    data: {
      oficioId: oficioId || prorrogacao.oficioId,
      evento: aprovada ? "PRORROGACAO_APROVADA" : "PRORROGACAO_REJEITADA",
      userId,
    },
  })

  revalidatePath(`/officio/${oficioId || prorrogacao.oficioId}`)
}
export async function editarRespostaAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string

  await editarResposta({
    respostaId: formData.get("respostaId") as string,
    oficioId: formData.get("oficioId") as string,
    texto: formData.get("texto") as string,
    userId,
  })

  revalidatePath(`/dashboard/secretaria/${formData.get("oficioId")}`)
}