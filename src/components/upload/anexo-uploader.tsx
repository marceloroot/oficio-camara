// src/components/upload/anexo-uploader.tsx
"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Paperclip, Upload, X, FileText, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  oficioId?: string
  respostaId?: string
  onSuccess?: () => void
  className?: string
}

type FileState = {
  file: File
  status: "pending" | "uploading" | "success" | "error"
  error?: string
}

const ALLOWED = [".pdf", ".doc", ".docx"]
const MAX_MB = 20

export function AnexoUploader({ oficioId, respostaId, onSuccess, className }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileState[]>([])
  const [isDragging, setIsDragging] = useState(false)

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const valid: FileState[] = []

    Array.from(incoming).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase()
      if (!ALLOWED.includes(ext)) {
        valid.push({ file, status: "error", error: "Tipo não permitido (use PDF, DOC ou DOCX)" })
        return
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        valid.push({ file, status: "error", error: `Tamanho máximo: ${MAX_MB}MB` })
        return
      }
      valid.push({ file, status: "pending" })
    })

    setFiles((prev) => [...prev, ...valid])
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadAll() {
    const pending = files.filter((f) => f.status === "pending")
    if (pending.length === 0) return

    // Marca todos como uploading
    setFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" } : f))
    )

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "pending" && files[i].status !== "uploading") continue

      const fd = new FormData()
      fd.append("file", files[i].file)
      if (oficioId) fd.append("oficioId", oficioId)
      if (respostaId) fd.append("respostaId", respostaId)

      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        const data = await res.json()

        if (!res.ok) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "error", error: data.error || "Erro no upload" } : f
            )
          )
        } else {
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, status: "success" } : f))
          )
        }
      } catch {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: "Erro de conexão" } : f
          )
        )
      }
    }

    // Após todos os uploads, atualiza a página
    const hasSuccess = files.some((_, i) => true)
    if (hasSuccess) {
      router.refresh()
      onSuccess?.()
    }
  }

  const hasPending = files.some((f) => f.status === "pending")
  const isUploading = files.some((f) => f.status === "uploading")

  function fileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase()
    return <FileText className={cn("w-4 h-4 shrink-0", ext === "pdf" ? "text-red-500" : "text-blue-500")} />
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Área de drag & drop */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          addFiles(e.dataTransfer.files)
        }}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Clique ou arraste os arquivos aqui</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX — máx. {MAX_MB}MB por arquivo</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 p-3 rounded-md border text-sm",
                f.status === "error" && "border-red-200 bg-red-50",
                f.status === "success" && "border-green-200 bg-green-50",
                f.status === "uploading" && "border-blue-200 bg-blue-50",
                f.status === "pending" && "border-muted bg-muted/30"
              )}
            >
              {fileIcon(f.file.name)}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{f.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(f.file.size / 1024 / 1024).toFixed(2)}MB
                  {f.error && <span className="text-red-600 ml-2">{f.error}</span>}
                </p>
              </div>
              <div className="shrink-0">
                {f.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                {f.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {(f.status === "pending" || f.status === "error") && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão de enviar */}
      {hasPending && (
        <Button className="w-full" onClick={uploadAll} disabled={isUploading}>
          {isUploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
          ) : (
            <><Paperclip className="w-4 h-4 mr-2" /> Enviar {files.filter(f => f.status === "pending").length} arquivo(s)</>
          )}
        </Button>
      )}
    </div>
  )
}