// src/components/upload/anexo-list.tsx
"use client"

import { useState } from "react"
import { Download, Trash2, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Anexo = {
  id: string
  nome: string
  versao: number
  createdAt: Date
  enviadoPorId?: string | null
}

interface Props {
  anexos: Anexo[]
  canDelete?: boolean
  currentUserId?: string
  onDeleted?: () => void
}

export function AnexoList({ anexos, canDelete = true, currentUserId, onDeleted }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleDownload(anexo: Anexo) {
    setLoading(anexo.id)
    try {
      const res = await fetch(`/api/upload/${anexo.id}`)
      const data = await res.json()
      if (data.url) {
        window.open(data.url, "_blank")
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(anexoId: string) {
    if (!confirm("Tem certeza que deseja remover este anexo?")) return
    setLoading(anexoId)
    try {
      const response = await fetch(`/api/upload/${anexoId}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "Não foi possível remover o anexo.")
      }
      onDeleted?.()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao remover anexo.")
    } finally {
      setLoading(null)
    }
  }

  if (anexos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhum anexo ainda.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {anexos.map((a) => {
        const ext = a.nome.split(".").pop()?.toLowerCase()
        const isPdf = ext === "pdf"
        const isLoading = loading === a.id
        const isOwner = !!currentUserId && a.enviadoPorId === currentUserId
        const canDeleteThisAnexo = canDelete && isOwner

        return (
          <div
            key={a.id}
            className="flex items-center gap-3 p-3 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <FileText className={cn("w-4 h-4 shrink-0", isPdf ? "text-red-500" : "text-blue-500")} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.nome}</p>
              <p className="text-xs text-muted-foreground">
                v{a.versao} · {format(new Date(a.createdAt), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDownload(a)}
                disabled={!!isLoading}
                title="Baixar arquivo"
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
              </Button>
              {canDeleteThisAnexo && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(a.id)}
                  disabled={!!isLoading}
                  title="Remover anexo"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}