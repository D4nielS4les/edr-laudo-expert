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

  const BUCKET = "laudo-fotos";

  // Gera signed URLs para fotos persistidas (bucket privado)
  const hidratarFotos = async (l: LaudoPericial): Promise<LaudoPericial> => {
    const fotos = await Promise.all(
      (l.fotos ?? []).map(async (f) => {
        if (f.path && !f.file) {
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(f.path, 60 * 60 * 24 * 7);
          return { ...f, preview: data?.signedUrl ?? f.preview ?? "" };
        }
        return f;
      })
    );
    return { ...l, fotos };
  };

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
      const brutos = (data ?? []).map((r: any) => r.payload as LaudoPericial).filter(Boolean);
      const lista = await Promise.all(brutos.map(hidratarFotos));
      setListaLaudos(lista);
    })();
  }, [user]);

  // Upload de fotos novas (com File) para o Storage; devolve fotos serializáveis
  const uploadFotosNovas = async (l: LaudoPericial): Promise<LaudoPericial> => {
    if (!user) return l;
    const fotos = await Promise.all(
      (l.fotos ?? []).map(async (f) => {
        if (!f.file) return f;
        const ext = (f.file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${l.id}/${f.id}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, f.file, { upsert: true, contentType: f.file.type });
        if (error) { console.error("Erro upload foto:", error); return f; }
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
        return { id: f.id, categoria: f.categoria, descricao: f.descricao, path, preview: data?.signedUrl ?? f.preview };
      })
    );
    return { ...l, fotos };
  };

  // Mapeia laudo -> colunas estruturadas + payload jsonb (sem File)
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
    payload: {
      ...l,
      // remove File e preview (signed URL é regenerada na carga); mantém path
      fotos: (l.fotos ?? []).map(({ file, preview, ...rest }) => rest),
    },
  });

  const persistLaudo = async (l: LaudoPericial): Promise<LaudoPericial> => {
    if (!user) return l;
    const comUploads = await uploadFotosNovas(l);
    const { error } = await supabase.from("laudos").upsert(toRow(comUploads), { onConflict: "id" });
    if (error) console.error("Erro salvando laudo:", error);
    return comUploads;
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

  const salvarLaudoAtual = async () => {
    const salvo = await persistLaudo(laudo);
    setLaudo(salvo);
    setListaLaudos((prev) => {
      const index = prev.findIndex((l) => l.id === salvo.id);
      if (index >= 0) { const nova = [...prev]; nova[index] = salvo; return nova; }
      return [salvo, ...prev];
    });
  };

  const finalizarLaudoAtual = async () => {
    const salvo = await persistLaudo({ ...laudo, status: 'finalizado' });
    setLaudo(salvo);
    setListaLaudos((prev) => {
      const index = prev.findIndex((l) => l.id === salvo.id);
      if (index >= 0) { const nova = [...prev]; nova[index] = salvo; return nova; }
      return [salvo, ...prev];
    });
    setActiveTab("finalizadas");
  };

  const finalizarLaudo = async (id: string) => {
    const alvo = listaLaudos.find(l => l.id === id);
    if (!alvo) return;
    const salvo = await persistLaudo({ ...alvo, status: 'finalizado' });
    setListaLaudos((prev) => prev.map(l => l.id === id ? salvo : l));
    if (laudo.id === id) setLaudo(salvo);
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