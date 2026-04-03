import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLaudo } from "@/contexts/LaudoContext";

export function TabOficina() {
  const { laudo, updateOficina } = useLaudo();

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Dados da Oficina</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Nome da Oficina</Label><Input value={laudo.dadosOficina.nome} onChange={e => updateOficina({ nome: e.target.value })} placeholder="Ex: ATIVA CAR" /></div>
        <div><Label>CNPJ</Label><Input value={laudo.dadosOficina.cnpj} onChange={e => updateOficina({ cnpj: e.target.value })} placeholder="22.740.348/0001-58" /></div>
        <div className="md:col-span-2"><Label>Endereço</Label><Input value={laudo.dadosOficina.endereco} onChange={e => updateOficina({ endereco: e.target.value })} placeholder="Avenida Radialista João Ramos, Nº 1581" /></div>
        <div><Label>Bairro</Label><Input value={laudo.dadosOficina.bairro} onChange={e => updateOficina({ bairro: e.target.value })} placeholder="Cidade Nova" /></div>
        <div><Label>Cidade / UF</Label><Input value={laudo.dadosOficina.cidade} onChange={e => updateOficina({ cidade: e.target.value })} placeholder="Maracanaú - CE" /></div>
        <div><Label>Telefone</Label><Input value={laudo.dadosOficina.telefone} onChange={e => updateOficina({ telefone: e.target.value })} placeholder="(85) 98632-2032" /></div>
        <div><Label>Responsável</Label><Input value={laudo.dadosOficina.responsavel} onChange={e => updateOficina({ responsavel: e.target.value })} placeholder="Sr. Edson" /></div>
      </CardContent>
    </Card>
  );
}
