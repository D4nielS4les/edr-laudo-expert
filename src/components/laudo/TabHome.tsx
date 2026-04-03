import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, TrendingUp, DollarSign, AlertTriangle, PieChart as PieIcon, BarChart3 } from "lucide-react";
import { useLaudo } from "@/contexts/LaudoContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TabHome() {
  const { listaLaudos } = useLaudo();
  
  // Processamento de dados para os gráficos
  const processData = () => {
    const groups: Record<string, any> = {};
    const sortedLaudos = [...listaLaudos].sort((a, b) => a.dataLaudo.localeCompare(b.dataLaudo));

    sortedLaudos.forEach(l => {
      const date = l.dataLaudo || new Date().toISOString().split('T')[0];
      const month = format(parseISO(date), "MMM/yy", { locale: ptBR });
      
      if (!groups[month]) {
        groups[month] = { month, total: 0, aprovado: 0, glosa: 0, qtd: 0 };
      }
      
      const vlrTotal = l.analise.itensOrcamento.reduce((s, i) => s + i.valorTotal, 0);
      const vlrAprovado = l.analise.itensOrcamento
        .filter(i => i.status === "aprovado")
        .reduce((s, i) => s + i.valorTotal, 0);
      const vlrGlosa = l.analise.itensOrcamento
        .filter(i => i.status === "reprovado")
        .reduce((s, i) => s + i.valorTotal, 0);
        
      groups[month].total += vlrTotal;
      groups[month].aprovado += vlrAprovado;
      groups[month].glosa += vlrGlosa;
      groups[month].qtd += 1;
    });

    return Object.values(groups);
  };

  const chartData = processData();
  
  const totalGeralAnalisado = listaLaudos.reduce((acc, l) => 
    acc + l.analise.itensOrcamento.reduce((s, i) => s + i.valorTotal, 0), 0);
  
  const totalGeralAprovado = listaLaudos.reduce((acc, l) => 
    acc + l.analise.itensOrcamento.filter(i => i.status === "aprovado").reduce((s, i) => s + i.valorTotal, 0), 0);
    
  const totalGeralGlosa = listaLaudos.reduce((acc, l) => 
    acc + l.analise.itensOrcamento.filter(i => i.status === "reprovado").reduce((s, i) => s + i.valorTotal, 0), 0);

  const taxaGlosa = totalGeralAnalisado > 0 ? (totalGeralGlosa / totalGeralAnalisado) * 100 : 0;

  const distributionData = [
    { name: "Aprovado", value: totalGeralAprovado, color: "#10b981" },
    { name: "Glosa", value: totalGeralGlosa, color: "#ef4444" },
  ];

  const stats = [
    { label: "Total Analisado", value: totalGeralAnalisado, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Aprovado", value: totalGeralAprovado, icon: ClipboardCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Glosado", value: totalGeralGlosa, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Taxa de Glosa", value: `${taxaGlosa.toFixed(1)}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const formatCurrency = (val: number) => 
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Dashboard de Performance</h2>
          <p className="text-sm text-muted-foreground">Indicadores estratégicos de vistorias e economia gerada.</p>
        </div>
        <div className="bg-muted/50 px-4 py-2 rounded-full text-xs font-medium text-muted-foreground border border-border">
          Total de {listaLaudos.length} vistorias processadas
        </div>
      </div>

      {/* Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">KPI</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold tracking-tight ${s.color}`}>
                {typeof s.value === 'number' ? formatCurrency(s.value) : s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Distribuição (Donut) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-muted-foreground" /> Distribuição de Valores
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-2">
              <p className="text-xs text-muted-foreground">Economia Gerada (Glosa)</p>
              <p className="text-lg font-bold text-rose-600">{formatCurrency(totalGeralGlosa)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Evolução Mensal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" /> Evolução Financeira Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAprovado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="aprovado" name="Aprovado" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAprovado)" />
                <Area type="monotone" dataKey="glosa" name="Glosa" stroke="#ef4444" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Volume de Vistorias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume de Vistorias por Período</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="qtd" name="Qtd. Vistorias" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}