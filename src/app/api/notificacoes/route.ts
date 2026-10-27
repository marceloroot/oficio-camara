// src/app/api/notificacoes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prismaClient as prisma } from "@/lib/prisma"

// GET — busca notificações do usuário logado
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json([])

    const notificacoes = await prisma.notificacao.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        oficio: { select: { numero: true } },
      },
    })

    return NextResponse.json(notificacoes)
  } catch (error) {
    console.error("Erro ao buscar notificações:", error)
    return NextResponse.json([])
  }
}

// PATCH — marca todas como lidas
export async function PATCH() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string

  await prisma.notificacao.updateMany({
    where: { userId, lida: false },
    data: { lida: true },
  })

  return NextResponse.json({ success: true })
}