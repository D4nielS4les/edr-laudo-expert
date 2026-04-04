/**
 * Extração de campos (cliente, veículo, oficina) por palavras-chave.
 * Cada campo possui múltiplos padrões regex como fallback.
 */
import { extractFirst, cleanField } from './helpers';

// --------------- OS ---------------
export function extractOrdemServico(text: string): string {
  return extractFirst([
    /(?:Ordem de Serviço|O\.?S\.?|Nº\s*OS|N[°º]\s*OS)[:\s]+(\d+)/i,
    /(?:OS)[:\s#]+(\d{4,})/i,
    /\bOS\s*(\d{4,})\b/i,
  ], text);
}

// --------------- CLIENTE ---------------
export function extractCliente(text: string) {
  // Cliente Final: tenta vários padrões
  const clienteFinal = extractFirst([
    /Cliente\s*(?:-\s*\d+)?[:\s]+([^-\n|]+?)(?=\s*-|\s*$)/i,
    /(?:Cliente Final|Cliente)[:\s]+([^|\n]+?)(?=\s*(?:Solicitante|Empresa|Veículo|Placa|$))/i,
  ], text);

  const solicitante = extractFirst([
    /(?:Solicitante|Usuário|Solicitado por)[:\s]+(.*?)(?=\s*(?:Relato|Quilometragem|Empresa|Cliente|Placa|Veículo|Data|CPF|CNPJ|Telefone|$))/i,
  ], text);

  const empresa = extractFirst([
    /(?:Empresa|Razão Social)[:\s]+([^|\n]+?)(?=\s*(?:Cliente|Solicitante|Placa|CNPJ|$))/i,
  ], text);

  return { solicitante, empresa, clienteFinal };
}

// --------------- VEÍCULO ---------------
export function extractVeiculo(text: string) {
  const placa = extractFirst([
    /(?:Placa)[:\s]*([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i,
    /\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/i, // fallback: qualquer placa no texto
  ], text);

  const chassi = extractFirst([
    /(?:Chassi|VIN)[:\s]*([A-Z0-9]{17})/i,
  ], text);

  // Modelo: tenta "Veículo: PLACA - MODELO" primeiro
  let marcaModelo = extractFirst([
    /(?:Veículo|Modelo)[:\s]+[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\s*-\s*([^|\n]+?)(?=\s*(?:Consulta|Ano|Placa|Chassi|$))/i,
    /(?:Marca\s*\/?\s*Modelo|Modelo|Veículo)[:\s]+([^|\n]+?)(?=\s*(?:Ano|Placa|Chassi|Cor|$))/i,
  ], text);

  const hodometro = extractFirst([
    /(?:Quilometragem|Hodômetro|Hodometro|Km)[^:]*[:\s]+([\d.]+)/i,
  ], text);

  let anoFabricacao = "";
  let anoModelo = "";
  const anoMatch = text.match(/(?:Ano|Ano\s*Fab\.?\s*\/?\s*Mod\.?)[:\s]+(\d{4})(?:\s*\/\s*(\d{4}))?/i);
  if (anoMatch) {
    anoFabricacao = anoMatch[1];
    anoModelo = anoMatch[2] || anoMatch[1];
  }

  return { marcaModelo, anoFabricacao, anoModelo, placa, chassi, hodometro };
}

// --------------- OFICINA ---------------
export function extractOficina(text: string) {
  // Tenta isolar seção "Estabelecimento" para evitar pegar dados de outras seções
  const secMatch = text.match(/(?:Estabelecimento)([\s\S]*)$/i);
  const sec = secMatch?.[1] ?? text;

  const nome = extractFirst([
    /(?:Estabelecimento\s+)?Nome[:\s]+([^\n|]+?)(?=\s*(?:CNPJ|Logradouro|Endereço|Bairro|Cidade|Fones?|Telefone|Responsável|$))/i,
    /(?:Oficina|Estabelecimento)[:\s]+([^\n|]+?)(?=\s*(?:CNPJ|Endereço|$))/i,
  ], sec);

  const cnpj = extractFirst([
    /(?:CNPJ)[:\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i,
    /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/,  // fallback: qualquer CNPJ
  ], sec);

  const endereco = extractFirst([
    /(?:Logradouro\s*\/?\s*Número|Logradouro|Endereço)[:\s]+([^\n|]+?)(?=\s*(?:Complemento|Bairro|Cidade|CEP|Fones?|Telefone|CNPJ|Responsável|$))/i,
  ], sec);

  const bairro = extractFirst([
    /(?:Bairro)[:\s]+([^\n|]+?)(?=\s*(?:Cidade|CEP|Fones?|Telefone|UF|Responsável|Taxa|$))/i,
  ], sec);

  const cidade = extractCidadeUf(sec) || extractCidadeUf(text);

  const telefone = extractFirst([
    /(?:Fones?|Telefone)[:\s]+([\d\(\)\s\-]+)/i,
  ], sec);

  const responsavel = extractFirst([
    /(?:Responsável\s*(?:pelo\s*Orçamento)?|Responsável)[:\s]+([^\n|]+?)(?=\s*(?:Data|Fones?|Telefone|CNPJ|$))/i,
  ], sec);

  return { nome, cnpj, endereco, bairro, cidade, telefone, responsavel };
}

function extractCidadeUf(source: string): string {
  // Tenta padrão direto "Cidade/UF: XXXX - UF"
  const direto = extractFirst([
    /Cidade\s*\/\s*UF\s*[:\s-]+([^|]+?)(?=\s*(?:CEP|Fones?|Telefone|Responsável|Taxa|$))/i,
    /\bCidade\s*[:\s-]+([^|]+?)(?=\s*(?:CEP|Fones?|Telefone|Responsável|Taxa|$))/i,
  ], source);

  if (direto) {
    const cidadeComUf = direto.match(/([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)\s*-\s*([A-Z]{2})/i);
    if (cidadeComUf) return cleanField(`${cidadeComUf[1].trim()} - ${cidadeComUf[2]}`);
  }

  // Fallback: procura "CIDADE - UF" em qualquer lugar
  const generico = source.match(/\b([A-ZÀ-Ú][A-ZÀ-Ú\s]{2,}\s*-\s*[A-Z]{2})\b/i);
  if (generico) return cleanField(generico[1]);

  return "";
}
