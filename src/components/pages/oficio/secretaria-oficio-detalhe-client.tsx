// src/app/(protected)/dashboard/secretaria/[id]/_components/secretaria-oficio-detalhe-client.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, FileText, Clock, CheckCircle2, AlertTriangle,
  MessageSquare, History, Paperclip, PenLine, CalendarClock,
  User, Building2, Hash, Calendar, ChevronDown, ChevronUp,
  Loader2, CheckCircle, XCircle,
  Pencil
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import {
  responderOficioAction,
  solicitarProrrogacaoAction,
  assinarRespostaAction,
  editarRespostaAction,
} from "@/lib/actions/officio.actions"
import { AnexoList } from "@/components/upload/anexo-list"
import { AnexoUploader } from "@/components/upload/anexo-uploader"
// ── Tipos ────────────────────────────────────────────────────────────────────
type OficioStatus = "PENDENTE" | "RESPONDIDO" | "VENCIDO"

type Oficio = {
  id: string
  numero: string
  assunto: string
  descricao: string
  status: OficioStatus
  prazoDias: number
  dataCriacao: Date
  createdAt: Date
  secretarias: { id: string; nome: string; slaDias: number }[]
  criadoPor: { id: string; nome: string; email: string }
  respostas: {
    id: string
    texto: string
    createdAt: Date
    respondidoPor: { id: string; nome: string }
     anexos: { id: string; nome: string; url: string; versao: number; createdAt: Date; enviadoPorId?: string | null }[]
    assinatura: {
      id: string
      hash: string
      signedAt: Date
      signedBy: { id: string; nome: string }
    } | null
  }[]
  prorrogacoes: {
    id: string
    diasSolicitados: number
    motivo: string
    aprovada: boolean | null
    createdAt: Date
    solicitadaPor: { id: string; nome: string }
    aprovadaPor: { id: string; nome: string } | null
  }[]
  anexos: { id: string; nome: string; url: string; versao: number; createdAt: Date; enviadoPorId?: string | null }[]
  historico: { id: string; evento: string; userId: string; createdAt: Date }[]
  assinatura: {
    id: string
    hash: string
    signedAt: Date
    signedBy: { id: string; nome: string }
  } | null
  leituras: { id: string }[]
}

interface Props {
  oficio: Oficio
  userId: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig: Record<OficioStatus, { label: string; icon: React.ElementType; className: string }> = {
  PENDENTE:   { label: "Pendente",   icon: Clock,         className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  RESPONDIDO: { label: "Respondido", icon: CheckCircle2,  className: "bg-green-100 text-green-800 border-green-200" },
  VENCIDO:    { label: "Vencido",    icon: AlertTriangle, className: "bg-red-100 text-red-800 border-red-200" },
}

const eventoLabel: Record<string, string> = {
  OFICIO_CRIADO:         "Ofício criado",
  OFICIO_RESPONDIDO:     "Ofício respondido",
  OFICIO_PRORROGADO:     "Prazo prorrogado",
  OFICIO_ASSINADO:       "Ofício assinado",
  OFICIO_REDIRECIONADO:  "Ofício redirecionado para secretaria",
  PRORROGACAO_SOLICITADA:"Prorrogação solicitada",
  PRORROGACAO_APROVADA:  "Prorrogação aprovada",
  PRORROGACAO_REJEITADA: "Prorrogação rejeitada",
  RESPOSTA_ASSINADA:     "Resposta assinada",
}

function parseEventoHistorico(evento: string) {
  const prefixo = "OFICIO_REDIRECIONADO_OBS|"
  if (evento.startsWith(prefixo)) {
    return {
      titulo: "Ofício redirecionado para secretaria",
      observacao: evento.slice(prefixo.length),
    }
  }

  return { titulo: eventoLabel[evento] ?? evento, observacao: null as string | null }
}

function StatusBadge({ status }: { status: OficioStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border", config.className)}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 rounded-md bg-muted p-1.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {typeof value === "string" ? (
          <p className="break-words text-sm font-medium">{value}</p>
        ) : (
          value
        )}
      </div>
    </div>
  )
}

function SecretariasLista({ secretarias }: { secretarias: { id: string; nome: string }[] }) {
  if (secretarias.length === 0) {
    return <p className="text-sm font-medium text-muted-foreground">Nenhuma secretaria</p>
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {secretarias.map((sec) => (
        <span
          key={sec.id}
          className="inline-flex max-w-full rounded-full border bg-muted px-2.5 py-1 text-xs font-medium leading-snug break-words"
        >
          {sec.nome}
        </span>
      ))}
    </div>
  )
}

function ProrrogacaoStatusBadge({ aprovada }: { aprovada: boolean | null }) {
  if (aprovada === null)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">Aguardando aprovação</span>
  if (aprovada)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200 inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" />Aprovada</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1"><XCircle className="w-3 h-3" />Rejeitada</span>
}

// ── Componente principal ─────────────────────────────────────────────────────
export function SecretariaOficioDetalheClient({ oficio, userId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Modais
  const [modalResponder, setModalResponder] = useState(false)
  const [modalProrrogar, setModalProrrogar] = useState(false)
  const [modalAssinarResposta, setModalAssinarResposta] = useState<string | null>(null) // respostaId

  // Formulários
  const [textoResposta, setTextoResposta] = useState("")
  const [diasProrrogacao, setDiasProrrogacao] = useState("15")
  const [motivoProrrogacao, setMotivoProrrogacao] = useState("")

  // Seções colapsáveis
  const [showHistorico, setShowHistorico] = useState(true)
  const [showProrrogacoes, setShowProrrogacoes] = useState(true)


  const [editandoResposta, setEditandoResposta] = useState<{ id: string; texto: string } | null>(null)
  const [modalAnexar, setModalAnexar] = useState(false)
  const [modalAnexarResposta, setModalAnexarResposta] = useState<string | null>(null)
  // Prazo com prorrogações aprovadas
  const diasExtras = oficio.prorrogacoes
    .filter((p) => p.aprovada === true)
    .reduce((acc, p) => acc + p.diasSolicitados, 0)
  const vencimento = new Date(oficio.dataCriacao)
  vencimento.setDate(vencimento.getDate() + oficio.prazoDias + diasExtras)
  const diffDias = Math.ceil((vencimento.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  const temProrrogacaoPendente = oficio.prorrogacoes.some((p) => p.aprovada === null)

  function handleAction(fn: () => Promise<void>) {
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          const e = err as { digest?: string }
          if (e.digest?.startsWith("NEXT_REDIRECT")) throw err
          setError(err.message || "Erro inesperado.")
        }
      }
    })
  }

  function submitResponder() {
    if (!textoResposta.trim()) return setError("Digite o texto da resposta.")
    handleAction(async () => {
      const fd = new FormData()
      fd.append("oficioId", oficio.id)
      fd.append("texto", textoResposta)
      await responderOficioAction(fd)
      setModalResponder(false)
      setTextoResposta("")
      setSuccess("Resposta enviada com sucesso!")
    })
  }
function submitEditarResposta() {
  if (!editandoResposta?.texto.trim()) return setError("Digite o texto da resposta.")
  handleAction(async () => {
    const fd = new FormData()
    fd.append("respostaId", editandoResposta.id)
    fd.append("oficioId", oficio.id)
    fd.append("texto", editandoResposta.texto)
    await editarRespostaAction(fd)
    setEditandoResposta(null)
    setSuccess("Resposta atualizada com sucesso!")
  })
}
  function submitProrrogar() {
    if (!motivoProrrogacao.trim()) return setError("Digite o motivo.")
    if (!diasProrrogacao || Number(diasProrrogacao) < 1) return setError("Informe um prazo válido.")
    handleAction(async () => {
      const fd = new FormData()
      fd.append("oficioId", oficio.id)
      fd.append("diasSolicitados", diasProrrogacao)
      fd.append("motivo", motivoProrrogacao)
      await solicitarProrrogacaoAction(fd)
      setModalProrrogar(false)
      setMotivoProrrogacao("")
      setDiasProrrogacao("15")
      setSuccess("Solicitação de prorrogação enviada! Aguarde aprovação do MPMG.")
    })
  }

  function submitAssinarResposta(respostaId: string) {
    handleAction(async () => {
      const fd = new FormData()
      fd.append("respostaId", respostaId)
      fd.append("oficioId", oficio.id)
      await assinarRespostaAction(fd)
      setModalAssinarResposta(null)
      setSuccess("Resposta assinada com sucesso!")
    })
  }

 // Pode haver mais de uma resposta no mesmo ofício, independente do status
 const canResponder = true
 const canProrrogar = oficio.status === "PENDENTE" && !temProrrogacaoPendente

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{oficio.numero}</h1>
            <StatusBadge status={oficio.status} />
            {oficio.assinatura && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                <PenLine className="w-3 h-3" /> Assinado
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{oficio.assunto}</p>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {temProrrogacaoPendente && (
        <Alert className="border-orange-300 bg-orange-50 text-orange-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Há uma solicitação de prorrogação aguardando aprovação do MPMG.
          </AlertDescription>
        </Alert>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        {canResponder && (
          <Button onClick={() => setModalResponder(true)}>
            <MessageSquare className="w-4 h-4 mr-2" /> Responder
          </Button>
        )}
        {canProrrogar && (
          <Button variant="outline" onClick={() => setModalProrrogar(true)}>
            <CalendarClock className="w-4 h-4 mr-2" /> Solicitar Prorrogação
          </Button>
        )}
        <Button variant="outline" onClick={() => setModalAnexar(true)}>
           <Paperclip className="w-4 h-4 mr-2" /> Anexar Arquivo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do ofício */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Dados do Ofício
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoItem icon={Hash} label="Número" value={oficio.numero} />
                <InfoItem icon={User} label="Enviado por" value={oficio.criadoPor.nome} />
                <InfoItem icon={Calendar} label="Data" value={format(new Date(oficio.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
                <div className="sm:col-span-2">
                  <InfoItem
                    icon={Building2}
                    label={`Secretarias (${oficio.secretarias.length})`}
                    value={<SecretariasLista secretarias={oficio.secretarias} />}
                  />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
               <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{oficio.descricao}</p>
              </div>
            </CardContent>
          </Card>

          {/* Respostas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Respostas
                <Badge variant="secondary" className="ml-auto">{oficio.respostas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {oficio.respostas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma resposta ainda.</p>
              ) : (
                <div className="space-y-4">
                  {oficio.respostas.map((r) => (
                    <div key={r.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{r.respondidoPor.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(r.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.texto}</p>
                      {/* Só o próprio respondente pode editar/anexar/assinar se não estiver assinada */}
                      {!r.assinatura && r.respondidoPor.id === userId && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditandoResposta({ id: r.id, texto: r.texto })}
                          >
                            <Pencil className="w-3 h-3 mr-1" /> Editar Resposta
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModalAnexarResposta(r.id)}
                          >
                            <Paperclip className="w-3 h-3 mr-1" /> Anexar Arquivo
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModalAssinarResposta(r.id)}
                          >
                            <PenLine className="w-3 h-3 mr-1" /> Assinar Resposta
                          </Button>
                        </div>
                      )}
                      {r.assinatura && (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200">
                          <PenLine className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-blue-700">
                            Assinada por {r.assinatura.signedBy.nome} em{" "}
                            {format(new Date(r.assinatura.signedAt), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}

                     <AnexoList
                        anexos={r.anexos}
                        canDelete={!r.assinatura}
                        currentUserId={userId}
                        onDeleted={() => router.refresh()}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Anexos do ofício */}
          {oficio.anexos.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="w-4 h-4" /> Anexos
                <Badge variant="secondary" className="ml-auto">{oficio.anexos.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnexoList
                anexos={oficio.anexos}
                canDelete
                currentUserId={userId}
                onDeleted={() => router.refresh()}
              />
            </CardContent>
          </Card>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Prazo */}
          <Card className={cn(
            diffDias < 0 ? "border-red-300" :
            diffDias <= 3 ? "border-orange-300" : ""
          )}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Prazo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className="text-sm font-medium">{format(vencimento, "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Situação</p>
                <p className={cn("text-sm font-medium",
                  diffDias < 0 ? "text-red-600" :
                  diffDias <= 3 ? "text-orange-600" :
                  "text-green-600"
                )}>
                  {diffDias < 0
                    ? `Venceu há ${Math.abs(diffDias)} dia(s)`
                    : diffDias === 0 ? "Vence hoje"
                    : `${diffDias} dia(s) restante(s)`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prazo original</p>
                <p className="text-sm">{oficio.prazoDias} dias</p>
              </div>
              {diasExtras > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Prorrogado</p>
                  <p className="text-sm text-blue-600 font-medium">+{diasExtras} dias</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prorrogações */}
          {oficio.prorrogacoes.length > 0 && (
            <Card>
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => setShowProrrogacoes(!showProrrogacoes)}
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  Prorrogações
                  <Badge variant="secondary" className="ml-auto">{oficio.prorrogacoes.length}</Badge>
                  {showProrrogacoes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardTitle>
              </CardHeader>
              {showProrrogacoes && (
                <CardContent className="space-y-3">
                  {oficio.prorrogacoes.map((p) => (
                    <div key={p.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">+{p.diasSolicitados} dias</span>
                        <ProrrogacaoStatusBadge aprovada={p.aprovada} />
                      </div>
                      <p className="text-xs text-muted-foreground">{p.motivo}</p>
                      <p className="text-xs text-muted-foreground">
                        Solicitada por {p.solicitadaPor.nome} em{" "}
                        {format(new Date(p.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {p.aprovadaPor && (
                        <p className="text-xs text-muted-foreground">
                          {p.aprovada ? "Aprovada" : "Rejeitada"} por {p.aprovadaPor.nome}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Histórico */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer"
              onClick={() => setShowHistorico(!showHistorico)}
            >
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico
                <Badge variant="secondary" className="ml-auto">{oficio.historico.length}</Badge>
                {showHistorico ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {showHistorico && (
              <CardContent>
                <div className="space-y-0">
                  {oficio.historico.map((h, i) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        {i < oficio.historico.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">
                          {parseEventoHistorico(h.evento).titulo}
                        </p>
                        {parseEventoHistorico(h.evento).observacao && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Observação: {parseEventoHistorico(h.evento).observacao}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(h.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Assinatura do ofício */}
          {oficio.assinatura && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <PenLine className="w-4 h-4" /> Ofício Assinado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xs text-muted-foreground">Assinado por</p>
                <p className="text-sm font-medium">{oficio.assinatura.signedBy.nome}</p>
                <p className="text-xs text-muted-foreground mt-1">Em</p>
                <p className="text-sm">
                  {format(new Date(oficio.assinatura.signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Responder */}
      <Dialog open={modalResponder} onOpenChange={setModalResponder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Responder Ofício
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Digite a resposta..."
            className="min-h-[150px]"
            value={textoResposta}
            onChange={(e) => setTextoResposta(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalResponder(false)}>Cancelar</Button>
            <Button onClick={submitResponder} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Solicitar Prorrogação */}
      <Dialog open={modalProrrogar} onOpenChange={setModalProrrogar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Solicitar Prorrogação
            </DialogTitle>
          </DialogHeader>
          <Alert className="border-blue-300 bg-blue-50 text-blue-800">
            <AlertDescription>
              A solicitação será enviada ao MPMG para aprovação. Você será notificado quando houver uma decisão.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Dias adicionais solicitados</label>
              <Input
                type="number"
                min={1}
                max={365}
                value={diasProrrogacao}
                onChange={(e) => setDiasProrrogacao(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Justificativa</label>
              <Textarea
                placeholder="Explique o motivo da prorrogação..."
                className="min-h-[100px]"
                value={motivoProrrogacao}
                onChange={(e) => setMotivoProrrogacao(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalProrrogar(false)}>Cancelar</Button>
            <Button onClick={submitProrrogar} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Assinar Resposta */}
      <Dialog
        open={!!modalAssinarResposta}
        onOpenChange={(open) => !open && setModalAssinarResposta(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-4 h-4" /> Assinar Resposta
            </DialogTitle>
          </DialogHeader>
          <Alert className="border-orange-300 bg-orange-50 text-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <p className="font-semibold">Esta ação é irreversível.</p>
              <p className="text-sm mt-1">
                Após assinar, um hash criptográfico será gerado vinculando sua identidade a esta resposta.
              </p>
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAssinarResposta(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => modalAssinarResposta && submitAssinarResposta(modalAssinarResposta)}
              disabled={isPending}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Resposta */}
      <Dialog
        open={!!editandoResposta}
        onOpenChange={(open) => !open && setEditandoResposta(null)}
        >
        <DialogContent>
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Editar Resposta
            </DialogTitle>
            </DialogHeader>
            <Textarea
            className="min-h-[150px]"
            value={editandoResposta?.texto ?? ""}
            onChange={(e) =>
                setEditandoResposta((prev) => prev ? { ...prev, texto: e.target.value } : null)
            }
            />
            <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoResposta(null)}>Cancelar</Button>
            <Button onClick={submitEditarResposta} disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
            </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal Anexar no ofício */}
      <Dialog open={modalAnexar} onOpenChange={setModalAnexar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" /> Anexar Arquivo
            </DialogTitle>
          </DialogHeader>
          <AnexoUploader
            oficioId={oficio.id}
            onSuccess={() => {
              setModalAnexar(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal Anexar na resposta */}
      <Dialog
        open={!!modalAnexarResposta}
        onOpenChange={(open) => !open && setModalAnexarResposta(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" /> Anexar arquivo na resposta
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Envie PDF, DOC ou DOCX (máx. 20MB). O arquivo fica vinculado a esta resposta.
          </p>
          {modalAnexarResposta && (
            <AnexoUploader
              respostaId={modalAnexarResposta}
              onSuccess={() => {
                setModalAnexarResposta(null)
                router.refresh()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}