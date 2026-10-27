import { transporter } from "@/lib/mailer"

export async function enviarEmailNovoOficio(data: {
  emailsSecretaria: string[]
  nomeSecretaria: string
  numeroOficio: string
  assunto: string
  descricao: string
  prazo: number
  criadorNome: string
  oficioId: string
}) {
  const linkOficio = `${process.env.NEXTAUTH_URL}/dashboard/secretaria/${data.oficioId}`

  await transporter.sendMail({
    from: `"Sistema de Ofícios" <${process.env.SMTP_USER}>`,
    to: data.emailsSecretaria.join(", "),
    subject: `Novo Ofício: ${data.numeroOficio} — ${data.assunto}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a;">Novo Ofício Recebido</h2>

        <p style="color: #555;">
          Olá, <strong>${data.nomeSecretaria}</strong>!
        </p>
        <p style="color: #555;">
          Um novo ofício foi enviado para sua secretaria pelo promotor 
          <strong>${data.criadorNome}</strong>.
        </p>

        <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 4px 0; font-size: 12px; color: #888;">NÚMERO</p>
          <p style="margin: 0 0 12px; font-weight: bold; font-size: 16px;">${data.numeroOficio}</p>

          <p style="margin: 4px 0; font-size: 12px; color: #888;">ASSUNTO</p>
          <p style="margin: 0 0 12px; font-size: 15px;">${data.assunto}</p>

          <p style="margin: 4px 0; font-size: 12px; color: #888;">DESCRIÇÃO</p>
          <p style="margin: 0 0 12px; font-size: 15px;">${data.descricao}</p>

          <p style="margin: 4px 0; font-size: 12px; color: #888;">PRAZO</p>
          <p style="margin: 0; font-size: 15px; color: #e53e3e; font-weight: bold;">
            ${data.prazo} dias para resposta
          </p>
        </div>

        <a href="${linkOficio}"
           style="background: #0262a2; color: #fff; padding: 12px 24px; border-radius: 6px;
                  font-size: 14px; font-weight: bold; text-decoration: none; display: inline-block;">
          Ver Ofício
        </a>

        <hr style="margin: 32px 0; border-color: #e0e0e0;" />
        <p style="color: #999; font-size: 12px;">
          Este email foi enviado automaticamente pelo sistema de ofícios da Câmara Municipal de Alfenas.
        </p>
      </div>
    `,
  })
}

export async function enviarEmailAnexoMPMGParaSecretarias(data: {
  emailsSecretaria: string[]
  nomesSecretarias: string
  numeroOficio: string
  assunto: string
  nomeArquivo: string
  enviadoPorNome: string
  oficioId: string
}) {
  const linkOficio = `${process.env.NEXTAUTH_URL}/dashboard/secretaria/${data.oficioId}`

  await transporter.sendMail({
    from: `"Sistema de Ofícios" <${process.env.SMTP_USER}>`,
    to: data.emailsSecretaria.join(", "),
    subject: `Novo anexo no Ofício ${data.numeroOficio}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a;">Novo anexo adicionado</h2>
        <p style="color: #555;">
          Olá, <strong>${data.nomesSecretarias}</strong>!
        </p>
        <p style="color: #555;">
          O usuário <strong>${data.enviadoPorNome}</strong> adicionou um novo arquivo no ofício.
        </p>

        <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 4px 0; font-size: 12px; color: #888;">NÚMERO</p>
          <p style="margin: 0 0 12px; font-weight: bold; font-size: 16px;">${data.numeroOficio}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #888;">ASSUNTO</p>
          <p style="margin: 0 0 12px; font-size: 15px;">${data.assunto}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #888;">ARQUIVO</p>
          <p style="margin: 0; font-size: 15px;">${data.nomeArquivo}</p>
        </div>

        <a href="${linkOficio}"
           style="background: #0262a2; color: #fff; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: bold; text-decoration: none; display: inline-block;">
          Ver Ofício
        </a>
      </div>
    `,
  })
}

export async function enviarEmailAnexoSecretariaParaMPMG(data: {
  emailMPMG: string
  nomeMPMG: string
  numeroOficio: string
  assunto: string
  nomeArquivo: string
  enviadoPorNome: string
  oficioId: string
}) {
  const linkOficio = `${process.env.NEXTAUTH_URL}/officio/${data.oficioId}`

  await transporter.sendMail({
    from: `"Sistema de Ofícios" <${process.env.SMTP_USER}>`,
    to: data.emailMPMG,
    subject: `Novo anexo da secretaria no Ofício ${data.numeroOficio}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a;">Novo anexo enviado pela secretaria</h2>
        <p style="color: #555;">
          Olá, <strong>${data.nomeMPMG}</strong>!
        </p>
        <p style="color: #555;">
          O usuário da secretaria <strong>${data.enviadoPorNome}</strong> adicionou um arquivo no seu ofício.
        </p>

        <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 4px 0; font-size: 12px; color: #888;">NÚMERO</p>
          <p style="margin: 0 0 12px; font-weight: bold; font-size: 16px;">${data.numeroOficio}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #888;">ASSUNTO</p>
          <p style="margin: 0 0 12px; font-size: 15px;">${data.assunto}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #888;">ARQUIVO</p>
          <p style="margin: 0; font-size: 15px;">${data.nomeArquivo}</p>
        </div>

        <a href="${linkOficio}"
           style="background: #0262a2; color: #fff; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: bold; text-decoration: none; display: inline-block;">
          Ver Ofício
        </a>
      </div>
    `,
  })
}