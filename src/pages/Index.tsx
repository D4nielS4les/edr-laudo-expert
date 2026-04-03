import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Home, Users, Wrench, Camera, BarChart3, FileCheck, FileDown } from "lucide-react";
import { LaudoProvider } from "@/contexts/LaudoContext";
import { PageHeader } from "@/components/laudo/PageHeader";
import { TabHome } from "@/components/laudo/TabHome";
import { TabClienteVeiculo } from "@/components/laudo/TabClienteVeiculo";
import { TabOficina } from "@/components/laudo/TabOficina";
import { TabFotos } from "@/components/laudo/TabFotos";
import { TabAnalise } from "@/components/laudo/TabAnalise";
import { TabConclusao } from "@/components/laudo/TabConclusao";
import { useToast } from "@/hooks/use-toast";
import { useLaudo } from "@/contexts/LaudoContext";
import { generateLaudoPDF } from "@/utils/generateLaudoPDF";

const tabs = [
  { value: "home", label: "Início", icon: Home },
  { value: "cliente", label: "Cliente / Veículo", icon: Users },
  { value: "oficina", label: "Oficina", icon: Wrench },
  { value: "fotos", label: "Vistoria e Fotos", icon: Camera },
  { value: "analise", label: "Análise", icon: BarChart3 },
  { value: "conclusao", label: "Conclusão", icon: FileCheck },
];

function LaudoApp() {
  const [activeTab, setActiveTab] = useState("home");
  const { toast } = useToast();

  const handleExportPDF = () => {
    toast({
      title: "Gerando PDF...",
      description: "O laudo está sendo compilado para exportação.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader />

      <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList className="bg-muted h-auto flex-wrap gap-1 p-1">
              {tabs.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <t.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <Button onClick={handleExportPDF} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              <FileDown className="h-4 w-4" /> Gerar Laudo PDF
            </Button>
          </div>

          <TabsContent value="home"><TabHome /></TabsContent>
          <TabsContent value="cliente"><TabClienteVeiculo /></TabsContent>
          <TabsContent value="oficina"><TabOficina /></TabsContent>
          <TabsContent value="fotos"><TabFotos /></TabsContent>
          <TabsContent value="analise"><TabAnalise /></TabsContent>
          <TabsContent value="conclusao"><TabConclusao /></TabsContent>
        </Tabs>
      </div>

      <footer className="gradient-hero text-primary-foreground/60 text-xs text-center py-3">
        EDR Inspeções e Regulações de Sinistros © {new Date().getFullYear()} — Sistema de Gestão de Laudos Periciais
      </footer>
    </div>
  );
}

export default function Index() {
  return (
    <LaudoProvider>
      <LaudoApp />
    </LaudoProvider>
  );
}
