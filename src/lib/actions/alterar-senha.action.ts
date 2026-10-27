"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prismaClient as prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { revalidatePath } from "next/cache"

export async function alterarSenhaAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Não autenticado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string
  if (!userId) throw new Error("Usuário não encontrado na sessão.")

  const senhaAtual = formData.get("senhaAtual") as string
  const novaSenha = formData.get("novaSenha") as string
  const confirmarSenha = formData.get("confirmarSenha") as string

  if (!senhaAtual || !novaSenha || !confirmarSenha)
    throw new Error("Preencha todos os campos.")

  if (novaSenha.length < 6)
    throw new Error("A nova senha deve ter pelo menos 6 caracteres.")

  if (novaSenha !== confirmarSenha)
    throw new Error("A nova senha e a confirmação não coincidem.")

  if (senhaAtual === novaSenha)
    throw new Error("A nova senha deve ser diferente da senha atual.")

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  })
  if (!user) throw new Error("Usuário não encontrado.")

  const senhaCorreta = await bcrypt.compare(senhaAtual, user.password)
  if (!senhaCorreta) throw new Error("Senha atual incorreta.")

  const hash = await bcrypt.hash(novaSenha, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  })

  revalidatePath("/dashboard")
}