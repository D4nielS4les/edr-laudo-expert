import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { LaudoPericial } from "@/types/laudo";

const createEmptyLaudo = (): LaudoPericial => ({
  id: crypto.randomUUID(),
  status: 'pendente',
  dadosCliente: { solicitante: "", empresa: "", clienteFinal: "" },
  dadosVeiculo: { marcaModelo: "", anoFabricacao: "", anoModelo: "", placa: "", chassi: "", hodometro: "" },
  dadosOficina: { nome: "", endereco: "", bairro: "", cidade: "", telefone: "", responsavel: "", cnpj: "" },
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
  const [laudo, setLaudo] = useState<LaudoPericial>(createEmptyLaudo());
  const [listaLaudos, setListaLaudos] = useState<LaudoPericial[]>([]);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const saved = localStorage.getItem("edr_laudos_lista");
    if (saved) {
      try {
        setListaLaudos(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar laudos salvos", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("edr_laudos_lista", JSON.stringify(listaLaudos));
  }, [listaLaudos]);

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