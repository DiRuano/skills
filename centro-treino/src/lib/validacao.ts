import { z } from "zod";
import { ehMenor, hojeSP } from "./idade";

/** Converte campo vazio de formulário em undefined. */
const opcional = (s: z.ZodString) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), s.optional());

export const esquemaNovoAluno = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome completo"),
    data_nascimento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .refine((d) => d <= hojeSP(), "Data de nascimento no futuro")
      .refine((d) => d >= "1990-01-02", "Data de nascimento muito antiga"),
    sexo_biologico: z.enum(["M", "F"], { message: "Informe o sexo biológico" }),
    modalidade: opcional(z.string().trim().max(80)),
    lado_dominante: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["direito", "esquerdo", "ambidestro"]).optional(),
    ),
    historico_lesoes: opcional(z.string().trim().max(5000)),
    observacoes: opcional(z.string().trim().max(5000)),
    responsavel_nome: opcional(z.string().trim().min(2).max(120)),
    responsavel_email: opcional(z.string().trim().toLowerCase().email("E-mail do responsável inválido")),
    responsavel_parentesco: opcional(z.string().trim().max(40)),
    aluno_email: opcional(z.string().trim().toLowerCase().email("E-mail do aluno inválido")),
  })
  .superRefine((d, ctx) => {
    // Regra de negócio: menor de 18 anos exige responsável
    if (ehMenor(d.data_nascimento) && (!d.responsavel_email || !d.responsavel_nome)) {
      ctx.addIssue({
        code: "custom",
        path: ["responsavel_email"],
        message: "Aluno menor de 18 anos precisa de responsável (nome e e-mail)",
      });
    }
    // Maior de idade sem responsável consente por si: precisa de e-mail próprio
    if (!ehMenor(d.data_nascimento) && !d.responsavel_email && !d.aluno_email) {
      ctx.addIssue({
        code: "custom",
        path: ["aluno_email"],
        message: "Aluno maior de idade sem responsável precisa de e-mail próprio para dar o consentimento",
      });
    }
  });

export type NovoAluno = z.infer<typeof esquemaNovoAluno>;

export const esquemaConsentimento = z.object({
  aluno_id: z.string().uuid(),
  // O aceite do termo de dados é obrigatório para ativar o aluno
  dados: z.literal("sim", { message: "É preciso marcar o consentimento para continuar" }),
  // Imagem é opcional e independente
  imagem: z.enum(["sim", "nao"]),
});

export const esquemaSolicitacaoExclusao = z.object({
  aluno_id: z.string().uuid(),
  motivo: opcional(z.string().trim().max(1000)),
  confirmacao: z.literal("EXCLUIR", { message: 'Digite EXCLUIR para confirmar' }),
});

/** Achata erros do zod em { campo: mensagem } para exibir no formulário. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = issue.path.join(".") || "_form";
    saida[campo] ??= issue.message;
  }
  return saida;
}
