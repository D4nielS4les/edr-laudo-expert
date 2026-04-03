import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, FileSearch, Plus } from "lucide-react";
import { useLaudo } from "@/contexts/LaudoContext";
import { Badge } from "@/components/ui/badge";

export function TabListagem() {
  const { listaLaudos, carregarLaudo, excluirLaudo, novoLaudo } = useLaudo();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Vistorias Realizadas</h2>
          <p className="text-sm text-muted-foreground">Gerencie e consulte todos os laudos salvos no sistema.</p>
        </div>
        <Button onClick={novoLaudo} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Vistoria
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {listaLaudos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>O.S.</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Cliente / Empresa</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vlr. Aprovado</TableHead>
                  <TableHead>Glosa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listaLaudos.map((l) => {
                  const itens = l.analise.itensOrcamento;
                  const valorAprovado = itens
                    .filter(i => i.status === "aprovado")
                    .reduce((sum, i) => sum + i.valorTotal, 0);
                  const valorGlosa = itens
                    .filter(i => i.status === "reprovado")
                    .reduce((sum, i) => sum + i.valorTotal, 0);
                  
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.ordemServico || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{l.dadosVeiculo.placa || "S/ PLACA"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{l.dadosCliente.clienteFinal || "—"}</span>
                          <span className="text-xs text-muted-foreground">{l.dadosCliente.empresa || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(l.dataLaudo)}</TableCell>
                      <TableCell className="text-success font-semibold">
                        {formatCurrency(valorAprovado)}
                      </TableCell>
                      <TableCell className="text-destructive font-semibold">
                        {formatCurrency(valorGlosa)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => carregarLaudo(l.id)} title="Editar/Consultar">
                            <Edit className="h-4 w-4 text-accent" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => excluirLaudo(l.id)} title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileSearch className="h-12 w-12 mb-2 opacity-20" />
              <p>Nenhuma vistoria encontrada</p>
              <Button variant="link" onClick={novoLaudo} className="mt-2">Começar nova vistoria</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}