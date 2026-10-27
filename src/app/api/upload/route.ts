// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { randomUUID } from "crypto"
import { minioClient, BUCKET_NAME, ensureBucket } from "@/lib/minio"
import { prismaClient as prisma } from "@/lib/prisma"
import {
  enviarEmailAnexoMPMGParaSecretarias,
  enviarEmailAnexoSecretariaParaMPMG,
} from "@/lib/services/email.service"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"]
const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any)?.id as string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const role = (session.user as any)?.role as string
    const enviadoPorNome = session.user?.name ?? "Usuário"

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const oficioId = formData.get("oficioId") as string | null
    const respostaId = formData.get("respostaId") as string | null

    // Validações básicas
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
    }

    if (!oficioId && !respostaId) {
      return NextResponse.json({ error: "oficioId ou respostaId é obrigatório." }, { status: 400 })
    }

    // Validar tipo do arquivo
    const ext = "." + file.name.split(".").pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Apenas arquivos PDF, DOC e DOCX são permitidos." },
        { status: 400 }
      )
    }

    // Validar tamanho
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `O arquivo deve ter no máximo ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      )
    }

    // Resolve o ofício relacionado (direto ou via resposta)
    let oficioRelaciondoId = oficioId

    if (!oficioRelaciondoId && respostaId) {
      const resposta = await prisma.resposta.findUnique({
        where: { id: respostaId },
        select: { oficioId: true },
      })
      if (!resposta) {
        return NextResponse.json({ error: "Resposta não encontrada." }, { status: 404 })
      }
      oficioRelaciondoId = resposta.oficioId
    }

    if (!oficioRelaciondoId) {
      return NextResponse.json({ error: "Ofício não encontrado." }, { status: 404 })
    }

    const oficio = await prisma.oficio.findUnique({
      where: { id: oficioRelaciondoId },
      include: {
        secretarias: {
          select: {
            id: true,
            nome: true,
            users: {
              where: { role: "SECRETARIA", ativo: true },
              select: { email: true },
            },
          },
        },
        criadoPor: {
          select: { email: true, nome: true, role: true, ativo: true },
        },
      },
    })
    if (!oficio) {
      return NextResponse.json({ error: "Ofício não encontrado." }, { status: 404 })
    }

    // Ler arquivo
    const buffer = Buffer.from(await file.arrayBuffer())

    // Gerar path no MinIO
    const folder = respostaId ? `respostas/${respostaId}` : `oficio-camera/${oficioId}`
    const objectId = `${folder}/${randomUUID()}${ext}`

    // Garantir bucket existe
    await ensureBucket()

    // Upload para MinIO
    await minioClient.putObject(BUCKET_NAME, objectId, buffer, buffer.length, {
      "Content-Type": file.type,
    })

    // Calcular versão do arquivo (para o mesmo ofício/resposta)
    const versaoAtual = await prisma.anexo.count({
      where: oficioId ? { oficioId } : { respostaId: respostaId! },
    })

    // Salvar no banco
    const anexo = await prisma.anexo.create({
      data: {
        nome: file.name,
        url: objectId,   // guardamos o objectId — geraremos URL assinada na leitura
        versao: versaoAtual + 1,
        enviadoPorId: userId,
        ...(oficioId && { oficioId }),
        ...(respostaId && { respostaId }),
      },
    })

    // Registrar no histórico
    if (oficioRelaciondoId) {
      await prisma.historico.create({
        data: {
          oficioId: oficioRelaciondoId,
          evento: "ANEXO_ADICIONADO",
          userId,
        },
      })
    }

    // Disparo de email por papel
    if (role === "MPMG") {
      const emailsSecretaria = [
        ...new Set(
          oficio.secretarias.flatMap((sec) => sec.users.map((u) => u.email)).filter(Boolean)
        ),
      ]

      if (emailsSecretaria.length > 0) {
        try {
          await enviarEmailAnexoMPMGParaSecretarias({
            emailsSecretaria,
            nomesSecretarias: oficio.secretarias.map((s) => s.nome).join(", "),
            numeroOficio: oficio.numero,
            assunto: oficio.assunto,
            nomeArquivo: file.name,
            enviadoPorNome,
            oficioId: oficio.id,
          })

          await prisma.auditLog.create({
            data: {
              userId,
              action: "EMAIL_SENT",
              entity: "ANEXO_SECRETARIAS",
              entityId: anexo.id,
            },
          })
        } catch (err) {
          console.error("Erro ao enviar email para secretarias:", err)
          await prisma.auditLog.create({
            data: {
              userId,
              action: "EMAIL_FAILED",
              entity: "ANEXO_SECRETARIAS",
              entityId: anexo.id,
            },
          })
        }
      }
    }

    if (role === "SECRETARIA" && oficio.criadoPor.email) {
      try {
        await enviarEmailAnexoSecretariaParaMPMG({
          emailMPMG: oficio.criadoPor.email,
          nomeMPMG: oficio.criadoPor.nome,
          numeroOficio: oficio.numero,
          assunto: oficio.assunto,
          nomeArquivo: file.name,
          enviadoPorNome,
          oficioId: oficio.id,
        })

        await prisma.auditLog.create({
          data: {
            userId,
            action: "EMAIL_SENT",
            entity: "ANEXO_MPMG",
            entityId: anexo.id,
          },
        })
      } catch (err) {
        console.error("Erro ao enviar email para MPMG:", err)
        await prisma.auditLog.create({
          data: {
            userId,
            action: "EMAIL_FAILED",
            entity: "ANEXO_MPMG",
            entityId: anexo.id,
          },
        })
      }
    }

    return NextResponse.json({ success: true, anexo }, { status: 201 })
  } catch (error) {
    console.error("Erro no upload:", error)
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 })
  }
}