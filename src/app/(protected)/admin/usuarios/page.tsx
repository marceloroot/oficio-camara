// src/app/(protected)/dashboard/usuarios/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prismaClient as prisma } from "@/lib/prisma"
import { UsuariosClient } from "@/components/pages/admin/usuarios-client"

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any)?.role !== "MASTER") redirect("/dashboard")

  const [usuarios, secretarias] = await Promise.all([
    prisma.user.findMany({
      orderBy: { nome: "asc" },
      include: {
        secretaria: { select: { id: true, nome: true } },
      },
    }),
    prisma.secretaria.findMany({
      where: { ativa: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ])

  return <UsuariosClient usuarios={usuarios} secretarias={secretarias} />
}