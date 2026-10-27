// src/app/(protected)/dashboard/oficios/novo/page.tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prismaClient as prisma } from "@/lib/prisma"
import { CriarOficioForm } from "@/components/pages/oficio/criar-oficio"

export default async function CriarOficioPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const secretarias = await prisma.secretaria.findMany({
    where: { ativa: true },
    select: { id: true, nome: true, slaDias: true },
    orderBy: { nome: "asc" },
  })

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <CriarOficioForm secretarias={secretarias} />
    </div>
  )
}