// src/app/api/upload/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { minioClient, BUCKET_NAME } from "@/lib/minio"
import { prismaClient as prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    }

    const { id } = await params

    const anexo = await prisma.anexo.findUnique({ where: { id } })
    if (!anexo) {
      return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 })
    }

    // Gera URL assinada válida por 15 minutos
    const url = await minioClient.presignedGetObject(BUCKET_NAME, anexo.url, 15 * 60)

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Erro ao gerar URL:", error)
    return NextResponse.json({ error: "Erro ao gerar URL do arquivo." }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any)?.id as string
    const { id } = await params

    const anexo = await prisma.anexo.findUnique({ where: { id } })
    if (!anexo) {
      return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 })
    }

    if (anexo.enviadoPorId !== userId) {
      return NextResponse.json(
        { error: "Apenas quem enviou o arquivo pode excluí-lo." },
        { status: 403 }
      )
    }

    // Remove do MinIO
    await minioClient.removeObject(BUCKET_NAME, anexo.url)

    // Remove do banco
    await prisma.anexo.delete({ where: { id } })

    // Registra no histórico se tiver oficioId
    if (anexo.oficioId) {
      await prisma.historico.create({
        data: {
          oficioId: anexo.oficioId,
          evento: "ANEXO_REMOVIDO",
          userId,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao remover anexo:", error)
    return NextResponse.json({ error: "Erro ao remover arquivo." }, { status: 500 })
  }
}