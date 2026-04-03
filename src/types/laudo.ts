export interface DadosCliente {
  solicitante: string;
  empresa: string;
  clienteFinal: string;
}

export interface DadosVeiculo {
  marcaModelo: string;
  anoFabricacao: string;
  anoModelo: string;
  placa: string;
  chassi: string;
  hodometro: string;
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

export interface ItemOrcamento {
  id: string;
  codigo: string;
  descricao: string;
  qtdPeca: number;
  valorPeca: number;
  qtdMaoObra: number;
  valorMaoObra: number;
  valorTotal: number;
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'reprovado';
}

export interface DadosAnalise {
  itensOrcamento: ItemOrcamento[];
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

export interface LaudoPericial {
  id: string;
  status: 'pendente' | 'finalizado';
  dadosCliente: DadosCliente;
  dadosVeiculo: DadosVeiculo;
  dadosOficina: DadosOficina;
  dadosProcesso: DadosProcesso;
  fotos: FotoVistoria[];
  analise: DadosAnalise;
  conclusao: DadosConclusao;
  dataLaudo: string;
  ordemServico: string;
}