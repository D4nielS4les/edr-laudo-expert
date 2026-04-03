import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardCheck, Camera, BarChart3, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { useLaudo } from "@/contexts/LaudoContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TabHome() {
  const { laudo, listaLaudos } = useLaudo();
  
  // Estatísticas do laudo atual (mantendo o que já existia)
  const totalItens = laudo.analise.itensOrcamento.length;
  const aprovados = laudo.analise.itensOrcamento.filter(i => i.status === "aprovado").length;
  const totalFotos = laudo.fotos.length;

  // Processamento de dados para os gráficos de performance
  const processData = () => {
    const groups: Record<string, any> = {};
    
    // Ordenar por data
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

  const stats = [
    { label: "Total Analisado", value: totalGeralAnalisado, icon: DollarSign, color: "bg-info/10 text-info" },
    { label: "Total Aprovado", value: totalGeralAprovado, icon: ClipboardCheck, color: "bg-success/10 text-success" },
    { label: "Total Glosado", value: totalGeralGlosa, icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
    { label: "Vistorias Realizadas", value: listaLaudos.length, icon: TrendingUp, color: "bg-accent/10 text-accent" },
  ];

  const formatCurrency = (val: number) => 
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Dashboard de Performance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visão consolidada de indicadores e evolução das vistorias.
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
                <p className="text-lg font-bold text-foreground">
                  {typeof s.value === 'number' && s.label.includes('Total') ? formatCurrency(s.value) : s.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução de Valores (Aprovado vs Glosa)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAprovado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGlosa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="aprovado" name="Aprovado" stroke="#10b981" fillOpacity={1} fill="url(#colorAprovado)" />
                <Area type="monotone" dataKey="glosa" name="Glosa" stroke="#ef4444" fillOpacity={1} fill="url(#colorGlosa)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volume de Vistorias por Período</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="qtd" name="Qtd. Vistorias" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo de Atividades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Performance Operacional</p>
              <p>O sistema processou {listaLaudos.length} vistorias até o momento, com uma taxa de glosa consolidada de {totalGeralAnalisado > 0 ? ((totalGeralGlosa / totalGeralAnalisado) * 100).toFixed(1) : 0}% sobre o valor total analisado.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}