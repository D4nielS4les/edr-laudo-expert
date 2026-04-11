/**
 * Extração de itens do orçamento — opera linha a linha.
 * Campos extraídos: código, descrição, quantidade, valor unitário, valor total.
 * Campos detectados por heurística: grupo, ação, status, impostos.
 */
import { parseDecimal } from './helpers';

const NUM_BR = /\d{1,3}(?:\.\d{3})*,\d{2}/;

export function extractItensOrcamento(cleanText: string) {
  console.log("[Parser] Texto total para itens:", cleanText.length, "chars");

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Tenta encontrar a seção de itens
  const secStart = findSectionStart(lines);
  const secEnd = findSectionEnd(lines, secStart);
  const sectionLines = lines.slice(secStart, secEnd);
  
  console.log(`[Parser] Seção de itens: linhas ${secStart}-${secEnd} (${sectionLines.length} linhas)`);

  // Estratégia 1: Linhas com código + descrição + valores numéricos
  let items = parseCodeDescValues(sectionLines, cleanText);
  if (items.length > 0) { console.log(`[Parser] Estratégia Código+Desc+Valores: ${items.length} itens`); return items; }

  // Estratégia 2: Linhas com descrição + valores BR (sem código)
  items = parseDescValues(sectionLines, cleanText);
  if (items.length > 0) { console.log(`[Parser] Estratégia Desc+Valores: ${items.length} itens`); return items; }

  // Estratégia 3: Linhas com R$ valor
  items = parseDescRealValues(sectionLines, cleanText);
  if (items.length > 0) { console.log(`[Parser] Estratégia Desc+R$: ${items.length} itens`); return items; }

  // Fallback: qualquer linha com pelo menos um valor monetário e texto descritivo
  items = parseFallback(sectionLines, cleanText);
  if (items.length > 0) { console.log(`[Parser] Estratégia Fallback: ${items.length} itens`); return items; }

  console.log("[Parser] Nenhum item encontrado");
  return [];
}

// --- Localização da seção ---

function findSectionStart(lines: string[]): number {
  const markers = [
    /\b(?:itens|peças\s*e\s*serviços|pecas\s*e\s*servicos|orçamento|orcamento|lista\s*de\s*peças|serviços|produtos|materiais|relação\s*de)\b/i,
    /\b(?:código|codigo|descrição|descricao|qtd|quantidade|valor\s*unit|vlr\s*unit|unit[áa]rio)\b.*\b(?:total|valor)\b/i,
  ];
  for (let i = 0; i < lines.length; i++) {
    for (const re of markers) {
      if (re.test(lines[i])) return i;
    }
  }
  return 0;
}

function findSectionEnd(lines: string[], start: number): number {
  const endMarkers = /^\s*(?:subtotai?s?|total\s*geral|valor\s*total\s*(?:do\s*)?orçamento|observaç[oõ]es|condiç[oõ]es|assinatura|autorizo)\s*[:=]?\s*$/i;
  for (let i = start + 1; i < lines.length; i++) {
    if (endMarkers.test(lines[i])) return i;
  }
  return lines.length;
}

// --- Estratégias de parsing ---

/** Linha com código numérico (4-10 dígitos), seguido de descrição, seguido de valores BR */
function parseCodeDescValues(lines: string[], fullText: string) {
  const items: ReturnType<typeof buildItem>[] = [];
  
  for (const line of lines) {
    // Match: código (4-10 dígitos) no início ou separado, seguido de texto, seguido de números
    const m = line.match(/^[\s]*(\d{4,10})\s+(.+)/);
    if (!m) continue;
    
    const codigo = m[1];
    const rest = m[2];
    
    // Encontra todos os números BR no restante da linha
    const nums = [...rest.matchAll(new RegExp(NUM_BR.source, 'g'))];
    if (nums.length < 1) continue;
    
    // A descrição é tudo antes do primeiro número
    const firstNumIdx = nums[0].index!;
    const desc = rest.substring(0, firstNumIdx).trim();
    if (desc.length < 2) continue;
    
    // Mapeia valores conforme quantidade de colunas numéricas encontradas
    // 5 cols: qtdPeca, valorPeca, qtdMO, valorMO, valorTotal
    // 4 cols: qtdPeca, valorPeca, valorMO, valorTotal (ou qtdPeca, valorPeca, qtdMO, valorTotal)
    // 3 cols: qtd, valorUnit, valorTotal
    // 2 cols: valorUnit, valorTotal
    // 1 col:  valorTotal
    const vals = nums.map(n => n[0]);
    items.push(buildItemSmart(codigo, desc, vals, fullText));
  }
  return items;
}

/** Linha sem código mas com descrição textual + valores numéricos BR */
function parseDescValues(lines: string[], fullText: string) {
  const items: ReturnType<typeof buildItem>[] = [];
  const skipRe = /^\s*(?:total|subtotal|desconto|observ|condição|assinatura|fone|telefone|cnpj|cpf|placa|chassi|endereço|bairro|cidade|cep|data|status|empresa|cliente|oficina|estabelecimento)/i;
  
  for (const line of lines) {
    if (skipRe.test(line)) continue;
    
    const nums = [...line.matchAll(new RegExp(NUM_BR.source, 'g'))];
    if (nums.length < 2) continue;
    
    const firstNumIdx = nums[0].index!;
    const desc = line.substring(0, firstNumIdx).replace(/^\d{0,3}\s+/, '').trim();
    if (desc.length < 3) continue;
    // Ignore header lines
    if (/\b(?:código|qtd|quantidade|valor|unit[áa]rio|descrição)\b/i.test(desc)) continue;
    
    const vals = nums.map(n => n[0]);
    if (vals.length >= 3) {
      items.push(buildItem('', desc, vals[vals.length - 3], vals[vals.length - 2], vals[vals.length - 1], fullText));
    } else {
      items.push(buildItem('', desc, '1,00', vals[0], vals[1], fullText));
    }
  }
  return items;
}

/** Linhas com "R$ valor" */
function parseDescRealValues(lines: string[], fullText: string) {
  const items: ReturnType<typeof buildItem>[] = [];
  
  for (const line of lines) {
    const m = line.match(/(.{3,120}?)\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (!m) continue;
    const desc = m[1].trim();
    if (/(?:total|subtotal|desconto|observ)/i.test(desc)) continue;
    if (/^\d+$/.test(desc)) continue;
    items.push(buildItem('', desc, '1,00', m[2], m[2], fullText));
  }
  return items;
}

/** Fallback: qualquer linha com valor monetário e texto */
function parseFallback(lines: string[], fullText: string) {
  const items: ReturnType<typeof buildItem>[] = [];
  const skipRe = /^\s*(?:total|subtotal|desconto|observ|condição|assinatura|fone|telefone|cnpj|cpf|data|status|empresa|cliente|oficina)/i;
  
  for (const line of lines) {
    if (skipRe.test(line)) continue;
    
    const nums = [...line.matchAll(new RegExp(NUM_BR.source, 'g'))];
    if (nums.length < 1) continue;
    
    const firstNumIdx = nums[0].index!;
    const desc = line.substring(0, firstNumIdx).trim();
    if (desc.length < 3) continue;
    if (/\b(?:código|qtd|quantidade|valor|unit|descrição)\b/i.test(desc)) continue;
    
    const lastVal = nums[nums.length - 1][0];
    items.push(buildItem('', desc, '1,00', lastVal, lastVal, fullText));
  }
  return items;
}

// --- Detecção de metadados ---

function detectGrupo(desc: string): string {
  const d = desc.toLowerCase();
  if (/\b(?:serviço|servico|mão de obra|mao de obra|m\.o\.|instalação|instalacao|reparo|reforma|revisão|revisao|diagnóstico|diagnostico)\b/.test(d)) return 'Serviços';
  if (/\b(?:peça|peca|filtro|óleo|oleo|correia|pastilha|disco|amortecedor|rolamento|vedação|vedacao|junta|mangueira|parafuso)\b/.test(d)) return 'Peças';
  if (/\b(?:pintura|funilaria|lanternagem|polimento)\b/.test(d)) return 'Funilaria/Pintura';
  return '';
}

function detectAcao(desc: string): string {
  const acoes: [RegExp, string][] = [
    [/\b(?:substituir|substituição|substituicao|troca)\b/i, 'Substituir'],
    [/\b(?:reparar|reparo|reparação)\b/i, 'Reparar'],
    [/\b(?:pintar|pintura|repintura)\b/i, 'Pintar'],
    [/\b(?:revisar|revisão|revisao)\b/i, 'Revisar'],
    [/\b(?:fornecimento|fornecer)\b/i, 'Fornecimento'],
    [/\b(?:instalar|instalação|instalacao|montagem|montar)\b/i, 'Instalar'],
    [/\b(?:reforma|reformar)\b/i, 'Reforma'],
  ];
  for (const [re, val] of acoes) {
    if (re.test(desc)) return val;
  }
  return '';
}

function detectStatusItem(line: string): string {
  const statuses: [RegExp, string][] = [
    [/\b(?:autorizado|aprovado)\b/i, 'Autorizado'],
    [/\b(?:em orçamento|em orcamento)\b/i, 'Em orçamento'],
    [/\b(?:em revisão|em revisao)\b/i, 'Em revisão'],
    [/\b(?:pendente)\b/i, 'Pendente'],
    [/\b(?:reprovado|negado|recusado)\b/i, 'Reprovado'],
  ];
  for (const [re, val] of statuses) {
    if (re.test(line)) return val;
  }
  return '';
}

function detectImpostos(line: string): { ipi: number; icms: number } {
  const ipiMatch = line.match(/IPI[:\s]*(\d{1,3}(?:[.,]\d{1,2})?)\s*%?/i);
  const icmsMatch = line.match(/ICMS[:\s]*(\d{1,3}(?:[.,]\d{1,2})?)\s*%?/i);
  return {
    ipi: ipiMatch ? parseDecimal(ipiMatch[1]) : 0,
    icms: icmsMatch ? parseDecimal(icmsMatch[1]) : 0,
  };
}

// --- Builder ---

function buildItem(
  codigo: string, descricao: string,
  qtdStr: string, valorUnitStr: string, valorTotalStr: string,
  fullText: string
) {
  const qtd = parseDecimal(qtdStr) || 1;
  const valorUnit = parseDecimal(valorUnitStr);
  const valorTotal = parseDecimal(valorTotalStr);

  return {
    id: crypto.randomUUID(),
    codigo,
    grupo: detectGrupo(descricao),
    descricao: descricao.replace(/\s+/g, ' ').trim(),
    acao: detectAcao(descricao),
    statusItem: detectStatusItem(descricao),
    qtdPeca: qtd,
    valorPeca: valorUnit,
    qtdMaoObra: 0,
    valorMaoObra: 0,
    valorTotal: valorTotal || (qtd * valorUnit),
    impostos: detectImpostos(descricao),
    status: 'pendente' as const,
    justificativa: '',
  };
}
