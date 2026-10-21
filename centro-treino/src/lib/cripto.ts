import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifra de campos sensíveis (LGPD art. 11) com AES-256-GCM.
 * Formato armazenado: "v1:<iv base64>:<tag base64>:<texto cifrado base64>".
 * O prefixo de versão permite rotacionar a chave no futuro (v2, v3...).
 */
const VERSAO = "v1";

function obterChave(chaveBase64 = process.env.DADOS_SENSIVEIS_CHAVE): Buffer {
  if (!chaveBase64) throw new Error("DADOS_SENSIVEIS_CHAVE não configurada");
  const chave = Buffer.from(chaveBase64, "base64");
  if (chave.length !== 32) throw new Error("DADOS_SENSIVEIS_CHAVE deve ter 32 bytes em base64");
  return chave;
}

export function cifrar(texto: string | null | undefined, chaveBase64?: string): string | null {
  if (texto == null || texto.trim() === "") return null;
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", obterChave(chaveBase64), iv);
  const dados = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return [VERSAO, iv.toString("base64"), tag.toString("base64"), dados.toString("base64")].join(":");
}

export function decifrar(valor: string | null | undefined, chaveBase64?: string): string | null {
  if (!valor) return null;
  const [versao, iv, tag, dados] = valor.split(":");
  if (versao !== VERSAO || !iv || !tag || dados === undefined) {
    throw new Error("Formato de dado cifrado desconhecido");
  }
  const decifra = createDecipheriv("aes-256-gcm", obterChave(chaveBase64), Buffer.from(iv, "base64"));
  decifra.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decifra.update(Buffer.from(dados, "base64")), decifra.final()]).toString("utf8");
}
