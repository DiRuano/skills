import { describe, expect, it } from "vitest";
import { esquemaNovoAluno, errosPorCampo } from "./validacao";

const base = { nome: "Ana Souza", sexo_biologico: "F", modalidade: "", lado_dominante: "" };

describe("cadastro de aluno", () => {
  it("exige responsável para menor de 18", () => {
    const r = esquemaNovoAluno.safeParse({ ...base, data_nascimento: "2015-05-10" });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosPorCampo(r.error).responsavel_email).toMatch(/menor de 18/);
  });

  it("aceita menor com responsável e normaliza e-mail", () => {
    const r = esquemaNovoAluno.safeParse({
      ...base,
      data_nascimento: "2015-05-10",
      responsavel_nome: "Carla Souza",
      responsavel_email: " Carla@Exemplo.com ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.responsavel_email).toBe("carla@exemplo.com");
      expect(r.data.modalidade).toBeUndefined();
    }
  });

  it("adulto sem responsável precisa de e-mail próprio", () => {
    const sem = esquemaNovoAluno.safeParse({ ...base, data_nascimento: "2000-01-01" });
    expect(sem.success).toBe(false);
    const com = esquemaNovoAluno.safeParse({ ...base, data_nascimento: "2000-01-01", aluno_email: "a@b.com" });
    expect(com.success).toBe(true);
  });

  it("rejeita nascimento no futuro", () => {
    const r = esquemaNovoAluno.safeParse({ ...base, data_nascimento: "2999-01-01", aluno_email: "a@b.com" });
    expect(r.success).toBe(false);
  });
});
