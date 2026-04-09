/**
 * Extração universal de campos por varredura de palavras-chave.
 * Funciona com qualquer layout de PDF de orçamento automotivo.
 */
import { extractFirst, scanForKeyword } from './helpers';

// --------------- OS ---------------
export function extractOrdemServico(text: string): string {
  const specific = extractFirst([
    /(?:Ordem de Serviço|O\.?S\.?|Nº\s*OS|N[°º]\s*OS|Numero\s*OS|Nr\.?\s*OS)[:\s]+(\d+)/i,
    /(?:OS)[:\s#]+(\d{4,})/i,
    /\bOS\s*[:# ]+(\d{4,})\b/i,
    /\bO\.S\.?\s*[:# ]+(\d+)/i,
    /(?:Orçamento|Orcamento)\s*(?:N[°º]?\s*)?[:\s#]+(\d+)/i,
  ], text);
  if (specific) return specific;
  return scanForKeyword(text, ['Ordem de Serviço', 'O.S.', 'OS', 'Nr OS', 'Nº OS', 'Numero OS', 'Orçamento', 'Orcamento']);
}

// --------------- DADOS OS ---------------
export function extractDadosOS(text: string) {
  const statusOS = scanForKeyword(text, ['Status', 'Situação', 'Situacao', 'Status OS', 'Status do Orçamento']);
  const tipoManutencao = scanForKeyword(text, [
    'Tipo de Manutenção', 'Tipo Manutenção', 'Tipo Manutencao', 'Tipo de Serviço',
    'Tipo Servico', 'Tipo Serviço', 'Manutenção', 'Manutencao',
  ]);
  const dataEmissao = extractData(text, ['Data Emissão', 'Data Emissao', 'Data de Emissão', 'Emissão', 'Emitido em', 'Data']);
  const dataPrevInicio = extractData(text, ['Previsão Início', 'Prev. Início', 'Data Prev. Início', 'Previsao Inicio']);
  const dataPrevConclusao = extractData(text, ['Previsão Conclusão', 'Prev. Conclusão', 'Data Prev. Conclusão', 'Previsao Conclusao']);
  const dataConclusao = extractData(text, ['Data Conclusão', 'Conclusão Serviço', 'Concluído em', 'Data Conclusao']);

  return { statusOS, tipoManutencao, dataEmissao, dataPrevInicio, dataPrevConclusao, dataConclusao };
}

function extractData(text: string, keywords: string[]): string {
  const raw = scanForKeyword(text, keywords);
  if (!raw) return '';
  // Tenta normalizar dd/mm/yyyy para yyyy-mm-dd
  const m = raw.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = raw.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return raw;
}

// --------------- CLIENTE ---------------
export function extractCliente(text: string) {
  const solicitante = scanForKeyword(text, [
    'Solicitante', 'Usuário', 'Usuario', 'Solicitado por', 'Solicitado Por',
    'Requisitante', 'Contratante', 'Contato',
  ]);
  const empresa = scanForKeyword(text, [
    'Empresa', 'Razão Social', 'Razao Social', 'Companhia',
    'Seguradora', 'Cia Seguradora', 'Cia. Seguradora',
  ]);
  const clienteFinal = scanForKeyword(text, [
    'Cliente Final', 'Cliente', 'Segurado', 'Proprietário', 'Proprietario',
    'Nome do Cliente', 'Titular', 'Beneficiário', 'Beneficiario',
  ]);
  const agendamento = scanForKeyword(text, ['Agendamento', 'Nº Agendamento', 'Nr Agendamento', 'Número Agendamento']);
  const endereco = scanForKeyword(text, ['Endereço Cliente', 'Endereço', 'Endereco', 'Logradouro']);
  const bairro = scanForKeyword(text, ['Bairro']);
  const cidade = extractCidadeUf(text);
  const cep = extractFirst([/(?:CEP)[:\s]*(\d{5}-?\d{3})/i, /\b(\d{5}-\d{3})\b/], text);
  const telefone = scanForKeyword(text, ['Telefone', 'Fone', 'Tel', 'Celular']);
  const email = extractFirst([
    /(?:E-?mail|Email)[:\s]*([^\s,;]+@[^\s,;]+)/i,
    /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,})\b/i,
  ], text);

  return { solicitante, empresa, clienteFinal, agendamento, endereco, bairro, cidade, cep, telefone, email };
}

// --------------- VEÍCULO ---------------
export function extractVeiculo(text: string) {
  const placa = extractFirst([
    /(?:Placa)[:\s]*([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})/i,
    /\b([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})\b/i,
  ], text);

  const chassi = extractFirst([
    /(?:Chassi|VIN|Chassis|Nº Chassi|N[°º]\s*Chassi)[:\s]*([A-HJ-NPR-Z0-9]{17})/i,
    /\b([A-HJ-NPR-Z0-9]{17})\b/,
  ], text);

  let marcaModelo = scanForKeyword(text, [
    'Marca/Modelo', 'Marca / Modelo', 'Marca e Modelo',
    'Veículo', 'Veiculo', 'Modelo', 'Marca',
    'Descrição do Veículo', 'Descricao do Veiculo',
  ]);
  if (marcaModelo && placa) {
    marcaModelo = marcaModelo.replace(new RegExp(`^${placa.replace(/[-\s]/g, '[-\\s]?')}\\s*[-–]?\\s*`, 'i'), '').trim();
  }

  const hodometro = scanForKeyword(text, [
    'Quilometragem', 'Hodômetro', 'Hodometro', 'KM', 'Km Atual',
    'Km atual', 'Kilometragem', 'Odômetro', 'Odometro',
  ]) || extractFirst([/(?:Quilometragem|Hodômetro|Hodometro|Km)[^:]*[:\s]+([\d.]+)/i], text);

  let anoFabricacao = "";
  let anoModelo = "";
  const anoMatch = text.match(/(?:Ano\s*(?:Fab(?:ricação|ricacao)?)?(?:\s*\/?\s*Mod(?:elo)?)?|Ano\/Modelo|Ano Fab\.?\s*\/?\s*Mod\.?)[:\s]+(\d{4})(?:\s*\/\s*(\d{4}))?/i);
  if (anoMatch) {
    anoFabricacao = anoMatch[1];
    anoModelo = anoMatch[2] || anoMatch[1];
  } else {
    anoFabricacao = scanForKeyword(text, ['Ano Fabricação', 'Ano Fabricacao', 'Ano Fab', 'Ano Fab.']);
    anoModelo = scanForKeyword(text, ['Ano Modelo', 'Ano Mod', 'Ano Mod.']);
    if (!anoModelo && anoFabricacao) anoModelo = anoFabricacao;
  }

  const motorizacao = scanForKeyword(text, [
    'Motorização', 'Motorizacao', 'Motor', 'Potência', 'Potencia', 'Cilindrada',
  ]);

  const cor = scanForKeyword(text, ['Cor', 'Cor do Veículo', 'Cor do Veiculo', 'Cor Predominante']);

  const combustivel = scanForKeyword(text, [
    'Combustível', 'Combustivel', 'Tipo Combustível', 'Tipo Combustivel',
  ]);

  return { marcaModelo, anoFabricacao, anoModelo, placa, chassi, hodometro, motorizacao, cor, combustivel };
}

// --------------- OFICINA ---------------
export function extractOficina(text: string) {
  const secMatch = text.match(/(?:Estabelecimento|Oficina|Prestador|Dados\s*(?:da\s*)?Oficina)([\s\S]*)$/i);
  const sec = secMatch?.[1] ?? text;

  const nome = scanForKeyword(sec, [
    'Nome da Oficina', 'Nome Oficina', 'Oficina', 'Estabelecimento',
    'Prestador', 'Razão Social', 'Razao Social',
  ]) || scanForKeyword(text, ['Oficina', 'Estabelecimento', 'Prestador']);

  const cnpj = extractFirst([
    /(?:CNPJ)[:\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i,
    /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/,
  ], sec) || extractFirst([/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/], text);

  const endereco = scanForKeyword(sec, [
    'Logradouro/Número', 'Logradouro / Número', 'Logradouro',
    'Endereço', 'Endereco', 'Rua', 'Avenida', 'Av.',
  ]);

  const bairro = scanForKeyword(sec, ['Bairro']);
  const cidade = extractCidadeUf(sec) || extractCidadeUf(text);

  const telefone = scanForKeyword(sec, [
    'Telefone', 'Fone', 'Fones', 'Tel', 'Tel.', 'Celular',
  ]) || extractFirst([/(?:Fones?|Telefone|Tel\.?)[:\s]+([\d\(\)\s\-\/]+)/i], sec);

  const responsavel = scanForKeyword(sec, [
    'Responsável pelo Orçamento', 'Responsável', 'Responsavel',
    'Resp. Técnico', 'Resp. Tecnico', 'Consultor',
  ]);

  return { nome, cnpj, endereco, bairro, cidade, telefone, responsavel };
}

function extractCidadeUf(source: string): string {
  const direto = extractFirst([
    /Cidade\s*\/?\s*UF\s*[:\s-]+([^|]+?)(?=\s*(?:CEP|Fones?|Telefone|Responsável|Taxa|$))/i,
    /\bCidade\s*[:\s-]+([^|]+?)(?=\s*(?:CEP|Fones?|Telefone|Responsável|Taxa|$))/i,
  ], source);

  if (direto) {
    const cidadeComUf = direto.match(/([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)\s*-\s*([A-Z]{2})/i);
    if (cidadeComUf) return `${cidadeComUf[1].trim()} - ${cidadeComUf[2]}`;
    return direto;
  }

  const generico = source.match(/\b([A-ZÀ-Ú][A-ZÀ-Ú\s]{2,})\s*[-–]\s*([A-Z]{2})\b/i);
  if (generico) return `${generico[1].trim()} - ${generico[2]}`;

  return scanForKeyword(source, ['Cidade', 'Município', 'Municipio']);
}
