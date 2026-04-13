import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useLaudo } from "@/contexts/LaudoContext";
import type { ItemOrcamento } from "@/types/laudo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function TabAnalise() {
  const { laudo, updateAnalise } = useLaudo();
  const { itensOrcamento, causaRaiz, historicoManutencao, relatoMotorista } = laudo.analise;
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addItem = () => {
    const novo: ItemOrcamento = {
      id: crypto.randomUUID(),
      codigo: "",
      grupo: "",
      descricao: "",
      acao: "",
      statusItem: "",
      qtdPeca: 1,
      valorPeca: 0,
      qtdMaoObra: 0,
      valorMaoObra: 0,
      valorTotal: 0,
      impostos: { ipi: 0, icms: 0 },
      justificativa: "",
      status: "pendente",
    };
    updateAnalise({ itensOrcamento: [...itensOrcamento, novo] });
    setOpenItems(prev => ({ ...prev, [novo.id]: true }));
  };

  const updateItem = (id: string, updates: Partial<ItemOrcamento>) => {
    updateAnalise({
      itensOrcamento: itensOrcamento.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        updated.valorTotal = updated.valorPeca + updated.valorMaoObra;
        return updated;
      }),
    });
  };

  const removeItem = (id: string) => {
    updateAnalise({ itensOrcamento: itensOrcamento.filter(i => i.id !== id) });
  };

  const subtotalPecas = itensOrcamento.reduce((s, i) => s + i.valorPeca, 0);
  const subtotalMaoObra = itensOrcamento.reduce((s, i) => s + i.valorMaoObra, 0);
  const totalGeral = itensOrcamento.reduce((s, i) => s + i.valorTotal, 0);

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
            <Collapsible 
              key={item.id} 
              open={openItems[item.id]} 
              onOpenChange={() => toggleItem(item.id)}
              className="border border-border rounded-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                <CollapsibleTrigger asChild>
                  <button className="flex flex-1 items-center gap-3 text-left">
                    {openItems[item.id] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="text-sm font-bold text-primary">Item {idx + 1}</span>
                      <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-md">
                        {item.descricao || "Sem descrição"}
                      </span>
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded border transition-colors",
                        item.status === 'reprovado' 
                          ? "text-destructive bg-destructive/10 border-destructive/20" 
                          : item.status === 'aprovado'
                            ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                            : "text-amber-600 bg-amber-50 border-amber-100"
                      )}>
                        R$ {item.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <CollapsibleContent className="p-4 space-y-4 border-t border-border bg-card">
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
                </div>
                <div>
                  <Label className="text-xs">Justificativa Técnica</Label>
                  <Textarea value={item.justificativa} onChange={e => updateItem(item.id, { justificativa: e.target.value })} placeholder="Descreva a justificativa técnica para este item..." rows={3} />
                </div>
              </CollapsibleContent>
            </Collapsible>
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