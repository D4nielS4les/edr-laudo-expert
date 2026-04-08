/**
 * Extração universal de itens do orçamento com múltiplas estratégias.
 * Campos buscados: referência/código, descrição, quantidade, valor unitário, valor total.
 */
import { parseDecimal } from './helpers';

const NUM_BR = '\\d{1,3}(?:\\.\\d{3})*,\\d{2}';

export function extractItensOrcamento(cleanText: string) {
  console.log("[Parser] Texto total para itens:", cleanText.length, "chars");
  
  const secaoItens = isolateItemsSection(cleanText);
  const textoBusca = secaoItens || cleanText;
  
  console.log("[Parser] Seção de itens:", textoBusca.substring(0, 3000));

  // Estratégia 1: ref(4-10 dígitos) + descrição + qtd + valor unit + valor total
  let items = estrategiaRefDescQtdValor(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia RefDescQtdValor: ${items.length} itens`); return items; }

  // Estratégia 2: Linhas com código(4-10 dígitos) + texto + 2+ valores BR
  items = estrategiaCodigo(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia Código: ${items.length} itens`); return items; }

  // Estratégia 3: Agrupamentos de valores BR com descrição precedente
  items = estrategiaValoresBR(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia ValoresBR: ${items.length} itens`); return items; }

  // Estratégia 4: "descrição ... R$ valor"
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

/**
 * Estratégia principal: procura padrões com referência, descrição, qtd, valor unitário, valor total.
 * Exemplo: "12345678 FILTRO DE OLEO 2,00 45,90 91,80"
 */
function estrategiaRefDescQtdValor(text: string) {
  const items: ReturnType<typeof buildItem>[] = [];
  // Procura: código(4-10 dig) + texto(descrição) + sequência de valores numéricos BR
  const re = new RegExp(
    `(\\d{4,10})\\s+(.+?)\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})`,
    'g'
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const desc = m[2].replace(/\s+/g, ' ').trim();
    if (desc.length < 2) continue;
    // Padrão: ref, desc, qtd, valor unitário, valor total
    items.push(buildItem(m[1], desc, m[3], m[4], m[5]));
  }
  
  if (items.length > 0) return items;

  // Tenta com 4 valores (qtd peça, valor peça, qtd MO, valor MO) + total
  const re5 = new RegExp(
    `(\\d{4,10})\\s+(.+?)\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})`,
    'g'
  );
  while ((m = re5.exec(text)) !== null) {
    const desc = m[2].replace(/\s+/g, ' ').trim();
    if (desc.length < 2) continue;
    items.push(buildItemFull(m[1], desc, m[3], m[4], m[5], m[6], m[7]));
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
      // ref + desc + qtd + valor unit + valor total
      items.push(buildItem(m[1], desc, nums[0][1], nums[1][1], nums[2][1]));
    } else {
      // ref + desc + valor unit + valor total (qtd=1)
      items.push(buildItem(m[1], desc, '1,00', nums[0][1], nums[1][1]));
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
          items.push(buildItem('', desc, allNums[i][1], allNums[i + 1][1], allNums[i + 2][1]));
        } else {
          items.push(buildItem('', desc, '1,00', allNums[i][1], allNums[i + 1][1]));
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
    
    items.push(buildItem('', desc, '1,00', m[2], m[2]));
  }
  return items;
}

function extractDescription(text: string): string {
  return text
    .replace(/\d{4,}/g, '')
    .replace(/(?:SUBSTITUIR|REPARAR|TROCAR|REVISAR|AJUSTAR|INSTALAR|DESMONTAR|MONTAR|VERIFICAR|REGULAR|ALINHAR|BALANCEAR|CALIBRAR|DIAGNOSTICAR|Em\s+orçamento|Pendente|Aprovado|Reprovado)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1)
    .slice(-15)
    .join(' ');
}

/** Constrói item com: referência, descrição, quantidade, valor unitário, valor total */
function buildItem(
  referencia: string, descricao: string,
  qtdStr: string, valorUnitStr: string, valorTotalStr: string
) {
  const qtd = parseDecimal(qtdStr) || 1;
  const valorUnit = parseDecimal(valorUnitStr);
  const valorTotal = parseDecimal(valorTotalStr);

  return {
    id: crypto.randomUUID(),
    codigo: referencia,
    descricao: descricao.replace(/\s+/g, ' ').trim(),
    qtdPeca: qtd,
    valorPeca: valorUnit,
    qtdMaoObra: 0,
    valorMaoObra: 0,
    valorTotal: valorTotal || (qtd * valorUnit),
    status: 'pendente' as const,
    justificativa: ''
  };
}

/** Constrói item com campos separados de peça e mão de obra */
function buildItemFull(
  referencia: string, descricao: string,
  qtdPecaStr: string, valorPecaStr: string,
  qtdMOStr: string, valorMOStr: string,
  valorTotalStr: string
) {
  const qtdPeca = parseDecimal(qtdPecaStr) || 1;
  const valorPeca = parseDecimal(valorPecaStr);
  const qtdMO = parseDecimal(qtdMOStr);
  const valorMO = parseDecimal(valorMOStr);
  const valorTotal = parseDecimal(valorTotalStr);

  return {
    id: crypto.randomUUID(),
    codigo: referencia,
    descricao: descricao.replace(/\s+/g, ' ').trim(),
    qtdPeca,
    valorPeca: qtdPeca > 0 ? valorPeca / qtdPeca : valorPeca,
    qtdMaoObra: qtdMO,
    valorMaoObra: qtdMO > 0 ? valorMO / qtdMO : valorMO,
    valorTotal: valorTotal || (qtdPeca * valorPeca) + (qtdMO * valorMO),
    status: 'pendente' as const,
    justificativa: ''
  };
}
