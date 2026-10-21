import "server-only";

/**
 * Envio de e-mail pela API HTTP do Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Sem RESEND_API_KEY configurada, não envia e devolve erro explícito.
 */
export async function enviarEmail(msg: {
  para: string;
  assunto: string;
  html: string;
  anexos?: { nome: string; conteudo: Buffer }[];
}): Promise<{ ok: true } | { erro: string }> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!chave || !remetente) return { erro: "Envio de e-mail não configurado (RESEND_API_KEY / EMAIL_REMETENTE)" };

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: remetente,
      to: [msg.para],
      subject: msg.assunto,
      html: msg.html,
      attachments: msg.anexos?.map((a) => ({ filename: a.nome, content: a.conteudo.toString("base64") })),
    }),
  });
  return resp.ok ? { ok: true } : { erro: `Falha no envio (${resp.status})` };
}

/** Escapa texto para interpolar em HTML de e-mail. */
export function escaparHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
