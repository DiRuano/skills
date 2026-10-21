import Link from "next/link";

/** Links para política e termos — presentes em todas as telas de cadastro. */
export function RodapeLegal() {
  return (
    <p className="mt-6 text-center text-xs text-suave">
      <Link href="/privacidade" className="underline underline-offset-2">Política de privacidade</Link>
      {" · "}
      <Link href="/termos" className="underline underline-offset-2">Termos de uso</Link>
    </p>
  );
}
