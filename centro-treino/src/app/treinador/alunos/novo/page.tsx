import { FormularioNovoAluno } from "./formulario";
import { RodapeLegal } from "@/components/rodape-legal";

export default function NovoAluno() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Novo aluno</h1>
      <FormularioNovoAluno />
      <RodapeLegal />
    </div>
  );
}
