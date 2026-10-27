/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(protected)/dashboard/oficios/novo/_components/criar-oficio-form.tsx
"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { criarOficioAction } from "@/lib/actions/officio.actions"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, FileText, AlertCircle, CheckCircle2 } from "lucide-react"

// ── Schema ───────────────────────────────────────────────────────────────────
const oficioSchema = z.object({
  numero: z.string().min(1, "Número é obrigatório").max(50),
  assunto: z.string().min(3, "Mínimo 3 caracteres").max(255),
  descricao: z.string().min(10, "Mínimo 10 caracteres"),
  secretariaIds: z.array(z.string()).min(1, "Selecione ao menos uma secretaria"),
  prazoDias: z.coerce
    .number()
    .int()
    .min(1, "Prazo mínimo é 1 dia")
    .max(365, "Prazo máximo é 365 dias"),
})

type OficioFormValues = z.infer<typeof oficioSchema>

// ── Props ────────────────────────────────────────────────────────────────────
type Secretaria = {
  id: string
  nome: string
  slaDias: number
}

interface CriarOficioFormProps {
  secretarias: Secretaria[]
}

// ── Componente ───────────────────────────────────────────────────────────────
export function CriarOficioForm({ secretarias }: CriarOficioFormProps) {
  const [serverError, setServerError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<OficioFormValues>({
    resolver: zodResolver(oficioSchema) as any,
    defaultValues: {
      numero: "",
      assunto: "",
      descricao: "",
      secretariaIds: [],
      prazoDias: 15,
    },
  })

  // Ao selecionar secretarias, ajusta o prazo com maior SLA selecionado
  function handleSecretariaToggle(secretariaId: string, checked: boolean) {
    const atuais = form.getValues("secretariaIds")
    const atualizadas = checked
      ? [...new Set([...atuais, secretariaId])]
      : atuais.filter((id) => id !== secretariaId)

    form.setValue("secretariaIds", atualizadas, { shouldValidate: true })

    if (atualizadas.length === 0) return

    const slaMaximo = secretarias
      .filter((s) => atualizadas.includes(s.id))
      .reduce((maior, sec) => Math.max(maior, sec.slaDias), 1)

    form.setValue("prazoDias", slaMaximo)
  }

  function onSubmit(values: OficioFormValues) {
    setServerError("")
    setSuccess(false)

    const formData = new FormData()
    formData.append("numero", values.numero)
    formData.append("assunto", values.assunto)
    formData.append("descricao", values.descricao)
    formData.append("prazoDias", String(values.prazoDias))
    values.secretariaIds.forEach((id) => formData.append("secretariaIds", id))

    startTransition(async () => {
      try {
        await criarOficioAction(formData)
        setSuccess(true)
        form.reset()
      } catch (err: unknown) {
        if (err instanceof Error) {
          // redirect() do Next.js lança erro especial — deixa passar
          if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
            throw err
          }
          setServerError(err.message || "Erro ao criar ofício.")
        } else {
          setServerError("Erro inesperado.")
        }
      }
    })
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Ofício</h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados para registrar um novo ofício
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Ofício</CardTitle>
          <CardDescription>Todos os campos são obrigatórios.</CardDescription>
        </CardHeader>

        <CardContent>
          {serverError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-500 text-green-700 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>Ofício criado com sucesso!</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Número */}
              <FormField
                control={form.control}
                name="numero"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Número do Ofício</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: OFI-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Secretarias */}
              <FormField
                control={form.control}
                name="secretariaIds"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Secretarias Destinatárias</FormLabel>
                    <FormControl>
                      <div className="rounded-md border p-3 space-y-2 max-h-52 overflow-auto">
                        {secretarias.map((s) => {
                          const checked = field.value.includes(s.id)

                          return (
                            <label
                              key={s.id}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <div>
                                <span>{s.nome}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  SLA: {s.slaDias} dias
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={checked}
                                onChange={(e) =>
                                  handleSecretariaToggle(s.id, e.target.checked)
                                }
                              />
                            </label>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assunto */}
              <FormField
                control={form.control}
                name="assunto"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl>
                      <Input placeholder="Resumo do assunto tratado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descrição */}
              <FormField
                control={form.control}
                name="descricao"

                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o conteúdo do ofício..."
                        className="min-h-[120px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prazo */}
              <FormField
                control={form.control}
                name="prazoDias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo de Resposta (dias)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={365} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    form.reset()
                    setServerError("")
                    setSuccess(false)
                  }}
                  disabled={isPending}
                >
                  Limpar
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Criar Ofício"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  )
}