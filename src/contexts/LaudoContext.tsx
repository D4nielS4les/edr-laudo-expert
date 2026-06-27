import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { LaudoPericial } from "@/types/laudo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const createEmptyLaudo = (): LaudoPericial => ({
  id: crypto.randomUUID(),
  status: 'pendente',
  dadosCliente: { solicitante: "", empresa: "", clienteFinal: "", cpfCnpj: "", agendamento: "", endereco: "", bairro: "", cidade: "", cep: "", telefone: "", email: "" },
  dadosVeiculo: { marcaModelo: "", anoFabricacao: "", anoModelo: "", placa: "", chassi: "", hodometro: "", motorizacao: "", cor: "", combustivel: "" },
  dadosOficina: { nome: "", endereco: "", bairro: "", cidade: "", telefone: "", responsavel: "", cnpj: "" },
  dadosOS: { statusOS: "", tipoManutencao: "", dataEmissao: "", dataPrevInicio: "", dataPrevConclusao: "", dataConclusao: "" },
  dadosProcesso: { analista: "", vistoriador: "", respTecnico: "", cargoRespTecnico: "Gestor de Operações EDR" },
  fotos: [],
  analise: { itensOrcamento: [], causaRaiz: "", historicoManutencao: "", relatoMotorista: "" },
  conclusao: { parecerTecnico: "", recomendacoes: "", analistaVistoriador: "", gestorOperacoes: "" },
  dataLaudo: new Date().toISOString().split("T")[0],
  ordemServico: "",
});

interface LaudoContextType {
  laudo: LaudoPericial;
  listaLaudos: LaudoPericial[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  updateLaudo: (updates: Partial<LaudoPericial>) => void;
  updateCliente: (updates: Partial<LaudoPericial["dadosCliente"]>) => void;
  updateVeiculo: (updates: Partial<LaudoPericial["dadosVeiculo"]>) => void;
  updateOficina: (updates: Partial<LaudoPericial["dadosOficina"]>) => void;
  updateProcesso: (updates: Partial<LaudoPericial["dadosProcesso"]>) => void;
  updateAnalise: (updates: Partial<LaudoPericial["analise"]>) => void;
  updateConclusao: (updates: Partial<LaudoPericial["conclusao"]>) => void;
  salvarLaudoAtual: () => void;
  finalizarLaudoAtual: () => void;
  finalizarLaudo: (id: string) => void;
  carregarLaudo: (id: string) => void;
  excluirLaudo: (id: string) => void;
  novoLaudo: () => void;
}

const LaudoContext = createContext<LaudoContextType | undefined>(undefined);

export function LaudoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [laudo, setLaudo] = useState<LaudoPericial>(createEmptyLaudo());
  const [listaLaudos, setListaLaudos] = useState<LaudoPericial[]>([]);
  const [activeTab, setActiveTab] = useState("home");

  // Carrega laudos do usuário do Supabase
  useEffect(() => {
    if (!user) { setListaLaudos([]); return; }
    (async () => {
      const { data, error } = await supabase
        .from("laudos")
        .select("payload, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) { console.error("Erro carregando laudos:", error); return; }
      const lista = (data ?? []).map((r: any) => r.payload as LaudoPericial).filter(Boolean);
      setListaLaudos(lista);
    })();
  }, [user]);

  // Mapeia laudo -> colunas estruturadas + payload jsonb
  const toRow = (l: LaudoPericial) => ({
    id: l.id,
    user_id: user!.id,
    status: l.status,
    data_laudo: l.dataLaudo,
    ordem_servico: l.ordemServico,
    cliente_solicitante: l.dadosCliente.solicitante,
    cliente_empresa: l.dadosCliente.empresa,
    cliente_final: l.dadosCliente.clienteFinal,
    cliente_cpf_cnpj: l.dadosCliente.cpfCnpj,
    cliente_telefone: l.dadosCliente.telefone,
    cliente_email: l.dadosCliente.email,
    veiculo_marca_modelo: l.dadosVeiculo.marcaModelo,
    veiculo_placa: l.dadosVeiculo.placa,
    veiculo_chassi: l.dadosVeiculo.chassi,
    oficina_nome: l.dadosOficina.nome,
    oficina_cnpj: l.dadosOficina.cnpj,
    payload: { ...l, fotos: [] }, // fotos com File não serializam — descartadas aqui
  });

  const persistLaudo = async (l: LaudoPericial) => {
    if (!user) return;
    const row = toRow(l);
    const { error } = await supabase.from("laudos").upsert(row, { onConflict: "id" });
    if (error) console.error("Erro salvando laudo:", error);
  };

  const updateLaudo = (updates: Partial<LaudoPericial>) =>
    setLaudo((prev) => ({ ...prev, ...updates }));

  const updateCliente = (updates: Partial<LaudoPericial["dadosCliente"]>) =>
    setLaudo((prev) => ({ ...prev, dadosCliente: { ...prev.dadosCliente, ...updates } }));

  const updateVeiculo = (updates: Partial<LaudoPericial["dadosVeiculo"]>) =>
    setLaudo((prev) => ({ ...prev, dadosVeiculo: { ...prev.dadosVeiculo, ...updates } }));

  const updateOficina = (updates: Partial<LaudoPericial["dadosOficina"]>) =>
    setLaudo((prev) => ({ ...prev, dadosOficina: { ...prev.dadosOficina, ...updates } }));

  const updateProcesso = (updates: Partial<LaudoPericial["dadosProcesso"]>) =>
    setLaudo((prev) => ({ ...prev, dadosProcesso: { ...prev.dadosProcesso, ...updates } }));

  const updateAnalise = (updates: Partial<LaudoPericial["analise"]>) =>
    setLaudo((prev) => ({ ...prev, analise: { ...prev.analise, ...updates } }));

  const updateConclusao = (updates: Partial<LaudoPericial["conclusao"]>) =>
    setLaudo((prev) => ({ ...prev, conclusao: { ...prev.conclusao, ...updates } }));

  const salvarLaudoAtual = () => {
    persistLaudo(laudo);
    setListaLaudos((prev) => {
      const index = prev.findIndex((l) => l.id === laudo.id);
      if (index >= 0) {
        const novaLista = [...prev];
        novaLista[index] = laudo;
        return novaLista;
      }
      return [laudo, ...prev];
    });
  };

  const finalizarLaudoAtual = () => {
    const laudoFinalizado: LaudoPericial = { ...laudo, status: 'finalizado' };
    setLaudo(laudoFinalizado);
    persistLaudo(laudoFinalizado);
    setListaLaudos((prev) => {
      const index = prev.findIndex((l) => l.id === laudo.id);
      if (index >= 0) {
        const novaLista = [...prev];
        novaLista[index] = laudoFinalizado;
        return novaLista;
      }
      return [laudoFinalizado, ...prev];
    });
    setActiveTab("finalizadas");
  };

  const finalizarLaudo = (id: string) => {
    setListaLaudos((prev) => prev.map(l => l.id === id ? { ...l, status: 'finalizado' } : l));
    if (laudo.id === id) {
      setLaudo(prev => ({ ...prev, status: 'finalizado' }));
    }
    const alvo = listaLaudos.find(l => l.id === id);
    if (alvo) persistLaudo({ ...alvo, status: 'finalizado' });
  };

  const carregarLaudo = (id: string) => {
    const encontrado = listaLaudos.find((l) => l.id === id);
    if (encontrado) {
      setLaudo(encontrado);
      setActiveTab("cliente");
    }
  };

  const excluirLaudo = (id: string) => {
    setListaLaudos((prev) => prev.filter((l) => l.id !== id));
    if (laudo.id === id) {
      setLaudo(createEmptyLaudo());
    }
    supabase.from("laudos").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("Erro excluindo laudo:", error);
    });
  };

  const novoLaudo = () => {
    setLaudo(createEmptyLaudo());
    setActiveTab("cliente");
  };

  return (
    <LaudoContext.Provider value={{ 
      laudo, listaLaudos, activeTab, setActiveTab,
      updateLaudo, updateCliente, updateVeiculo, updateOficina, updateProcesso, updateAnalise, updateConclusao,
      salvarLaudoAtual, finalizarLaudoAtual, finalizarLaudo, carregarLaudo, excluirLaudo, novoLaudo
    }}>
      {children}
    </LaudoContext.Provider>
  );
}

export function useLaudo() {
  const ctx = useContext(LaudoContext);
  if (!ctx) throw new Error("useLaudo must be used within LaudoProvider");
  return ctx;
}