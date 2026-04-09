/**
 * Extração universal de itens do orçamento com múltiplas estratégias.
 */
import { parseDecimal, scanForKeyword } from './helpers';

const NUM_BR = '\\d{1,3}(?:\\.\\d{3})*,\\d{2}';

export function extractItensOrcamento(cleanText: string) {
  console.log("[Parser] Texto total para itens:", cleanText.length, "chars");
  
  const secaoItens = isolateItemsSection(cleanText);
  const textoBusca = secaoItens || cleanText;
  
  console.log("[Parser] Seção de itens:", textoBusca.substring(0, 3000));

  let items = estrategiaRefDescQtdValor(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia RefDescQtdValor: ${items.length} itens`); return items; }

  items = estrategiaCodigo(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia Código: ${items.length} itens`); return items; }

  items = estrategiaValoresBR(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia ValoresBR: ${items.length} itens`); return items; }

  items = estrategiaDescValor(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia DescValor: ${items.length} itens`); return items; }

  console.log("[Parser] Nenhum item encontrado");
  return [];
}

function isolateItemsSection(text: string): string {
  const sectionStarts = [
    /\b(?:Itens|Itens\s*do\s*Orçamento|Orçamento|Orcamento|Peças\s*e\s*Serviços|Lista\s*de\s*Peças|Serviços|Descrição\s*dos\s*Serviços|Relação\s*de\s*Peças|Relação\s*de\s*Serviços|Produtos|Materiais)\b/gi,
  ];
  const sectionEnds = /\b(?:Subtotais?|Totais?|Total\s*Geral|Valor\s*Total\s*(?:do\s*)?Orçamento|Observações?|Condições|Assinatura|Autorizo)\b/i;
  
  for (const startRe of sectionStarts) {
    const startMatch = startRe.exec(text);
    if (startMatch) {
      const afterStart = text.substring(startMatch.index);
      const endMatch = afterStart.substring(50).match(sectionEnds);
      if (endMatch) return afterStart.substring(0, 50 + endMatch.index);
      return afterStart;
    }
  }
  return '';
}

// --- Estratégias de extração ---

function estrategiaRefDescQtdValor(text: string) {
  const items: ReturnType<typeof buildItem>[] = [];
  const re = new RegExp(
    `(\\d{4,10})\\s+(.+?)\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})`,
    'g'
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const desc = m[2].replace(/\s+/g, ' ').trim();
    if (desc.length < 2) continue;
    items.push(buildItem(m[1], desc, m[3], m[4], m[5], text));
  }
  
  if (items.length > 0) return items;

  const re5 = new RegExp(
    `(\\d{4,10})\\s+(.+?)\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})`,
    'g'
  );
  while ((m = re5.exec(text)) !== null) {
    const desc = m[2].replace(/\s+/g, ' ').trim();
    if (desc.length < 2) continue;
    items.push(buildItemFull(m[1], desc, m[3], m[4], m[5], m[6], m[7], text));
  }
  return items;
}

function estrategiaCodigo(text: string) {
  const items: ReturnType<typeof buildItem>[] = [];
  const codeRe = /\b(\d{4,10})\b/g;
  let m: RegExpExecArray | null;
  
  while ((m = codeRe.exec(text)) !== null) {
    const afterCode = text.substring(m.index + m[0].length, m.index + m[0].length + 500);
    const nums = [...afterCode.matchAll(new RegExp(`(${NUM_BR})`, 'g'))];
    if (nums.length < 2) continue;
    
    const firstNumPos = nums[0].index!;
    const desc = afterCode.substring(0, firstNumPos).replace(/\s+/g, ' ').trim();
    if (desc.length < 2) continue;
    
    if (nums.length >= 3) {
      items.push(buildItem(m[1], desc, nums[0][1], nums[1][1], nums[2][1], text));
    } else {
      items.push(buildItem(m[1], desc, '1,00', nums[0][1], nums[1][1], text));
    }
  }
  return items;
}

function estrategiaValoresBR(text: string) {
  const items: ReturnType<typeof buildItem>[] = [];
  const allNums = [...text.matchAll(new RegExp(`(${NUM_BR})`, 'g'))];
  if (allNums.length < 2) return items;
  
  let i = 0;
  while (i < allNums.length) {
    let groupEnd = i;
    while (groupEnd + 1 < allNums.length && 
           allNums[groupEnd + 1].index! - (allNums[groupEnd].index! + allNums[groupEnd][0].length) < 50) {
      groupEnd++;
    }
    
    const groupSize = groupEnd - i + 1;
    if (groupSize >= 2) {
      const startPos = allNums[i].index!;
      const precedingText = text.substring(Math.max(0, startPos - 300), startPos).trim();
      const desc = extractDescription(precedingText);
      
      if (desc.length >= 3) {
        if (groupSize >= 3) {
          items.push(buildItem('', desc, allNums[i][1], allNums[i + 1][1], allNums[i + 2][1], text));
        } else {
          items.push(buildItem('', desc, '1,00', allNums[i][1], allNums[i + 1][1], text));
        }
      }
      i = groupEnd + 1;
    } else {
      i++;
    }
  }
  return items;
}

function estrategiaDescValor(text: string) {
  const items: ReturnType<typeof buildItem>[] = [];
  const lineRe = /(.{5,120}?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  let m: RegExpExecArray | null;
  
  while ((m = lineRe.exec(text)) !== null) {
    const desc = m[1].replace(/\s+/g, ' ').trim();
    if (/(?:total|subtotal|desconto|observ|condição|assinatura|fone|telefone|cnpj|cpf)/i.test(desc)) continue;
    if (/^\d+$/.test(desc)) continue;
    if (desc.length < 3) continue;
    items.push(buildItem('', desc, '1,00', m[2], m[2], text));
  }
  return items;
}

function extractDescription(text: string): string {
  return text
    .replace(/\d{4,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1)
    .slice(-15)
    .join(' ');
}

// --- Extração de metadados do item ---

function detectGrupo(desc: string, fullText: string): string {
  const descLow = desc.toLowerCase();
  if (/\b(?:serviço|servico|mão de obra|mao de obra|m\.o\.|mo\b|instalação|instalacao|reparo|reforma|revisão|revisao|diagnóstico|diagnostico)\b/i.test(descLow)) return 'Serviços';
  if (/\b(?:peça|peca|filtro|óleo|oleo|correia|pastilha|disco|amortecedor|rolamento|vedação|vedacao|junta|mangueira|parafuso|porca|arruela|anel|retentor|bucha)\b/i.test(descLow)) return 'Peças';
  if (/\b(?:pintura|funilaria|lanternagem|polimento|cristalização|cristalizacao)\b/i.test(descLow)) return 'Funilaria/Pintura';
  // Try from section headers in full text
  const secHeaders = [...fullText.matchAll(/\b(Peças|Pecas|Serviços|Servicos|Funilaria|Pintura|Materiais|Acessórios|Acessorios)\b/gi)];
  if (secHeaders.length > 0) {
    // Find the nearest section header before this description
    for (let i = secHeaders.length - 1; i >= 0; i--) {
      const hdr = secHeaders[i];
      const descPos = fullText.indexOf(desc);
      if (descPos >= 0 && hdr.index! < descPos) {
        return hdr[1].charAt(0).toUpperCase() + hdr[1].slice(1).toLowerCase();
      }
    }
  }
  return '';
}

function detectAcao(desc: string): string {
  const acoes = [
    { re: /\b(?:substituir|substituição|substituicao|troca)\b/i, val: 'Substituir' },
    { re: /\b(?:reparar|reparo|reparação|reparacao)\b/i, val: 'Reparar' },
    { re: /\b(?:pintar|pintura|repintura)\b/i, val: 'Pintar' },
    { re: /\b(?:revisar|revisão|revisao)\b/i, val: 'Revisar' },
    { re: /\b(?:fornecimento|fornec|fornecer)\b/i, val: 'Fornecimento' },
    { re: /\b(?:instalar|instalação|instalacao|montagem|montar)\b/i, val: 'Instalar' },
    { re: /\b(?:desmontar|desmontagem)\b/i, val: 'Desmontar' },
    { re: /\b(?:alinhar|alinhamento)\b/i, val: 'Alinhar' },
    { re: /\b(?:balancear|balanceamento)\b/i, val: 'Balancear' },
    { re: /\b(?:diagnosticar|diagnóstico|diagnostico)\b/i, val: 'Diagnosticar' },
    { re: /\b(?:calibrar|calibração|calibracao)\b/i, val: 'Calibrar' },
    { re: /\b(?:regular|regulagem)\b/i, val: 'Regular' },
    { re: /\b(?:reforma|reformar)\b/i, val: 'Reforma' },
    { re: /\b(?:verificar|verificação|verificacao)\b/i, val: 'Verificar' },
  ];
  for (const a of acoes) {
    if (a.re.test(desc)) return a.val;
  }
  return '';
}

function detectStatusItem(desc: string, fullText: string): string {
  // Check near the item description for status keywords
  const combined = desc + ' ' + fullText.substring(Math.max(0, fullText.indexOf(desc) - 50), fullText.indexOf(desc) + desc.length + 100);
  const statuses = [
    { re: /\b(?:autorizado|aprovado)\b/i, val: 'Autorizado' },
    { re: /\b(?:em orçamento|em orcamento)\b/i, val: 'Em orçamento' },
    { re: /\b(?:em revisão|em revisao)\b/i, val: 'Em revisão' },
    { re: /\b(?:pendente)\b/i, val: 'Pendente' },
    { re: /\b(?:reprovado|negado|recusado)\b/i, val: 'Reprovado' },
  ];
  for (const s of statuses) {
    if (s.re.test(combined)) return s.val;
  }
  return '';
}

function detectImpostos(text: string, desc: string): { ipi: number; icms: number } {
  // Search near the item for tax values
  const searchArea = text.substring(
    Math.max(0, text.indexOf(desc)),
    Math.min(text.length, text.indexOf(desc) + desc.length + 300)
  );
  const ipiMatch = searchArea.match(/IPI[:\s]*(\d{1,3}(?:[.,]\d{1,2})?)\s*%?/i);
  const icmsMatch = searchArea.match(/ICMS[:\s]*(\d{1,3}(?:[.,]\d{1,2})?)\s*%?/i);
  return {
    ipi: ipiMatch ? parseDecimal(ipiMatch[1]) : 0,
    icms: icmsMatch ? parseDecimal(icmsMatch[1]) : 0,
  };
}

// --- Builders ---

function buildItem(
  referencia: string, descricao: string,
  qtdStr: string, valorUnitStr: string, valorTotalStr: string,
  fullText: string
) {
  const qtd = parseDecimal(qtdStr) || 1;
  const valorUnit = parseDecimal(valorUnitStr);
  const valorTotal = parseDecimal(valorTotalStr);
  const cleanDesc = descricao.replace(/\s+/g, ' ').trim();

  return {
    id: crypto.randomUUID(),
    codigo: referencia,
    grupo: detectGrupo(cleanDesc, fullText),
    descricao: cleanDesc,
    acao: detectAcao(cleanDesc),
    statusItem: detectStatusItem(cleanDesc, fullText),
    qtdPeca: qtd,
    valorPeca: valorUnit,
    qtdMaoObra: 0,
    valorMaoObra: 0,
    valorTotal: valorTotal || (qtd * valorUnit),
    impostos: detectImpostos(fullText, cleanDesc),
    status: 'pendente' as const,
    justificativa: ''
  };
}

function buildItemFull(
  referencia: string, descricao: string,
  qtdPecaStr: string, valorPecaStr: string,
  qtdMOStr: string, valorMOStr: string,
  valorTotalStr: string, fullText: string
) {
  const qtdPeca = parseDecimal(qtdPecaStr) || 1;
  const valorPeca = parseDecimal(valorPecaStr);
  const qtdMO = parseDecimal(qtdMOStr);
  const valorMO = parseDecimal(valorMOStr);
  const valorTotal = parseDecimal(valorTotalStr);
  const cleanDesc = descricao.replace(/\s+/g, ' ').trim();

  return {
    id: crypto.randomUUID(),
    codigo: referencia,
    grupo: detectGrupo(cleanDesc, fullText),
    descricao: cleanDesc,
    acao: detectAcao(cleanDesc),
    statusItem: detectStatusItem(cleanDesc, fullText),
    qtdPeca,
    valorPeca: qtdPeca > 0 ? valorPeca / qtdPeca : valorPeca,
    qtdMaoObra: qtdMO,
    valorMaoObra: qtdMO > 0 ? valorMO / qtdMO : valorMO,
    valorTotal: valorTotal || (qtdPeca * valorPeca) + (qtdMO * valorMO),
    impostos: detectImpostos(fullText, cleanDesc),
    status: 'pendente' as const,
    justificativa: ''
  };
}
