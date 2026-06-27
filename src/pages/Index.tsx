import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Home, Users, Wrench, Camera, BarChart3, FileCheck, FileDown, List, Save, CheckCircle2, Clock, ClipboardList, FileUp } from "lucide-react";
import { LaudoProvider } from "@/contexts/LaudoContext";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/laudo/PageHeader";
import { TabHome } from "@/components/laudo/TabHome";
import { TabClienteVeiculo } from "@/components/laudo/TabClienteVeiculo";
import { TabOficina } from "@/components/laudo/TabOficina";
import { TabFotos } from "@/components/laudo/TabFotos";
import { TabAnalise } from "@/components/laudo/TabAnalise";
import { TabConclusao } from "@/components/laudo/TabConclusao";
import { TabListagem } from "@/components/laudo/TabListagem";
import { useToast } from "@/hooks/use-toast";
import { useLaudo } from "@/contexts/LaudoContext";
import { generateLaudoPDF } from "@/utils/generateLaudoPDF";
import { useRef } from "react";
import { extractTextFromPDF, parseOSData } from "@/utils/pdfParser";

const mainTabs = [
  { value: "home", label: "Início", icon: Home },
  { value: "pendentes", label: "Pendentes", icon: Clock },
  { value: "finalizadas", label: "Finalizadas", icon: CheckCircle2 },
];
const vistoriaTabs = [
  { value: "cliente", label: "Cliente / Veículo", icon: Users },
  { value: "oficina", label: "Oficina", icon: Wrench },
  { value: "fotos", label: "Vistoria e Fotos", icon: Camera },
  { value: "analise", label: "Análise", icon: BarChart3 },
  { value: "conclusao", label: "Conclusão", icon: FileCheck },
];

function LaudoApp() {
  const { toast } = useToast();
  const { laudo, activeTab, setActiveTab, salvarLaudoAtual, novoLaudo, updateLaudo } = useLaudo();
  const inVistoria = vistoriaTabs.some(t => t.value === activeTab);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast({ title: "Processando PDF...", description: "Extraindo informações do orçamento." });
    try {
      const text = await extractTextFromPDF(file);
      const data = parseOSData(text);
      updateLaudo({
        ordemServico: data.ordemServico || laudo.ordemServico,
        dadosCliente: { ...laudo.dadosCliente, ...(data.dadosCliente || {}) },
        dadosVeiculo: { ...laudo.dadosVeiculo, ...(data.dadosVeiculo || {}) },
        dadosOS: { ...laudo.dadosOS, ...(data.dadosOS || {}) },
        dadosOficina: { ...laudo.dadosOficina, ...(data.dadosOficina || {}) },
        analise: {
          ...laudo.analise,
          itensOrcamento: data.itens || [],
          historicoManutencao: data.relatos?.relatoOficina || laudo.analise.historicoManutencao,
          relatoMotorista: data.relatos?.relatoMotorista || laudo.analise.relatoMotorista,
        },
      });
      toast({ title: "Importação Concluída!", description: `OS ${data.ordemServico || ''} carregada com ${data.itens.length} itens.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro na Importação", description: "Não foi possível ler os dados deste PDF.", variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportPDF = async () => {
    toast({ title: "Gerando PDF...", description: "O laudo está sendo compilado para exportação." });
    try {
      await generateLaudoPDF(laudo);
      toast({ title: "PDF gerado com sucesso!", description: "O download foi iniciado automaticamente." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar PDF", description: "Verifique os dados e tente novamente.", variant: "destructive" });
    }
  };

  const handleSave = () => {
    salvarLaudoAtual();
    toast({ title: "Laudo Salvo!", description: "As informações foram armazenadas com sucesso." });
    setActiveTab("home");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>EDR Inspeções — Sistema de Gestão de Laudos Periciais</title>
        <meta name="description" content="Sistema da EDR Inspeções para gestão de laudos periciais, vistorias veiculares e regulações de sinistros, com importação de orçamentos em PDF." />
        <link rel="canonical" href="https://edr-laudo-mate.lovable.app/" />
        <meta property="og:title" content="EDR Inspeções — Sistema de Gestão de Laudos Periciais" />
        <meta property="og:url" content="https://edr-laudo-mate.lovable.app/" />
      </Helmet>
      <PageHeader />

      <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <TabsList className="bg-muted h-auto flex-wrap gap-1 p-1">
              {mainTabs.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <t.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {!inVistoria && activeTab === "home" && (
              <Button onClick={novoLaudo} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <ClipboardList className="h-4 w-4" /> Nova Vistoria
              </Button>
            )}
          </div>

          {inVistoria && (
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-t pt-4">
              <TabsList className="bg-muted h-auto flex-wrap gap-1 p-1">
                {vistoriaTabs.map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <t.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleImportPDF} />
                <Button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <FileUp className="h-4 w-4" /> Importar PDF
                </Button>
                <Button onClick={handleSave} variant="outline" className="flex-1 sm:flex-none gap-2 border-accent text-accent hover:bg-accent/5">
                  <Save className="h-4 w-4" /> Salvar
                </Button>
                <Button onClick={handleExportPDF} className="flex-1 sm:flex-none gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <FileDown className="h-4 w-4" /> Gerar Laudo
                </Button>
              </div>
            </div>
          )}

          <TabsContent value="home"><TabHome /></TabsContent>
          <TabsContent value="pendentes"><TabListagem statusFilter="pendente" /></TabsContent>
          <TabsContent value="finalizadas"><TabListagem statusFilter="finalizado" /></TabsContent>
          <TabsContent value="cliente"><TabClienteVeiculo /></TabsContent>
          <TabsContent value="oficina"><TabOficina /></TabsContent>
          <TabsContent value="fotos"><TabFotos /></TabsContent>
          <TabsContent value="analise"><TabAnalise /></TabsContent>
          <TabsContent value="conclusao"><TabConclusao /></TabsContent>
        </Tabs>
      </div>

      <footer className="gradient-hero text-primary-foreground/60 text-xs text-center py-3">
        <div>EDR Inspeções e Regulações de Sinistros © {new Date().getFullYear()} — Sistema de Gestão de Laudos Periciais</div>
        <div className="mt-1 flex justify-center gap-4">
          <a href="/privacidade" className="hover:text-primary-foreground underline">Política de Privacidade</a>
          <a href="/termos" className="hover:text-primary-foreground underline">Termos de Uso</a>
          <a href="/confianca" className="hover:text-primary-foreground underline">Central de Confiança</a>
        </div>
      </footer>
    </div>
  );
}

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <LaudoProvider>
      <LaudoApp />
    </LaudoProvider>
  );
}