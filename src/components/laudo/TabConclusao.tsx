import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLaudo } from "@/contexts/LaudoContext";

export function TabConclusao() {
  const { laudo, updateConclusao } = useLaudo();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Parecer Técnico</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={laudo.conclusao.parecerTecnico}
            onChange={e => updateConclusao({ parecerTecnico: e.target.value })}
            placeholder="Insira o parecer técnico final com base nas análises realizadas..."
            rows={6}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recomendações Técnicas</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={laudo.conclusao.recomendacoes}
            onChange={e => updateConclusao({ recomendacoes: e.target.value })}
            placeholder="Recomendações quanto à longevidade, desempenho e segurança operacional do veículo..."
            rows={6}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Assinaturas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Analista Vistoriador</Label>
            <Input
              value={laudo.conclusao.analistaVistoriador}
              onChange={e => updateConclusao({ analistaVistoriador: e.target.value })}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <Label>Gestor de Operações</Label>
            <Input
              value={laudo.conclusao.gestorOperacoes}
              onChange={e => updateConclusao({ gestorOperacoes: e.target.value })}
              placeholder="Nome completo"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
