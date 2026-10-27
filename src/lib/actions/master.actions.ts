"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { prismaClient as prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

function assertMaster(role: string) {
  if (role !== "MASTER") throw new Error("Sem permissão.")
}

function getSession() {
  return getServerSession(authOptions)
}

// ── SECRETARIAS ──────────────────────────────────────────────────────────────

export async function criarSecretariaAction(formData: FormData) {
  const session = await getSession()
  if (!session) throw new Error("Não autenticado")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assertMaster((session.user as any)?.role)

  const nome = formData.get("nome") as string
  const slaDias = Number(formData.get("slaDias")) || 15

  const existente = await prisma.secretaria.findUnique({ where: { nome } })
  if (existente) throw new Error(`Já existe uma secretaria com o nome "${nome}".`)

  await prisma.secretaria.create({ data: { nome, slaDias } })
  revalidatePath("/dashboard/secretarias")
}

export async function editarSecretariaAction(formData: FormData) {
  const session = await getSession()
  if (!session) throw new Error("Não autenticado")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assertMaster((session.user as any)?.role)

  const id = formData.get("id") as string
  const nome = formData.get("nome") as string
  const slaDias = Number(formData.get("slaDias")) || 15

  await prisma.secretaria.update({ where: { id }, data: { nome, slaDias } })
  revalidatePath("/dashboard/secretarias")
}

export async function toggleSecretariaAction(formData: FormData) {
  const session = await getSession()
  if (!session) throw new Error("Não autenticado")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assertMaster((session.user as any)?.role)

  const id = formData.get("id") as string
  const atual = await prisma.secretaria.findUnique({ where: { id }, select: { ativa: true } })
  if (!atual) throw new Error("Secretaria não encontrada.")

  await prisma.secretaria.update({ where: { id }, data: { ativa: !atual.ativa } })
  revalidatePath("/dashboard/secretarias")
}

// ── USUÁRIOS ─────────────────────────────────────────────────────────────────

export async function criarUsuarioAction(formData: FormData) {
  const session = await getSession()
  if (!session) throw new Error("Não autenticado")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assertMaster((session.user as any)?.role)

  const nome = formData.get("nome") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role = formData.get("role") as "MPMG" | "SECRETARIA" | "MASTER"
  const secretariaId = formData.get("secretariaId") as string | null

  if (!nome || !email || !password || !role) throw new Error("Preencha todos os campos obrigatórios.")
  if (role === "SECRETARIA" && !secretariaId) throw new Error("Selecione uma secretaria para o usuário.")

  const existente = await prisma.user.findUnique({ where: { email } })
  if (existente) throw new Error(`Já existe um usuário com o e-mail "${email}".`)

  const hash = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      nome,
      email,
      password: hash,
      role,
      secretariaId: role === "SECRETARIA" ? secretariaId : null,
    },
  })

  revalidatePath("/dashboard/usuarios")
}

export async function editarUsuarioAction(formData: FormData) {
  const session = await getSession()
  if (!session) throw new Error("Não autenticado")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assertMaster((session.user as any)?.role)

  const id = formData.get("id") as string
  const nome = formData.get("nome") as string
  const email = formData.get("email") as string
  const role = formData.get("role") as "MPMG" | "SECRETARIA" | "MASTER"
  const secretariaId = formData.get("secretariaId") as string | null

  if (role === "SECRETARIA" && !secretariaId) throw new Error("Selecione uma secretaria para o usuário.")

  await prisma.user.update({
    where: { id },
    data: {
      nome,
      email,
      role,
      secretariaId: role === "SECRETARIA" ? secretariaId : null,
    },
  })

  revalidatePath("/dashboard/usuarios")
}

export async function toggleUsuarioAction(formData: FormData) {
  const session = await getSession()
  if (!session) throw new Error("Não autenticado")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assertMaster((session.user as any)?.role)

  const id = formData.get("id") as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionUserId = (session.user as any)?.id
  if (id === sessionUserId) throw new Error("Você não pode desativar sua própria conta.")

  // Adiciona campo ativo ao schema se não existir — por ora usa uma flag via email prefix
  // Como o schema não tem campo "ativo" em User, vamos renomear o email para bloquear login
  const user = await prisma.user.findUnique({ where: { id }, select: { email: true } })
  if (!user) throw new Error("Usuário não encontrado.")

  const isDesativado = user.email.startsWith("__disabled__")
  await prisma.user.update({
    where: { id },
    data: {
      email: isDesativado
        ? user.email.replace("__disabled__", "")
        : `__disabled__${user.email}`,
    },
  })

  revalidatePath("/dashboard/usuarios")
}

export async function redefinirSenhaAction(formData: FormData) {
  const session = await getSession()
  if (!session) throw new Error("Não autenticado")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assertMaster((session.user as any)?.role)

  const id = formData.get("id") as string
  const novaSenha = formData.get("novaSenha") as string

  if (!novaSenha || novaSenha.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.")

  const hash = await bcrypt.hash(novaSenha, 10)
  await prisma.user.update({ where: { id }, data: { password: hash } })

  revalidatePath("/dashboard/usuarios")
}