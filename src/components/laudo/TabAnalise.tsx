import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useLaudo } from "@/contexts/LaudoContext";
import type { ItemOrcamento } from "@/types/laudo";

export function TabAnalise() {
  const { laudo, updateAnalise } = useLaudo();
  const { itensOrcamento, causaRaiz, historicoManutencao, relatoMotorista } = laudo.analise;

  const addItem = () => {
    const novo: ItemOrcamento = {
      id: crypto.randomUUID(),
      codigo: "",
      descricao: "",
      qtdPeca: 1,
      valorPeca: 0,
      qtdMaoObra: 0,
      valorMaoObra: 0,
      valorTotal: 0,
      justificativa: "",
      status: "pendente",
    };
    updateAnalise({ itensOrcamento: [...itensOrcamento, novo] });
  };

  const updateItem = (id: string, updates: Partial<ItemOrcamento>) => {
    updateAnalise({
      itensOrcamento: itensOrcamento.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        updated.valorTotal = (updated.qtdPeca * updated.valorPeca) + (updated.qtdMaoObra * updated.valorMaoObra);
        return updated;
      }),
    });
  };

  const removeItem = (id: string) => {
    updateAnalise({ itensOrcamento: itensOrcamento.filter(i => i.id !== id) });
  };

  const subtotalPecas = itensOrcamento.reduce((s, i) => s + i.qtdPeca * i.valorPeca, 0);
  const subtotalMaoObra = itensOrcamento.reduce((s, i) => s + i.qtdMaoObra * i.valorMaoObra, 0);
  const totalGeral = subtotalPecas + subtotalMaoObra;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relato do Motorista</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={relatoMotorista} onChange={e => updateAnalise({ relatoMotorista: e.target.value })} placeholder="Ex: LANCA DO SKY VOLTOU A APRESENTAR ESTALOS QUANDO FAZ MOVIMENTOS." rows={2} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens do Orçamento</CardTitle>
          <Button size="sm" onClick={addItem} className="gap-1"><Plus className="h-4 w-4" /> Adicionar Item</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {itensOrcamento.map((item, idx) => (
            <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Item {idx + 1}</span>
                <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label className="text-xs">Código</Label><Input value={item.codigo} onChange={e => updateItem(item.id, { codigo: e.target.value })} placeholder="88331579" /></div>
                <div className="md:col-span-2"><Label className="text-xs">Descrição</Label><Input value={item.descricao} onChange={e => updateItem(item.id, { descricao: e.target.value })} placeholder="Rolamento Sem Fim - Substituir" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Qtd Peça</Label><Input type="number" value={item.qtdPeca} onChange={e => updateItem(item.id, { qtdPeca: +e.target.value })} /></div>
                <div><Label className="text-xs">Valor Peça (R$)</Label><Input type="number" step="0.01" value={item.valorPeca} onChange={e => updateItem(item.id, { valorPeca: +e.target.value })} /></div>
                <div><Label className="text-xs">Qtd Mão de Obra</Label><Input type="number" value={item.qtdMaoObra} onChange={e => updateItem(item.id, { qtdMaoObra: +e.target.value })} /></div>
                <div><Label className="text-xs">Valor Mão de Obra (R$)</Label><Input type="number" step="0.01" value={item.valorMaoObra} onChange={e => updateItem(item.id, { valorMaoObra: +e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={item.status} onValueChange={v => updateItem(item.id, { status: v as ItemOrcamento["status"] })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="reprovado">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm font-semibold text-foreground mt-5">
                  Total: R$ {item.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <Label className="text-xs">Justificativa Técnica</Label>
                <Textarea value={item.justificativa} onChange={e => updateItem(item.id, { justificativa: e.target.value })} placeholder="Descreva a justificativa técnica para este item..." rows={3} />
              </div>
            </div>
          ))}

          {itensOrcamento.length > 0 && (
            <div className="border-t border-border pt-3 flex flex-wrap gap-6 text-sm">
              <span>Subtotal Peças: <strong>R$ {subtotalPecas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
              <span>Subtotal M.O.: <strong>R$ {subtotalMaoObra.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
              <span className="text-foreground font-bold">Total Geral: R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Causa Raiz da Intercorrência</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={causaRaiz} onChange={e => updateAnalise({ causaRaiz: e.target.value })} placeholder="Descreva os pontos pertinentes sobre a causa raiz..." rows={4} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Manutenção</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={historicoManutencao} onChange={e => updateAnalise({ historicoManutencao: e.target.value })} placeholder="Considerações pertinentes com base no histórico de manutenção..." rows={4} />
        </CardContent>
      </Card>
    </div>
  );
}
