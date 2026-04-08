/**
 * Extração universal de campos por varredura de palavras-chave.
 * Funciona com qualquer layout de PDF de orçamento automotivo.
 */
import { extractFirst, scanForKeyword } from './helpers';

// --------------- OS ---------------
export function extractOrdemServico(text: string): string {
  // Tenta padrões específicos primeiro
  const specific = extractFirst([
    /(?:Ordem de Serviço|O\.?S\.?|Nº\s*OS|N[°º]\s*OS|Numero\s*OS|Nr\.?\s*OS)[:\s]+(\d+)/i,
    /(?:OS)[:\s#]+(\d{4,})/i,
    /\bOS\s*[:# ]+(\d{4,})\b/i,
    /\bO\.S\.?\s*[:# ]+(\d+)/i,
  ], text);
  if (specific) return specific;

  // Fallback: procura número após keyword
  return scanForKeyword(text, ['Ordem de Serviço', 'O.S.', 'OS', 'Nr OS', 'Nº OS', 'Numero OS']);
}

// --------------- CLIENTE ---------------
export function extractCliente(text: string) {
  const solicitante = scanForKeyword(text, [
    'Solicitante', 'Usuário', 'Usuario', 'Solicitado por', 'Solicitado Por',
    'Requisitante', 'Contratante',
  ]);

  const empresa = scanForKeyword(text, [
    'Empresa', 'Razão Social', 'Razao Social', 'Companhia',
    'Seguradora', 'Cia Seguradora', 'Cia. Seguradora',
  ]);

  const clienteFinal = scanForKeyword(text, [
    'Cliente Final', 'Cliente', 'Segurado', 'Proprietário', 'Proprietario',
    'Nome do Cliente', 'Titular', 'Beneficiário', 'Beneficiario',
  ]);

  return { solicitante, empresa, clienteFinal };
}

// --------------- VEÍCULO ---------------
export function extractVeiculo(text: string) {
  // Placa: formato brasileiro (ABC1D23 ou ABC-1234)
  const placa = extractFirst([
    /(?:Placa)[:\s]*([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})/i,
    /\b([A-Z]{3}[\s-]?\d[A-Z0-9]\d{2})\b/i,
  ], text);

  // Chassi: 17 caracteres alfanuméricos
  const chassi = extractFirst([
    /(?:Chassi|VIN|Chassis|Nº Chassi|N[°º]\s*Chassi)[:\s]*([A-HJ-NPR-Z0-9]{17})/i,
    /\b([A-HJ-NPR-Z0-9]{17})\b/,
  ], text);

  // Marca/Modelo
  let marcaModelo = scanForKeyword(text, [
    'Marca/Modelo', 'Marca / Modelo', 'Marca e Modelo',
    'Veículo', 'Veiculo', 'Modelo', 'Marca',
    'Descrição do Veículo', 'Descricao do Veiculo',
  ]);
  // Remove placa do início do modelo se presente
  if (marcaModelo && placa) {
    marcaModelo = marcaModelo.replace(new RegExp(`^${placa.replace(/[-\s]/g, '[-\\s]?')}\\s*[-–]?\\s*`, 'i'), '').trim();
  }

  // Hodômetro/KM
  const hodometro = scanForKeyword(text, [
    'Quilometragem', 'Hodômetro', 'Hodometro', 'KM', 'Km Atual',
    'Km atual', 'Kilometragem', 'Odômetro', 'Odometro',
  ]) || extractFirst([/(?:Quilometragem|Hodômetro|Hodometro|Km)[^:]*[:\s]+([\d.]+)/i], text);

  // Ano Fabricação / Modelo
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

  return { marcaModelo, anoFabricacao, anoModelo, placa, chassi, hodometro };
}

// --------------- OFICINA ---------------
export function extractOficina(text: string) {
  // Tenta isolar seção de oficina/estabelecimento
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
