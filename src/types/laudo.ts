export interface DadosCliente {
  solicitante: string;
  empresa: string;
  clienteFinal: string;
  cpfCnpj: string;
  agendamento: string;
  endereco: string;
  bairro: string;
  cidade: string;
  cep: string;
  telefone: string;
  email: string;
}

export interface DadosVeiculo {
  marcaModelo: string;
  anoFabricacao: string;
  anoModelo: string;
  placa: string;
  chassi: string;
  hodometro: string;
  motorizacao: string;
  cor: string;
  combustivel: string;
}

export interface DadosOficina {
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  telefone: string;
  responsavel: string;
  cnpj: string;
}

export interface FotoVistoria {
  id: string;
  file: File;
  preview: string;
  categoria: 'geral' | 'placa_chassi' | 'hodometro' | 'defeito';
  descricao: string;
}

export interface FotoItem {
  id: string;
  dataUrl: string;
  descricao?: string;
}

export interface ItemOrcamento {
  id: string;
  codigo: string;
  grupo: string;
  descricao: string;
  acao: string;
  statusItem: string;
  qtdPeca: number;
  valorPeca: number;
  qtdMaoObra: number;
  valorMaoObra: number;
  valorTotal: number;
  impostos: { ipi: number; icms: number };
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'reprovado';
  fotos?: FotoItem[];
}

export interface GrupoAnalise {
  id: string;
  nome: string;
  itemIds: string[];
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'reprovado';
  fotos?: FotoItem[];
}

export interface DadosAnalise {
  itensOrcamento: ItemOrcamento[];
  gruposAnalise?: GrupoAnalise[];
  ordemItens?: string[]; // ordem dos blocos: pode conter ids de itens (avulsos) e ids de grupos prefixados com "grupo:"
  causaRaiz: string;
  historicoManutencao: string;
  relatoMotorista: string;
}

export interface DadosConclusao {
  parecerTecnico: string;
  recomendacoes: string;
  analistaVistoriador: string;
  gestorOperacoes: string;
}

export interface DadosProcesso {
  analista: string;
  vistoriador: string;
  respTecnico: string;
  cargoRespTecnico: string;
}

export interface DadosOS {
  statusOS: string;
  tipoManutencao: string;
  dataEmissao: string;
  dataPrevInicio: string;
  dataPrevConclusao: string;
  dataConclusao: string;
}

export interface LaudoPericial {
  id: string;
  status: 'pendente' | 'finalizado';
  dadosCliente: DadosCliente;
  dadosVeiculo: DadosVeiculo;
  dadosOficina: DadosOficina;
  dadosProcesso: DadosProcesso;
  dadosOS: DadosOS;
  fotos: FotoVistoria[];
  analise: DadosAnalise;
  conclusao: DadosConclusao;
  dataLaudo: string;
  ordemServico: string;
}
