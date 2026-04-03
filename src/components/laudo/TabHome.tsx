import { Card, CardContent } from "@/components/ui/card";
import { useLaudo } from "@/contexts/LaudoContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, Clock, DollarSign, Wrench, AlertCircle } from "lucide-react";

export function TabHome() {
  const { listaLaudos } = useLaudo();
  
  // Processamento de dados
  const processData = () => {
    const groups: Record<string, any> = {};
    const sortedLaudos = [...listaLaudos].sort((a, b) => a.dataLaudo.localeCompare(b.dataLaudo));

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

    return Object.values(groups).slice(-4); // Últimos 4 períodos
  };

  const chartData = processData();
  
  const totalGeralAnalisado = listaLaudos.reduce((acc, l) => 
    acc + l.analise.itensOrcamento.reduce((s, i) => s + i.valorTotal, 0), 0);
  
  const totalGeralAprovado = listaLaudos.reduce((acc, l) => 
    acc + l.analise.itensOrcamento.filter(i => i.status === "aprovado").reduce((s, i) => s + i.valorTotal, 0), 0);
    
  const totalGeralGlosa = listaLaudos.reduce((acc, l) => 
    acc + l.analise.itensOrcamento.filter(i => i.status === "reprovado").reduce((s, i) => s + i.valorTotal, 0), 0);

  const taxaAprovacao = totalGeralAnalisado > 0 ? (totalGeralAprovado / totalGeralAnalisado) * 100 : 0;

  const donutData = [
    { name: "Aprovado", value: totalGeralAprovado },
    { name: "Restante", value: totalGeralAnalisado - totalGeralAprovado },
  ];

  const formatCurrency = (val: number) => 
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-xl border border-border shadow-2xl bg-[#e0e6ed]">
      
      {/* Lado Esquerdo - Status (Navy) */}
      <div className="lg:col-span-3 bg-[#2d4a6d] p-8 text-white flex flex-col items-center">
        <div className="mb-8">
          <Truck className="h-20 w-20 text-[#4db6ac]" />
        </div>
        <h3 className="text-xl font-bold uppercase tracking-widest mb-6">Status Vistorias</h3>
        
        <div className="w-full space-y-4 mb-12">
          <div className="flex justify-between text-sm">
            <span className="opacity-80">Total Analisado</span>
            <span className="font-bold">{listaLaudos.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-80">Com Glosa</span>
            <span className="font-bold text-[#4db6ac]">{listaLaudos.filter(l => l.analise.itensOrcamento.some(i => i.status === 'reprovado')).length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-80">Pendentes</span>
            <span className="font-bold">00</span>
          </div>
        </div>

        <div className="relative w-full aspect-square flex items-center justify-center">
          <div className="absolute text-center">
            <span className="text-4xl font-bold text-[#4db6ac]">{taxaAprovacao.toFixed(0)}%</span>
            <p className="text-[10px] uppercase opacity-60">Taxa de Aprovação</p>
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

      {/* Lado Direito - Gráficos e KPIs */}
      <div className="lg:col-span-9 flex flex-col">
        
        {/* Topo - Análise de Carga (Light) */}
        <div className="p-8 flex-1">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-[#2d4a6d] font-bold uppercase tracking-tight text-lg">Análise de Valores</h3>
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
                  style={{ height: `${taxaAprovacao}%` }}
                />
                <div 
                  className="absolute bottom-0 w-full bg-[#4db6ac] opacity-80" 
                  style={{ height: `${(totalGeralGlosa / totalGeralAnalisado) * 100}%` }}
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

        {/* Rodapé - Indicadores Grandes (Navy) */}
        <div className="bg-[#2d4a6d] p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-white">
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Seção Custo */}
            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest opacity-80">Valores Financeiros</h4>
              <div className="flex items-center gap-4">
                <div className="h-12 w-1 bg-[#4db6ac]" />
                <div>
                  <p className="text-[10px] uppercase opacity-60">Média por Laudo</p>
                  <p className="text-3xl font-light tracking-tighter">
                    <span className="text-sm opacity-60 mr-1">R$</span>
                    {(totalGeralAnalisado / (listaLaudos.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

            {/* Seção Itens */}
            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest opacity-80">Volume de Itens</h4>
              <div className="flex items-center gap-4">
                <div className="h-12 w-1 bg-[#4db6ac]" />
                <div>
                  <p className="text-[10px] uppercase opacity-60">Média de Itens / Laudo</p>
                  <p className="text-3xl font-light tracking-tighter">
                    { (listaLaudos.reduce((acc, l) => acc + l.analise.itensOrcamento.length, 0) / (listaLaudos.length || 1)).toFixed(1) }
                    <span className="text-sm opacity-60 ml-1">itens</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-[2px] bg-[#4db6ac] opacity-40" />
                  <div>
                    <p className="text-[8px] uppercase opacity-60">Total Peças</p>
                    <p className="text-lg font-medium">{listaLaudos.reduce((acc, l) => acc + l.analise.itensOrcamento.reduce((s, i) => s + i.qtdPeca, 0), 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-[2px] bg-[#4db6ac] opacity-40" />
                  <div>
                    <p className="text-[8px] uppercase opacity-60">Total M.O.</p>
                    <p className="text-lg font-medium">{listaLaudos.reduce((acc, l) => acc + l.analise.itensOrcamento.reduce((s, i) => s + i.qtdMaoObra, 0), 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Lateral Direita */}
          <div className="lg:col-span-3 border-l border-white/10 pl-8 flex flex-col justify-center">
            <h4 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-4 text-center">Resumo Geral</h4>
            <div className="flex flex-col items-center mb-6">
              <Truck className="h-10 w-10 text-[#4db6ac] mb-2" />
              <p className="text-xs uppercase opacity-60">Total Vistorias</p>
              <p className="text-4xl font-bold">{listaLaudos.length.toString().padStart(2, '0')}</p>
            </div>
            <div className="space-y-3 text-[10px] uppercase font-bold">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#4db6ac]" /> Aprovadas</span>
                <span>{listaLaudos.filter(l => l.analise.itensOrcamento.every(i => i.status === 'aprovado')).length.toString().padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2"><Wrench className="h-3 w-3 text-orange-400" /> Em Análise</span>
                <span>00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2"><AlertCircle className="h-3 w-3 text-red-400" /> Com Glosa</span>
                <span>{listaLaudos.filter(l => l.analise.itensOrcamento.some(i => i.status === 'reprovado')).length.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}