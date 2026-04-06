import { Card, CardContent } from "@/components/ui/card";
import { useLaudo } from "@/contexts/LaudoContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, Clock, DollarSign, Wrench, AlertCircle, FileSearch, ClipboardList, FileUp, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { extractTextFromPDF, parseOSData } from "@/utils/pdfParser";
import { parseXMLOrcamento } from "@/utils/xmlParser";
import { useToast } from "@/hooks/use-toast";

export function TabHome() {
  const { listaLaudos, setActiveTab, updateLaudo, novoLaudo } = useLaudo();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);
  
  const laudosFinalizados = listaLaudos.filter(l => l.status === 'finalizado');
  const laudosPendentes = listaLaudos.filter(l => l.status === 'pendente' || !l.status);
  
  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({ title: "Processando PDF...", description: "Extraindo informações do orçamento." });

    try {
      const text = await extractTextFromPDF(file);
      const data = parseOSData(text);

      updateLaudo({
        id: crypto.randomUUID(),
        status: 'pendente',
        ordemServico: data.ordemServico || '',
        dadosCliente: {
          solicitante: data.dadosCliente?.solicitante || '',
          empresa: data.dadosCliente?.empresa || '',
          clienteFinal: data.dadosCliente?.clienteFinal || '',
        },
        dadosVeiculo: {
          marcaModelo: data.dadosVeiculo?.marcaModelo || '',
          anoFabricacao: data.dadosVeiculo?.anoFabricacao || '',
          anoModelo: data.dadosVeiculo?.anoModelo || '',
          placa: data.dadosVeiculo?.placa || '',
          chassi: data.dadosVeiculo?.chassi || '',
          hodometro: data.dadosVeiculo?.hodometro || '',
        },
        dadosOficina: {
          nome: data.dadosOficina?.nome || '',
          endereco: data.dadosOficina?.endereco || '',
          bairro: data.dadosOficina?.bairro || '',
          cidade: data.dadosOficina?.cidade || '',
          telefone: data.dadosOficina?.telefone || '',
          responsavel: data.dadosOficina?.responsavel || '',
          cnpj: data.dadosOficina?.cnpj || '',
        },
        analise: {
          itensOrcamento: data.itens || [],
          causaRaiz: '',
          historicoManutencao: '',
          relatoMotorista: '',
        },
        dataLaudo: new Date().toISOString().split("T")[0],
      });

      toast({ 
        title: "Importação Concluída!", 
        description: `OS ${data.ordemServico || ''} carregada com ${data.itens.length} itens.` 
      });
      
      setActiveTab("cliente");
    } catch (err) {
      console.error(err);
      toast({ 
        title: "Erro na Importação", 
        description: "Não foi possível ler os dados deste PDF.", 
        variant: "destructive" 
      });
    }
  };

  const handleImportXML = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast({ title: "Processando XML...", description: "Extraindo informações do orçamento." });
    try {
      const text = await file.text();
      const data = parseXMLOrcamento(text);
      
      // Aplica tudo de uma vez para evitar perda por batching do React
      updateLaudo({
        id: crypto.randomUUID(),
        status: 'pendente',
        ordemServico: data.ordemServico || '',
        dadosCliente: {
          solicitante: data.dadosCliente.solicitante || '',
          empresa: data.dadosCliente.empresa || '',
          clienteFinal: data.dadosCliente.clienteFinal || '',
        },
        dadosVeiculo: {
          marcaModelo: data.dadosVeiculo.marcaModelo || '',
          anoFabricacao: data.dadosVeiculo.anoFabricacao || '',
          anoModelo: data.dadosVeiculo.anoModelo || '',
          placa: data.dadosVeiculo.placa || '',
          chassi: data.dadosVeiculo.chassi || '',
          hodometro: data.dadosVeiculo.hodometro || '',
        },
        dadosOficina: {
          nome: data.dadosOficina.nome || '',
          endereco: data.dadosOficina.endereco || '',
          bairro: data.dadosOficina.bairro || '',
          cidade: data.dadosOficina.cidade || '',
          telefone: data.dadosOficina.telefone || '',
          responsavel: data.dadosOficina.responsavel || '',
          cnpj: data.dadosOficina.cnpj || '',
        },
        analise: {
          itensOrcamento: data.itens,
          causaRaiz: '',
          historicoManutencao: '',
          relatoMotorista: '',
        },
        dataLaudo: new Date().toISOString().split("T")[0],
      });

      toast({ title: "Importação XML Concluída!", description: `OS ${data.ordemServico || ''} carregada com ${data.itens.length} itens.` });
      setActiveTab("cliente");
    } catch (err) {
      console.error(err);
      toast({ title: "Erro na Importação XML", description: "Não foi possível ler os dados deste arquivo XML.", variant: "destructive" });
    }
  };

  const processData = () => {
    const groups: Record<string, any> = {};
    const sortedLaudos = [...laudosFinalizados].sort((a, b) => a.dataLaudo.localeCompare(b.dataLaudo));

    sortedLaudos.forEach(l => {
      const date = l.dataLaudo || new Date().toISOString().split('T')[0];
      const month = format(parseISO(date), "dd MMM", { locale: ptBR });
      
      if (!groups[month]) {
        groups[month] = { month, aprovado: 0, glosa: 0, qtd: 0 };
      }
      
      const vlrAprovado = l.analise.itensOrcamento
        .filter(i => i.status === "aprovado")
        .reduce((s, i) => s + i.valorTotal, 0);
      const vlrGlosa = l.analise.itensOrcamento
        .filter(i => i.status === "reprovado")
        .reduce((s, i) => s + i.valorTotal, 0);
        
      groups[month].aprovado += vlrAprovado;
      groups[month].glosa += vlrGlosa;
      groups[month].qtd += 1;
    });

    return Object.values(groups).slice(-4);
  };

  const chartData = processData();
  
  const totalGeralAnalisado = laudosFinalizados.reduce((acc, l) => 
    acc + l.analise.itensOrcamento.reduce((s, i) => s + i.valorTotal, 0), 0);
  
  const totalGeralAprovado = laudosFinalizados.reduce((acc, l) => 
    acc + l.analise.itensOrcamento.filter(i => i.status === "aprovado").reduce((s, i) => s + i.valorTotal, 0), 0);
    
  const totalGeralGlosa = laudosFinalizados.reduce((acc, l) => 
    acc + l.analise.itensOrcamento.filter(i => i.status === "reprovado").reduce((s, i) => s + i.valorTotal, 0), 0);

  const taxaGlosa = totalGeralAnalisado > 0 ? (totalGeralGlosa / totalGeralAnalisado) * 100 : 0;

  const donutData = [
    { name: "Glosa", value: totalGeralGlosa },
    { name: "Restante", value: totalGeralAnalisado - totalGeralGlosa },
  ];

  const formatCurrency = (val: number) => 
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Dashboard de Operações</h2>
        <div className="flex gap-2 flex-wrap">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="application/pdf" 
            onChange={handleImportPDF} 
          />
          <input 
            type="file" 
            ref={xmlInputRef} 
            className="hidden" 
            accept=".xml,text/xml,application/xml" 
            onChange={handleImportXML} 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            className="gap-2 bg-accent hover:bg-accent/90"
          >
            <FileUp className="h-4 w-4" /> Importar PDF
          </Button>
          <Button 
            onClick={() => xmlInputRef.current?.click()} 
            variant="outline"
            className="gap-2 border-accent text-accent hover:bg-accent/5"
          >
            <FileCode className="h-4 w-4" /> Importar XML
          </Button>
          <Button onClick={novoLaudo} variant="outline" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Nova Vistoria Manual
          </Button>
        </div>
      </div>

      {laudosFinalizados.length === 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[#2d4a6d] text-white border-none shadow-lg">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase opacity-70 font-bold tracking-wider">Vistorias Pendentes</p>
                  <h3 className="text-4xl font-black mt-1">{laudosPendentes.length.toString().padStart(2, '0')}</h3>
                </div>
                <div className="bg-white/10 p-3 rounded-full">
                  <Clock className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-md">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Vistorias Finalizadas</p>
                  <h3 className="text-4xl font-black mt-1 text-[#2d4a6d]">00</h3>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <Truck className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-md">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Total Geral</p>
                  <h3 className="text-4xl font-black mt-1 text-[#2d4a6d]">{listaLaudos.length.toString().padStart(2, '0')}</h3>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-xl border-2 border-dashed border-border">
            <FileSearch className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">Dashboard de Análise Vazio</h3>
            <p className="text-sm text-muted-foreground max-w-xs text-center mt-2 mb-6">
              Importe um PDF ou finalize vistorias na aba de Pendentes para visualizar as métricas financeiras.
            </p>
            <Button onClick={() => setActiveTab("pendentes")} variant="outline" className="gap-2">
              Ver Pendentes ({laudosPendentes.length})
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-xl border border-border shadow-2xl bg-[#e0e6ed]">
          {/* ... (Resto do código do dashboard permanece igual) */}
          <div className="lg:col-span-3 bg-[#2d4a6d] p-8 text-white flex flex-col items-center">
            <div className="mb-8">
              <Truck className="h-20 w-20 text-[#4db6ac]" />
            </div>
            <h3 className="text-xl font-bold uppercase tracking-widest mb-6">Status Vistorias</h3>
            
            <div className="w-full space-y-4 mb-12">
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Total Finalizado</span>
                <span className="font-bold">{laudosFinalizados.length}</span>
              </div>
              <div className="flex justify-between text-sm p-2 bg-white/5 rounded border border-white/10">
                <span className="opacity-80 flex items-center gap-2"><Clock className="h-4 w-4 text-orange-400" /> Pendentes</span>
                <span className="font-bold text-orange-400">{laudosPendentes.length.toString().padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Com Glosa</span>
                <span className="font-bold text-[#4db6ac]">{laudosFinalizados.filter(l => l.analise.itensOrcamento.some(i => i.status === 'reprovado')).length}</span>
              </div>
            </div>

            <div className="relative w-full aspect-square flex items-center justify-center">
              <div className="absolute text-center">
                <span className="text-4xl font-bold text-[#4db6ac]">{taxaGlosa.toFixed(0)}%</span>
                <p className="text-[10px] uppercase opacity-60">Percentual de Glosa</p>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius="70%"
                    outerRadius="90%"
                    paddingAngle={0}
                    dataKey="value"
                    startAngle={90}
                    endAngle={450}
                  >
                    <Cell fill="#4db6ac" />
                    <Cell fill="rgba(255,255,255,0.1)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-9 flex flex-col">
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-[#2d4a6d] font-bold uppercase tracking-tight text-lg">Análise de Valores (Finalizadas)</h3>
                  <p className="text-xs text-muted-foreground">(período x valor)</p>
                </div>
                <div className="bg-[#2d4a6d] text-white px-4 py-2 rounded flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3" />
                  <span>ÚLTIMA ATUALIZAÇÃO: {format(new Date(), "HH:mm:ss")}</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 h-[300px]">
                <div className="col-span-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cfd8dc" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={10} dy={10} />
                      <YAxis hide />
                      <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                      <Bar dataKey="aprovado" name="Aprovado" fill="#2d4a6d" barSize={40} />
                      <Bar dataKey="glosa" name="Glosa" fill="#4db6ac" barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="col-span-2 flex flex-col justify-end pb-8">
                  <div className="h-full w-12 bg-[#cfd8dc] relative rounded-sm overflow-hidden self-center">
                    <div 
                      className="absolute bottom-0 w-full bg-[#2d4a6d]" 
                      style={{ height: `${(totalGeralAprovado / totalGeralAnalisado) * 100}%` }}
                    />
                    <div 
                      className="absolute bottom-0 w-full bg-[#4db6ac] opacity-80" 
                      style={{ height: `${taxaGlosa}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-center mt-2 uppercase text-[#2d4a6d]">Total</p>
                </div>
              </div>

              <div className="flex gap-6 mt-4 text-[10px] font-bold uppercase text-[#2d4a6d]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#2d4a6d]" /> Valores Aprovados
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#4db6ac]" /> Valores Glosados
                </div>
              </div>
            </div>

            <div className="bg-[#2d4a6d] p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-white">
              <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest opacity-80">Valores Financeiros</h4>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-1 bg-[#4db6ac]" />
                    <div>
                      <p className="text-[10px] uppercase opacity-60">Média por Laudo</p>
                      <p className="text-3xl font-light tracking-tighter">
                        <span className="text-sm opacity-60 mr-1">R$</span>
                        {(totalGeralAnalisado / (laudosFinalizados.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-[2px] bg-[#4db6ac] opacity-40" />
                      <div>
                        <p className="text-[8px] uppercase opacity-60">Total Aprovado</p>
                        <p className="text-lg font-medium">{formatCurrency(totalGeralAprovado)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-[2px] bg-[#4db6ac] opacity-40" />
                      <div>
                        <p className="text-[8px] uppercase opacity-60">Total Glosa</p>
                        <p className="text-lg font-medium">{formatCurrency(totalGeralGlosa)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest opacity-80">Volume de Itens</h4>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-1 bg-[#4db6ac]" />
                    <div>
                      <p className="text-[10px] uppercase opacity-60">Média de Itens / Laudo</p>
                      <p className="text-3xl font-light tracking-tighter">
                        { (laudosFinalizados.reduce((acc, l) => acc + l.analise.itensOrcamento.length, 0) / (laudosFinalizados.length || 1)).toFixed(1) }
                        <span className="text-sm opacity-60 ml-1">itens</span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-[2px] bg-[#4db6ac] opacity-40" />
                      <div>
                        <p className="text-[8px] uppercase opacity-60">Total Peças</p>
                        <p className="text-lg font-medium">{laudosFinalizados.reduce((acc, l) => acc + l.analise.itensOrcamento.reduce((s, i) => s + i.qtdPeca, 0), 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-[2px] bg-[#4db6ac] opacity-40" />
                      <div>
                        <p className="text-[8px] uppercase opacity-60">Total M.O.</p>
                        <p className="text-lg font-medium">{laudosFinalizados.reduce((acc, l) => acc + l.analise.itensOrcamento.reduce((s, i) => s + i.qtdMaoObra, 0), 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 border-l border-white/10 pl-8 flex flex-col justify-center">
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-4 text-center">Resumo Geral</h4>
                <div className="flex flex-col items-center mb-6">
                  <Truck className="h-10 w-10 text-[#4db6ac] mb-2" />
                  <p className="text-xs uppercase opacity-60">Total Vistorias</p>
                  <p className="text-4xl font-bold">{laudosFinalizados.length.toString().padStart(2, '0')}</p>
                </div>
                <div className="space-y-3 text-[10px] uppercase font-bold">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#4db6ac]" /> Aprovadas</span>
                    <span>{laudosFinalizados.filter(l => l.analise.itensOrcamento.every(i => i.status === 'aprovado')).length.toString().padStart(2, '0')}</span>
                  </div>
                  <div className="flex justify-between items-center p-1 bg-white/5 rounded">
                    <span className="flex items-center gap-2"><Clock className="h-3 w-3 text-orange-400" /> Pendentes</span>
                    <span className="text-orange-400">{laudosPendentes.length.toString().padStart(2, '0')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><AlertCircle className="h-3 w-3 text-red-400" /> Com Glosa</span>
                    <span>{laudosFinalizados.filter(l => l.analise.itensOrcamento.some(i => i.status === 'reprovado')).length.toString().padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}