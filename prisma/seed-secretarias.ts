import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  const secretarias = [
    { nome: "Controladoria Geral do Município", slaDias: 20 },
    { nome: "Poder Executivo", slaDias: 20 },
    { nome: "Procuradoria Geral do Município", slaDias: 20 },
    { nome: "Secretaria Municipal de Coordenação do Governo", slaDias: 20 },
    { nome: "Secretaria Municipal da Criança, da Assistência e dos Direitos Sociais", slaDias: 20 },
    { nome: "Secretaria Municipal da Juventude e Turismo", slaDias: 20 },
    { nome: "Secretaria da Mulher", slaDias: 20 },
    { nome: "Secretaria Municipal de Agricultura e Desenvolvimento Rural", slaDias: 20 },
    { nome: "Secretaria Municipal de Desenvolvimento Econômico, Indústria, Comércio e Ação Regional", slaDias: 20 },
    { nome: "Secretaria Municipal de Desenvolvimento Urbano", slaDias: 20 },
    { nome: "Secretaria Municipal de Esporte Lazer e Recreação", slaDias: 20 },
    { nome: "Secretaria Municipal de Planejamento e Gestão", slaDias: 20 },
    { nome: "Secretaria Municipal de Suprimentos e Contratos", slaDias: 20 },
    { nome: "Secretaria Municipal de Desenvolvimento Estratégico", slaDias: 20 },
    { nome: "Secretaria Municipal de Cultura", slaDias: 20 },
    { nome: "Secretaria Municipal de Defesa Social", slaDias: 20 },
    { nome: "Secretaria Municipal de Educação", slaDias: 20 },
    { nome: "Secretaria Municipal de Fazenda", slaDias: 20 },
    { nome: "Secretaria Municipal de Habitação e Participação Popular", slaDias: 20 },
    { nome: "Secretaria Municipal de Meio Ambiente", slaDias: 20 },
    { nome: "Secretaria Municipal de Saúde", slaDias: 20 },
    { nome: "Secretaria Municipal do Servidor Público", slaDias: 20 },
  ]

  for (const secretaria of secretarias) {
    const result = await prisma.secretaria.upsert({
      where: {
        nome: secretaria.nome,
      },
      update: {
        slaDias: secretaria.slaDias,
        ativa: true,
      },
      create: {
        nome: secretaria.nome,
        slaDias: secretaria.slaDias,
        ativa: true,
      },
    })

    console.log("Secretaria criada ou existente:", {
      id: result.id,
      nome: result.nome,
      slaDias: result.slaDias,
      ativa: result.ativa,
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })