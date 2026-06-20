/**
 * Extração de itens do orçamento — opera linha a linha.
 * Suporta:
 *  - Ticket Log (Sou Log): Código | Grupo | Peça | Ação | Status | QtdPeça | ValorPeça | QtdMO | ValorMO | ValorTotal
 *  - Facchini: Código | Descrição | NCM | UN | C/F | Peso | Qtd | VlUnit | VlTotal | VlICMS | ValorIPI | IPI% | ICMS% | ICMSSub%
 *  - Genérico: Código + Descrição + valores numéricos
 */
import { parseDecimal } from './helpers';

const NUM_BR = /\d{1,3}(?:\.\d{3})*,\d{2}/;

export function extractItensOrcamento(cleanText: string) {
  if (import.meta.env.DEV) console.log("[Parser] Texto total para itens:", cleanText.length, "chars");

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  // Detecta formato Ticket Log (Sou Log / Good Manager)
  const isTicketLog = /(?:Grupo de Peça|Mão de Obra.*Status.*Peça|Código.*Grupo.*Peça.*Mão)/i.test(cleanText);
  
  // Detecta formato Facchini
  const isFacchini = /(?:VL\.?\s*UNIT\.?\s*BRUT|QUANTID|NCM|DESCRI[ÇC][ÃA]O\s*PRODUTO)/i.test(cleanText);

  if (isTicketLog) {
    if (import.meta.env.DEV) console.log("[Parser] Formato detectado: Ticket Log");
    const items = parseTicketLog(lines, cleanText);
    if (items.length > 0) {
      import.meta.env.DEV && console.log(`[Parser] Ticket Log: ${items.length} itens`);
      return items;
    }
  }

  if (isFacchini) {
    if (import.meta.env.DEV) console.log("[Parser] Formato detectado: Facchini");
    const items = parseFacchini(lines, cleanText);
    if (items.length > 0) {
      import.meta.env.DEV && console.log(`[Parser] Facchini: ${items.length} itens`);
      return items;
    }
  }

  // Fallback genérico
  const secStart = findSectionStart(lines);
  const secEnd = findSectionEnd(lines, secStart);
  const sectionLines = lines.slice(secStart, secEnd);

  import.meta.env.DEV && console.log(`[Parser] Seção de itens genérica: linhas ${secStart}-${secEnd} (${sectionLines.length} linhas)`);

  let items = parseCodeDescValues(sectionLines, cleanText);
  if (items.length > 0) { import.meta.env.DEV && console.log(`[Parser] Código+Desc+Valores: ${items.length} itens`); return items; }

  items = parseDescValues(sectionLines, cleanText);
  if (items.length > 0) { import.meta.env.DEV && console.log(`[Parser] Desc+Valores: ${items.length} itens`); return items; }

  items = parseDescRealValues(sectionLines, cleanText);
  if (items.length > 0) { import.meta.env.DEV && console.log(`[Parser] Desc+R$: ${items.length} itens`); return items; }

  items = parseFallback(sectionLines, cleanText);
  if (items.length > 0) { import.meta.env.DEV && console.log(`[Parser] Fallback: ${items.length} itens`); return items; }

  if (import.meta.env.DEV) console.log("[Parser] Nenhum item encontrado");
  return [];
}

// ==========================================
// TICKET LOG FORMAT
// Columns: Código | Grupo de Peça | Peça | Mão de Obra (ação) | Status | Qtd Peça | Valor Peça | Qtd MO | Valor MO | Valor Total
// ==========================================

function parseTicketLog(lines: string[], fullText: string) {
  const items: ReturnType<typeof buildItemFull>[] = [];

  // Known status values in Ticket Log
  const statusPatterns = /\b(Em orçamento|Em orcamento|Em revisão|Em revisao|Autorizado|Aprovado|Pendente|Reprovado|Cobrado|Cobrada)\b/i;
  
  // Known action values
  const actionPatterns = /\b(SUBSTITUIR|REPARAR|REVISAR|PINTAR|RECUPERAR|INSTALAR|REFORMAR|FORNECIMENTO|REVISAO ELETRICA|SUBSTITUIR COM REVISAO CUBO)\b/i;

  for (const line of lines) {
    // Must start with 8-digit code (Ticket Log uses 8-digit codes)
    const codeMatch = line.match(/^(\d{8})\s+(.+)/);
    if (!codeMatch) continue;

    const codigo = codeMatch[1];
    const rest = codeMatch[2];

    // Extract all BR numbers from the line
    const nums = [...rest.matchAll(new RegExp(NUM_BR.source, 'g'))];
    if (nums.length < 1) continue;

    // Find the first numeric value position to split text from numbers
    const firstNumIdx = nums[0].index!;
    const textPart = rest.substring(0, firstNumIdx).trim();
    
    // Skip subtotal/total lines
    if (/\b(?:subtotai?s?|total)\b/i.test(textPart)) continue;

    // Parse the text part to extract grupo, descrição, ação, status
    let grupo = '';
    let descricao = '';
    let acao = '';
    let statusItem = '';

    // Try to find status in the text
    const statusMatch = textPart.match(statusPatterns);
    if (statusMatch) {
      statusItem = statusMatch[1];
    }

    // Try to find action in the text
    const actionMatch = textPart.match(actionPatterns);
    if (actionMatch) {
      acao = actionMatch[1];
    }

    // Remove status and action from text to isolate grupo + descrição
    let cleanText2 = textPart;
    if (statusItem) cleanText2 = cleanText2.replace(statusPatterns, '').trim();
    if (acao) cleanText2 = cleanText2.replace(actionPatterns, '').trim();
    cleanText2 = cleanText2.replace(/\s{2,}/g, ' ').trim();

    // In Ticket Log, format is typically "GRUPO DESCRICAO" or just "GRUPO"
    // Known groups: ACESSORIOS, ELETRICA, EQUIPAMENTOS, FREIO, FUNILARIA, MOTOR, SUSPENSAO, TRANSMISSAO, PRODUTOS, NAO APLICAVEL
    const grupoPattern = /^(ACESSORIOS|ELETRICA|EQUIPAMENTOS\s*(?:CESTA\s*AEREA|LANCA\s*ISOLADA)?|FREIO|FUNILARIA|MOTOR|SUSPENSAO|TRANSMISSAO|PRODUTOS|NAO\s*APLICAVEL)\s*(.*)/i;
    const grupoMatch = cleanText2.match(grupoPattern);
    
    if (grupoMatch) {
      grupo = grupoMatch[1].trim();
      descricao = grupoMatch[2]?.trim() || grupo;
    } else {
      // Fallback: first word is grupo, rest is descricao
      const parts = cleanText2.split(/\s+/);
      if (parts.length > 1) {
        grupo = parts[0];
        descricao = parts.slice(1).join(' ');
      } else {
        descricao = cleanText2;
      }
    }

    if (!descricao || descricao.length < 2) descricao = grupo || codigo;

    // Map numeric values: expect 5 values (qtdP, valP, qtdMO, valMO, valTotal)
    const vals = nums.map(n => n[0]);
    let qtdPeca = 1, valorPeca = 0, qtdMO = 0, valorMO = 0, valorTotal = 0;

    if (vals.length >= 5) {
      qtdPeca = parseDecimal(vals[vals.length - 5]) || 1;
      valorPeca = parseDecimal(vals[vals.length - 4]);
      qtdMO = parseDecimal(vals[vals.length - 3]);
      valorMO = parseDecimal(vals[vals.length - 2]);
      valorTotal = parseDecimal(vals[vals.length - 1]);
    } else if (vals.length === 4) {
      qtdPeca = parseDecimal(vals[0]) || 1;
      valorPeca = parseDecimal(vals[1]);
      valorMO = parseDecimal(vals[2]);
      valorTotal = parseDecimal(vals[3]);
    } else if (vals.length === 3) {
      qtdPeca = parseDecimal(vals[0]) || 1;
      valorPeca = parseDecimal(vals[1]);
      valorTotal = parseDecimal(vals[2]);
    } else if (vals.length === 2) {
      valorPeca = parseDecimal(vals[0]);
      valorTotal = parseDecimal(vals[1]);
    } else if (vals.length === 1) {
      valorTotal = parseDecimal(vals[0]);
    }

    if (!valorTotal) valorTotal = valorPeca + valorMO;

    items.push(buildItemFull(codigo, grupo, descricao, acao, statusItem, qtdPeca, valorPeca, qtdMO, valorMO, valorTotal, { ipi: 0, icms: 0 }));
  }

  return items;
}

// ==========================================
// FACCHINI FORMAT
// Columns: Código | Descrição | NCM | UN | C/F | Peso | Qtd | VlUnit | VlTotal | VlICMSSub | ValorIPI | IPI% | ICMS% | ICMSSub%
// ==========================================

function parseFacchini(lines: string[], _fullText: string) {
  const items: ReturnType<typeof buildItemFull>[] = [];

  for (const line of lines) {
    // Facchini codes are 10-digit (e.g., 0365078501)
    const codeMatch = line.match(/^(\d{10})\s+(.+)/);
    if (!codeMatch) continue;

    const codigo = codeMatch[1];
    const rest = codeMatch[2];

    const nums = [...rest.matchAll(new RegExp(NUM_BR.source, 'g'))];
    if (nums.length < 2) continue;

    const firstNumIdx = nums[0].index!;
    let descricao = rest.substring(0, firstNumIdx).trim();
    
    // Remove NCM, UN, C/F columns from description (they appear between desc and numbers)
    // NCM is 8 digits, UN is 2 letters, C/F is single letter
    descricao = descricao.replace(/\s+\d{8}\s+[A-Z]{2}\s+[A-Z]$/, '').trim();
    descricao = descricao.replace(/\s+\d{8}\s+[A-Z]{1,2}$/, '').trim();
    descricao = descricao.replace(/\s+\d{8}$/, '').trim();

    if (descricao.length < 2) continue;

    const vals = nums.map(n => n[0]);

    // Facchini has: [peso], qtd, vlUnit, vlTotal, vlICMSSub, valorIPI, ipi%, icms%, icmsSub%
    // We need: qtd, vlUnit, vlTotal, and optionally IPI/ICMS percentages
    let qtd = 1, vlUnit = 0, vlTotal = 0;
    let ipiPct = 0, icmsPct = 0;

    if (vals.length >= 8) {
      // peso, qtd, vlUnit, vlTotal, vlICMSSub, valorIPI, ipi%, icms%[, icmsSub%]
      qtd = parseDecimal(vals[1]) || 1;
      vlUnit = parseDecimal(vals[2]);
      vlTotal = parseDecimal(vals[3]);
      ipiPct = parseDecimal(vals[6]);
      icmsPct = parseDecimal(vals[7]);
    } else if (vals.length >= 5) {
      // qtd, vlUnit, vlTotal, valorIPI, ipi%/icms%
      qtd = parseDecimal(vals[0]) || 1;
      vlUnit = parseDecimal(vals[1]);
      vlTotal = parseDecimal(vals[2]);
    } else if (vals.length >= 3) {
      qtd = parseDecimal(vals[0]) || 1;
      vlUnit = parseDecimal(vals[1]);
      vlTotal = parseDecimal(vals[2]);
    } else if (vals.length === 2) {
      vlUnit = parseDecimal(vals[0]);
      vlTotal = parseDecimal(vals[1]);
    }

    if (!vlTotal) vlTotal = qtd * vlUnit;

    items.push(buildItemFull(codigo, '', descricao, 'Fornecimento', '', qtd, vlUnit, 0, 0, vlTotal, { ipi: ipiPct, icms: icmsPct }));
  }

  return items;
}

// ==========================================
// GENERIC STRATEGIES (fallback)
// ==========================================

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
  const endMarkers = /^\s*(?:subtotai?s?|total\s*geral|valor\s*total\s*(?:do\s*)?orçamento|observaç[oõ]es|condiç[oõ]es|assinatura|autorizo)\s*[:=]?\s*/i;
  for (let i = start + 1; i < lines.length; i++) {
    if (endMarkers.test(lines[i])) return i;
  }
  return lines.length;
}

function parseCodeDescValues(lines: string[], fullText: string) {
  const items: ReturnType<typeof buildItemSmart>[] = [];
  for (const line of lines) {
    const m = line.match(/^[\s]*(\d{4,10})\s+(.+)/);
    if (!m) continue;
    const codigo = m[1];
    const rest = m[2];
    const nums = [...rest.matchAll(new RegExp(NUM_BR.source, 'g'))];
    if (nums.length < 1) continue;
    const firstNumIdx = nums[0].index!;
    const desc = rest.substring(0, firstNumIdx).trim();
    if (desc.length < 2) continue;
    if (/\b(?:subtotai?s?|total)\b/i.test(desc)) continue;
    const vals = nums.map(n => n[0]);
    items.push(buildItemSmart(codigo, desc, vals, fullText));
  }
  return items;
}

function parseDescValues(lines: string[], fullText: string) {
  const items: ReturnType<typeof buildItemSmart>[] = [];
  const skipRe = /^\s*(?:total|subtotal|desconto|observ|condição|assinatura|fone|telefone|cnpj|cpf|placa|chassi|endereço|bairro|cidade|cep|data|status|empresa|cliente|oficina|estabelecimento)/i;
  for (const line of lines) {
    if (skipRe.test(line)) continue;
    const nums = [...line.matchAll(new RegExp(NUM_BR.source, 'g'))];
    if (nums.length < 2) continue;
    const firstNumIdx = nums[0].index!;
    const desc = line.substring(0, firstNumIdx).replace(/^\d{0,3}\s+/, '').trim();
    if (desc.length < 3) continue;
    if (/\b(?:código|qtd|quantidade|valor|unit[áa]rio|descrição)\b/i.test(desc)) continue;
    const vals = nums.map(n => n[0]);
    items.push(buildItemSmart('', desc, vals, fullText));
  }
  return items;
}

function parseDescRealValues(lines: string[], fullText: string) {
  const items: ReturnType<typeof buildItemSmart>[] = [];
  for (const line of lines) {
    const m = line.match(/(.{3,120}?)\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (!m) continue;
    const desc = m[1].trim();
    if (/(?:total|subtotal|desconto|observ)/i.test(desc)) continue;
    if (/^\d+$/.test(desc)) continue;
    items.push(buildItemSmart('', desc, ['1,00', m[2], m[2]], fullText));
  }
  return items;
}

function parseFallback(lines: string[], fullText: string) {
  const items: ReturnType<typeof buildItemSmart>[] = [];
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
    items.push(buildItemSmart('', desc, ['1,00', lastVal, lastVal], fullText));
  }
  return items;
}

// ==========================================
// BUILDERS
// ==========================================

function buildItemFull(
  codigo: string, grupo: string, descricao: string, acao: string, statusItem: string,
  qtdPeca: number, valorPeca: number, qtdMO: number, valorMO: number, valorTotal: number,
  impostos: { ipi: number; icms: number }
) {
  return {
    id: crypto.randomUUID(),
    codigo,
    grupo,
    descricao: descricao.replace(/\s+/g, ' ').trim(),
    acao,
    statusItem,
    qtdPeca,
    valorPeca,
    qtdMaoObra: qtdMO,
    valorMaoObra: valorMO,
    valorTotal,
    impostos,
    status: 'pendente' as const,
    justificativa: '',
  };
}

function buildItemSmart(codigo: string, descricao: string, vals: string[], fullText: string) {
  let qtdPeca = 1, valorPeca = 0, qtdMO = 0, valorMO = 0, valorTotal = 0;

  if (vals.length >= 5) {
    qtdPeca = parseDecimal(vals[vals.length - 5]) || 1;
    valorPeca = parseDecimal(vals[vals.length - 4]);
    qtdMO = parseDecimal(vals[vals.length - 3]);
    valorMO = parseDecimal(vals[vals.length - 2]);
    valorTotal = parseDecimal(vals[vals.length - 1]);
  } else if (vals.length === 4) {
    qtdPeca = parseDecimal(vals[0]) || 1;
    valorPeca = parseDecimal(vals[1]);
    valorMO = parseDecimal(vals[2]);
    valorTotal = parseDecimal(vals[3]);
  } else if (vals.length === 3) {
    qtdPeca = parseDecimal(vals[0]) || 1;
    valorPeca = parseDecimal(vals[1]);
    valorTotal = parseDecimal(vals[2]);
  } else if (vals.length === 2) {
    valorPeca = parseDecimal(vals[0]);
    valorTotal = parseDecimal(vals[1]);
  } else if (vals.length === 1) {
    valorTotal = parseDecimal(vals[0]);
    valorPeca = valorTotal;
  }

  if (!valorTotal) valorTotal = valorPeca + valorMO;

  return buildItemFull(
    codigo,
    detectGrupo(descricao),
    descricao,
    detectAcao(descricao),
    detectStatusItem(descricao),
    qtdPeca, valorPeca, qtdMO, valorMO, valorTotal,
    detectImpostos(descricao)
  );
}

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
