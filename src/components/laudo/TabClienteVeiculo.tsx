import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLaudo } from "@/contexts/LaudoContext";

export function TabClienteVeiculo() {
  const { laudo, updateCliente, updateVeiculo, updateProcesso, updateLaudo } = useLaudo();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Informações Gerais do Processo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Ordem de Serviço</Label><Input value={laudo.ordemServico} onChange={e => updateLaudo({ ordemServico: e.target.value })} placeholder="Ex: 20081179" /></div>
          <div><Label>Data do Laudo</Label><Input type="date" value={laudo.dataLaudo} onChange={e => updateLaudo({ dataLaudo: e.target.value })} /></div>
          <div><Label>Analista</Label><Input value={laudo.dadosProcesso.analista} onChange={e => updateProcesso({ analista: e.target.value })} /></div>
          <div><Label>Vistoriador</Label><Input value={laudo.dadosProcesso.vistoriador} onChange={e => updateProcesso({ vistoriador: e.target.value })} /></div>
          <div><Label>Resp. Técnico</Label><Input value={laudo.dadosProcesso.respTecnico} onChange={e => updateProcesso({ respTecnico: e.target.value })} /></div>
          <div><Label>Cargo</Label><Input value={laudo.dadosProcesso.cargoRespTecnico} onChange={e => updateProcesso({ cargoRespTecnico: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados do Cliente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Solicitante</Label><Input value={laudo.dadosCliente.solicitante} onChange={e => updateCliente({ solicitante: e.target.value })} placeholder="Ex: Wellington Xavier" /></div>
          <div><Label>Empresa</Label><Input value={laudo.dadosCliente.empresa} onChange={e => updateCliente({ empresa: e.target.value })} placeholder="Ex: Edenred/Ticket Log" /></div>
          <div><Label>Cliente Final</Label><Input value={laudo.dadosCliente.clienteFinal} onChange={e => updateCliente({ clienteFinal: e.target.value })} placeholder="Ex: ENEL CE" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados do Veículo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Marca / Modelo</Label><Input value={laudo.dadosVeiculo.marcaModelo} onChange={e => updateVeiculo({ marcaModelo: e.target.value })} placeholder="Ex: Caminhão VW 8.160 Delivery" /></div>
          <div><Label>Ano Fabricação</Label><Input value={laudo.dadosVeiculo.anoFabricacao} onChange={e => updateVeiculo({ anoFabricacao: e.target.value })} placeholder="2015" /></div>
          <div><Label>Ano Modelo</Label><Input value={laudo.dadosVeiculo.anoModelo} onChange={e => updateVeiculo({ anoModelo: e.target.value })} placeholder="2016" /></div>
          <div><Label>Placa</Label><Input value={laudo.dadosVeiculo.placa} onChange={e => updateVeiculo({ placa: e.target.value })} placeholder="FRG9776" /></div>
          <div><Label>Chassi</Label><Input value={laudo.dadosVeiculo.chassi} onChange={e => updateVeiculo({ chassi: e.target.value })} placeholder="9531M52P2GR604005" /></div>
          <div><Label>Hodômetro (km)</Label><Input value={laudo.dadosVeiculo.hodometro} onChange={e => updateVeiculo({ hodometro: e.target.value })} placeholder="132.322" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
