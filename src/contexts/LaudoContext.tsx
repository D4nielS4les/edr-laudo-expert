import React, { createContext, useContext, useState, ReactNode } from "react";
import type { LaudoPericial } from "@/types/laudo";

const defaultLaudo: LaudoPericial = {
  dadosCliente: { solicitante: "", empresa: "", clienteFinal: "" },
  dadosVeiculo: { marcaModelo: "", anoFabricacao: "", anoModelo: "", placa: "", chassi: "", hodometro: "" },
  dadosOficina: { nome: "", endereco: "", bairro: "", cidade: "", telefone: "", responsavel: "", cnpj: "" },
  dadosProcesso: { analista: "", vistoriador: "", respTecnico: "", cargoRespTecnico: "Gestor de Operações EDR" },
  fotos: [],
  analise: { itensOrcamento: [], causaRaiz: "", historicoManutencao: "", relatoMotorista: "" },
  conclusao: { parecerTecnico: "", recomendacoes: "", analistaVistoriador: "", gestorOperacoes: "" },
  dataLaudo: new Date().toISOString().split("T")[0],
  ordemServico: "",
};

interface LaudoContextType {
  laudo: LaudoPericial;
  updateLaudo: (updates: Partial<LaudoPericial>) => void;
  updateCliente: (updates: Partial<LaudoPericial["dadosCliente"]>) => void;
  updateVeiculo: (updates: Partial<LaudoPericial["dadosVeiculo"]>) => void;
  updateOficina: (updates: Partial<LaudoPericial["dadosOficina"]>) => void;
  updateProcesso: (updates: Partial<LaudoPericial["dadosProcesso"]>) => void;
  updateAnalise: (updates: Partial<LaudoPericial["analise"]>) => void;
  updateConclusao: (updates: Partial<LaudoPericial["conclusao"]>) => void;
}

const LaudoContext = createContext<LaudoContextType | undefined>(undefined);

export function LaudoProvider({ children }: { children: ReactNode }) {
  const [laudo, setLaudo] = useState<LaudoPericial>(defaultLaudo);

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

  return (
    <LaudoContext.Provider value={{ laudo, updateLaudo, updateCliente, updateVeiculo, updateOficina, updateProcesso, updateAnalise, updateConclusao }}>
      {children}
    </LaudoContext.Provider>
  );
}

export function useLaudo() {
  const ctx = useContext(LaudoContext);
  if (!ctx) throw new Error("useLaudo must be used within LaudoProvider");
  return ctx;
}
