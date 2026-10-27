// src/app/(protected)/dashboard/secretarias/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prismaClient as prisma } from "@/lib/prisma"
import { SecretariasClient } from "@/components/pages/admin/secretarias-client"

export default async function SecretariasPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any)?.role !== "MASTER") redirect("/dashboard")

  const secretarias = await prisma.secretaria.findMany({
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { users: true, oficios: true } },
    },
  })

  return <SecretariasClient secretarias={secretarias} />
}