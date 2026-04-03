import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardCheck, Camera, BarChart3 } from "lucide-react";
import { useLaudo } from "@/contexts/LaudoContext";

export function TabHome() {
  const { laudo } = useLaudo();
  const totalItens = laudo.analise.itensOrcamento.length;
  const aprovados = laudo.analise.itensOrcamento.filter(i => i.status === "aprovado").length;
  const totalFotos = laudo.fotos.length;

  const stats = [
    { label: "Itens no Orçamento", value: totalItens, icon: FileText, color: "bg-info/10 text-info" },
    { label: "Itens Aprovados", value: aprovados, icon: ClipboardCheck, color: "bg-success/10 text-success" },
    { label: "Fotos Registradas", value: totalFotos, icon: Camera, color: "bg-warning/10 text-warning" },
    { label: "Valor Total", value: `R$ ${laudo.analise.itensOrcamento.reduce((s, i) => s + i.valorTotal, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: BarChart3, color: "bg-accent/10 text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Bem-vindo ao Sistema EDR</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sistema de Gestão de Laudos Periciais Automotivos — Inspeção Técnica e Validação de Orçamentos
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Serviços Prestados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="h-5 w-5 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Inspeção Técnica</p>
              <p>Vistoria in loco para verificação de danos e conformidade dos serviços.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Validação de Orçamentos</p>
              <p>Análise técnica dos orçamentos apresentados pelas oficinas, com justificativas para cada item.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
