import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { cifrar, decifrar } from "./cripto";

const chave = randomBytes(32).toString("base64");

describe("cifra de dados sensíveis", () => {
  it("cifra e decifra preservando acentos", () => {
    const texto = "Entorse de tornozelo direito em 03/2025; dor patelar (Osgood-Schlatter?)";
    const c = cifrar(texto, chave)!;
    expect(c.startsWith("v1:")).toBe(true);
    expect(c).not.toContain("tornozelo");
    expect(decifrar(c, chave)).toBe(texto);
  });

  it("usa IV aleatório: mesmo texto gera cifras diferentes", () => {
    expect(cifrar("abc", chave)).not.toBe(cifrar("abc", chave));
  });

  it("texto vazio vira null", () => {
    expect(cifrar("   ", chave)).toBeNull();
    expect(decifrar(null, chave)).toBeNull();
  });

  it("rejeita chave errada e dado adulterado", () => {
    const c = cifrar("segredo", chave)!;
    expect(() => decifrar(c, randomBytes(32).toString("base64"))).toThrow();
    const partes = c.split(":");
    partes[3] = Buffer.from("outro").toString("base64");
    expect(() => decifrar(partes.join(":"), chave)).toThrow();
  });

  it("rejeita chave de tamanho errado", () => {
    expect(() => cifrar("x", randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
  });
});
