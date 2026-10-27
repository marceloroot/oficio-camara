// src/app/(protected)/dashboard/secretarias/_components/secretarias-client.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Plus, Pencil, Power, PowerOff, Users, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { criarSecretariaAction, editarSecretariaAction, toggleSecretariaAction } from "@/lib/actions/master.actions"

type Secretaria = {
  id: string
  nome: string
  slaDias: number
  ativa: boolean
  createdAt: Date
  _count: { users: number; oficios: number }
}

export function SecretariasClient({ secretarias }: { secretarias: Secretaria[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [busca, setBusca] = useState("")

  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState<Secretaria | null>(null)

  const [nome, setNome] = useState("")
  const [slaDias, setSlaDias] = useState("15")

  const filtradas = secretarias.filter((s) =>
    s.nome.toLowerCase().includes(busca.toLowerCase())
  )

  function handleAction(fn: () => Promise<void>) {
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message)
      }
    })
  }

  function abrirEditar(s: Secretaria) {
    setModalEditar(s)
    setNome(s.nome)
    setSlaDias(String(s.slaDias))
    setError("")
  }

  function abrirCriar() {
    setNome("")
    setSlaDias("15")
    setError("")
    setModalCriar(true)
  }

  function submitCriar() {
    if (!nome.trim()) return setError("Nome é obrigatório.")
    handleAction(async () => {
      const fd = new FormData()
      fd.append("nome", nome)
      fd.append("slaDias", slaDias)
      await criarSecretariaAction(fd)
      setModalCriar(false)
      setSuccess("Secretaria criada com sucesso!")
    })
  }

  function submitEditar() {
    if (!nome.trim()) return setError("Nome é obrigatório.")
    handleAction(async () => {
      const fd = new FormData()
      fd.append("id", modalEditar!.id)
      fd.append("nome", nome)
      fd.append("slaDias", slaDias)
      await editarSecretariaAction(fd)
      setModalEditar(null)
      setSuccess("Secretaria atualizada com sucesso!")
    })
  }

  function submitToggle(id: string, ativa: boolean) {
    handleAction(async () => {
      const fd = new FormData()
      fd.append("id", id)
      await toggleSecretariaAction(fd)
      setSuccess(ativa ? "Secretaria desativada." : "Secretaria ativada!")
    })
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Secretarias</h1>
            <p className="text-sm text-muted-foreground">{secretarias.length} secretaria(s) cadastrada(s)</p>
          </div>
        </div>
        <Button onClick={abrirCriar}>
          <Plus className="w-4 h-4 mr-2" /> Nova Secretaria
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-green-500 bg-green-50 text-green-800"><AlertDescription>{success}</AlertDescription></Alert>}

      {/* Busca */}
      <Input
        placeholder="Buscar secretaria..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-sm"
      />

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtradas.map((s) => (
          <Card key={s.id} className={cn(!s.ativa && "opacity-60 border-dashed")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  {s.nome}
                </span>
                <Badge variant={s.ativa ? "default" : "secondary"}>
                  {s.ativa ? "Ativa" : "Inativa"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {s._count.users} usuário(s)
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {s._count.oficios} ofício(s)
                </span>
                <span>SLA: {s.slaDias} dias</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => abrirEditar(s)}>
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={s.ativa ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}
                  onClick={() => submitToggle(s.id, s.ativa)}
                  disabled={isPending}
                >
                  {s.ativa
                    ? <><PowerOff className="w-3 h-3 mr-1" /> Desativar</>
                    : <><Power className="w-3 h-3 mr-1" /> Ativar</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtradas.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2 text-center py-10">
            Nenhuma secretaria encontrada.
          </p>
        )}
      </div>

      {/* Modal Criar */}
      <Dialog open={modalCriar} onOpenChange={setModalCriar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Nova Secretaria
            </DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <Input placeholder="Ex: Secretaria de Saúde" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Prazo padrão (dias)</label>
              <Input type="number" min={1} max={365} value={slaDias} onChange={(e) => setSlaDias(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button onClick={submitCriar} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={!!modalEditar} onOpenChange={(o) => !o && setModalEditar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Editar Secretaria
            </DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Prazo padrão (dias)</label>
              <Input type="number" min={1} max={365} value={slaDias} onChange={(e) => setSlaDias(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditar(null)}>Cancelar</Button>
            <Button onClick={submitEditar} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}