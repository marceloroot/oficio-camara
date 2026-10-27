// src/app/api/notificacoes/stream/route.ts
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Map global de clientes conectados: userId → Set de controllers
const clientes = new Map<string, Set<ReadableStreamDefaultController>>()

// Função exportada para outros módulos enviarem notificações
export function enviarNotificacaoParaUsuario(userId: string, payload: object) {
  const controllers = clientes.get(userId)
  if (!controllers || controllers.size === 0) return

  const data = `data: ${JSON.stringify(payload)}\n\n`
  controllers.forEach((ctrl) => {
    try {
      ctrl.enqueue(new TextEncoder().encode(data))
    } catch {
      // controller fechado, remove
      controllers.delete(ctrl)
    }
  })
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response("Não autenticado", { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string

  const stream = new ReadableStream({
    start(controller) {
      // Registra o cliente
      if (!clientes.has(userId)) {
        clientes.set(userId, new Set())
      }
      clientes.get(userId)!.add(controller)

      // Envia ping inicial para confirmar conexão
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      )

      // Ping a cada 25s para manter conexão viva
      const interval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: ping\n\n`))
        } catch {
          clearInterval(interval)
        }
      }, 25000)

      // Cleanup ao fechar
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        clientes.get(userId)?.delete(controller)
        if (clientes.get(userId)?.size === 0) {
          clientes.delete(userId)
        }
        try { controller.close() } catch { /* já fechado */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // desativa buffer no nginx
    },
  })
}