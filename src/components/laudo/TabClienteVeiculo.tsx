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
          <div><Label>Status OS</Label><Input value={laudo.dadosOS.statusOS} onChange={e => updateLaudo({ dadosOS: { ...laudo.dadosOS, statusOS: e.target.value } })} placeholder="Ex: Em orçamento" /></div>
          <div><Label>Tipo Manutenção</Label><Input value={laudo.dadosOS.tipoManutencao} onChange={e => updateLaudo({ dadosOS: { ...laudo.dadosOS, tipoManutencao: e.target.value } })} placeholder="Corretiva, Preventiva..." /></div>
          <div><Label>Data Emissão</Label><Input type="date" value={laudo.dadosOS.dataEmissao} onChange={e => updateLaudo({ dadosOS: { ...laudo.dadosOS, dataEmissao: e.target.value } })} /></div>
          <div><Label>Prev. Conclusão</Label><Input type="date" value={laudo.dadosOS.dataPrevConclusao} onChange={e => updateLaudo({ dadosOS: { ...laudo.dadosOS, dataPrevConclusao: e.target.value } })} /></div>
          <div><Label>Analista</Label><Input value={laudo.dadosProcesso.analista} onChange={e => updateProcesso({ analista: e.target.value })} /></div>
          <div><Label>Vistoriador</Label><Input value={laudo.dadosProcesso.vistoriador} onChange={e => updateProcesso({ vistoriador: e.target.value })} /></div>
          <div><Label>Resp. Técnico</Label><Input value={laudo.dadosProcesso.respTecnico} onChange={e => updateProcesso({ respTecnico: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados do Cliente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Solicitante</Label><Input value={laudo.dadosCliente.solicitante} onChange={e => updateCliente({ solicitante: e.target.value })} placeholder="Ex: Wellington Xavier" /></div>
          <div><Label>Empresa</Label><Input value={laudo.dadosCliente.empresa} onChange={e => updateCliente({ empresa: e.target.value })} placeholder="Ex: Edenred/Ticket Log" /></div>
          <div><Label>Cliente Final</Label><Input value={laudo.dadosCliente.clienteFinal} onChange={e => updateCliente({ clienteFinal: e.target.value })} placeholder="Ex: ENEL CE" /></div>
          <div><Label>Agendamento</Label><Input value={laudo.dadosCliente.agendamento} onChange={e => updateCliente({ agendamento: e.target.value })} placeholder="Nº Agendamento" /></div>
          <div className="md:col-span-2"><Label>Endereço</Label><Input value={laudo.dadosCliente.endereco} onChange={e => updateCliente({ endereco: e.target.value })} placeholder="Endereço completo" /></div>
          <div><Label>Bairro</Label><Input value={laudo.dadosCliente.bairro} onChange={e => updateCliente({ bairro: e.target.value })} /></div>
          <div><Label>Cidade/UF</Label><Input value={laudo.dadosCliente.cidade} onChange={e => updateCliente({ cidade: e.target.value })} /></div>
          <div><Label>CEP</Label><Input value={laudo.dadosCliente.cep} onChange={e => updateCliente({ cep: e.target.value })} placeholder="00000-000" /></div>
          <div><Label>Telefone</Label><Input value={laudo.dadosCliente.telefone} onChange={e => updateCliente({ telefone: e.target.value })} /></div>
          <div><Label>E-mail</Label><Input value={laudo.dadosCliente.email} onChange={e => updateCliente({ email: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados do Veículo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Marca / Modelo</Label><Input value={laudo.dadosVeiculo.marcaModelo} onChange={e => updateVeiculo({ marcaModelo: e.target.value })} placeholder="Ex: VW 8.160 Delivery" /></div>
          <div><Label>Ano Fabricação</Label><Input value={laudo.dadosVeiculo.anoFabricacao} onChange={e => updateVeiculo({ anoFabricacao: e.target.value })} placeholder="2015" /></div>
          <div><Label>Ano Modelo</Label><Input value={laudo.dadosVeiculo.anoModelo} onChange={e => updateVeiculo({ anoModelo: e.target.value })} placeholder="2016" /></div>
          <div><Label>Placa</Label><Input value={laudo.dadosVeiculo.placa} onChange={e => updateVeiculo({ placa: e.target.value })} placeholder="ABC1D23" /></div>
          <div><Label>Chassi</Label><Input value={laudo.dadosVeiculo.chassi} onChange={e => updateVeiculo({ chassi: e.target.value })} /></div>
          <div><Label>Hodômetro (km)</Label><Input value={laudo.dadosVeiculo.hodometro} onChange={e => updateVeiculo({ hodometro: e.target.value })} placeholder="132.322" /></div>
          <div><Label>Motorização</Label><Input value={laudo.dadosVeiculo.motorizacao} onChange={e => updateVeiculo({ motorizacao: e.target.value })} placeholder="Ex: 3.0 Diesel" /></div>
          <div><Label>Cor</Label><Input value={laudo.dadosVeiculo.cor} onChange={e => updateVeiculo({ cor: e.target.value })} /></div>
          <div><Label>Combustível</Label><Input value={laudo.dadosVeiculo.combustivel} onChange={e => updateVeiculo({ combustivel: e.target.value })} placeholder="Diesel, Flex..." /></div>
        </CardContent>
      </Card>
    </div>
  );
}
