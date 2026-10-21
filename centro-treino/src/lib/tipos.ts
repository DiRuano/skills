// Tipos das linhas do banco usados na Fase 1.
// Em produção, gerar automaticamente: `npx supabase gen types typescript`.

export type Papel = "admin" | "aluno" | "responsavel";
export type StatusAluno = "aguardando_consentimento" | "ativo" | "inativo";
export type TipoTermo = "dados_menor" | "imagem" | "termos_uso" | "privacidade";

export interface Perfil {
  id: string;
  papel: Papel;
  nome: string;
  email: string;
  telefone: string | null;
}

export interface Aluno {
  id: string;
  nome: string;
  data_nascimento: string;
  sexo_biologico: "M" | "F";
  modalidade: string | null;
  lado_dominante: "direito" | "esquerdo" | "ambidestro" | null;
  foto_path: string | null;
  usuario_id: string | null;
  status: StatusAluno;
  criado_em: string;
}

export interface Termo {
  id: string;
  tipo: TipoTermo;
  versao: string;
  titulo: string;
  conteudo: string;
  hash_conteudo: string;
  vigente: boolean;
}

export interface ConsentimentoAtual {
  aluno_id: string;
  tipo: TipoTermo;
  concedido: boolean;
  versao: string;
  versao_vigente: boolean;
  valido: boolean;
  registrado_em: string;
}

export const ROTULO_STATUS: Record<StatusAluno, string> = {
  aguardando_consentimento: "Aguardando consentimento",
  ativo: "Ativo",
  inativo: "Inativo",
};

export const ROTA_INICIAL: Record<Papel, string> = {
  admin: "/treinador",
  aluno: "/aluno",
  responsavel: "/responsavel",
};
