// src/hooks/use-notificacoes.ts
"use client"

import { useState, useEffect, useCallback } from "react"

type Notificacao = {
  id: string
  titulo: string
  mensagem: string
  lida: boolean
  oficioId: string | null
  createdAt: string
  oficio?: { numero: string } | null
}

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [carregando, setCarregando] = useState(true)

  // Busca notificações iniciais
  async function buscarNotificacoes() {
    try {
      const res = await fetch("/api/notificacoes")
      if (!res.ok) {
        setNotificacoes([])
        return
      }
      const data = await res.json()
      setNotificacoes(Array.isArray(data) ? data : [])
    } catch {
      setNotificacoes([])
    } finally {
      setCarregando(false)
    }
  }

  // Marca todas como lidas
  const marcarTodasLidas = useCallback(async () => {
    await fetch("/api/notificacoes", { method: "PATCH" })
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
  }, [])

  // Marca uma como lida
  const marcarLida = useCallback(async (id: string) => {
    await fetch(`/api/notificacoes/${id}`, { method: "PATCH" })
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    )
  }, [])

  useEffect(() => {
    buscarNotificacoes()

    // Conecta ao SSE
    const es = new EventSource("/api/notificacoes/stream")

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)

        if (payload.type === "nova_notificacao") {
          // Adiciona nova notificação no topo sem recarregar
          const nova: Notificacao = {
            id: crypto.randomUUID(),
            titulo: payload.titulo,
            mensagem: payload.mensagem,
            lida: false,
            oficioId: payload.oficioId ?? null,
            createdAt: new Date().toISOString(),
            oficio: null,
          }
          setNotificacoes((prev) => [nova, ...prev].slice(0, 20))
        }
      } catch {
        // parse error, ignora
      }
    }

    es.onerror = () => {
      // Reconecta automaticamente — o browser faz isso sozinho com SSE
      es.close()
    }

    return () => es.close()
  }, [])

  const lista = Array.isArray(notificacoes) ? notificacoes : []
  const naoLidas = lista.filter((n) => !n.lida).length

  return { notificacoes: lista, naoLidas, carregando, marcarTodasLidas, marcarLida }
}