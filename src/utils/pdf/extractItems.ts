/**
 * Extração universal de itens do orçamento com múltiplas estratégias.
 * Funciona com qualquer PDF de orçamento automotivo/mecânico.
 */
import { parseDecimal } from './helpers';

const NUM_BR = '\\d{1,3}(?:\\.\\d{3})*,\\d{2}';
const NUM_ANY = '(?:\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+(?:\\.\\d{1,2})?)';

export function extractItensOrcamento(cleanText: string) {
  console.log("[Parser] Texto total para itens:", cleanText.length, "chars");
  
  // Tenta isolar seções de itens/orçamento
  const secaoItens = isolateItemsSection(cleanText);
  const textoBusca = secaoItens || cleanText;
  
  console.log("[Parser] Seção de itens:", textoBusca.substring(0, 2000));

  // Estratégia 1: Linhas com código(6-10 dig) + descrição + valores BR
  let items = estrategiaCodigo(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia Código: ${items.length} itens`); return items; }

  // Estratégia 2: Linhas com 3+ valores numéricos BR (tabela de orçamento)
  items = estrategiaValoresBR(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia Valores BR: ${items.length} itens`); return items; }

  // Estratégia 3: Padrão "descrição + quantidade + valor"
  items = estrategiaDescValor(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia Desc+Valor: ${items.length} itens`); return items; }

  // Estratégia 4: Qualquer agrupamento de valores numéricos
  items = estrategiaGenerica(textoBusca);
  if (items.length > 0) { console.log(`[Parser] Estratégia Genérica: ${items.length} itens`); return items; }

  console.log("[Parser] Nenhum item encontrado");
  return [];
}

function isolateItemsSection(text: string): string {
  // Tenta encontrar seções de itens/orçamento/peças/serviços
  const sectionStarts = [
    /\b(?:Itens|Itens\s*do\s*Orçamento|Orçamento|Peças\s*e\s*Serviços|Lista\s*de\s*Peças|Serviços|Descrição\s*dos\s*Serviços|Relação\s*de\s*Peças|Relação\s*de\s*Serviços)\b/gi,
  ];
  
  const sectionEnds = /\b(?:Subtotais?|Totais?|Total\s*Geral|Valor\s*Total|Observações?|Condições|Assinatura|Autorizo)\b/i;
  
  for (const startRe of sectionStarts) {
    const startMatch = startRe.exec(text);
    if (startMatch) {
      const afterStart = text.substring(startMatch.index);
      const endMatch = afterStart.substring(50).match(sectionEnds);
      if (endMatch) {
        return afterStart.substring(0, 50 + endMatch.index);
      }
      return afterStart;
    }
  }
  return '';
}

function estrategiaCodigo(text: string) {
  // Procura linhas com código de 4-10 dígitos seguido de descrição e valores
  const items: ReturnType<typeof buildItem>[] = [];
  const codeRe = /\b(\d{4,10})\b/g;
  let m: RegExpExecArray | null;
  
  while ((m = codeRe.exec(text)) !== null) {
    const afterCode = text.substring(m.index + m[0].length, m.index + m[0].length + 500);
    const nums = [...afterCode.matchAll(new RegExp(`(${NUM_BR})`, 'g'))];
    
    if (nums.length >= 2) {
      const firstNumPos = nums[0].index!;
      const desc = afterCode.substring(0, firstNumPos).replace(/\s+/g, ' ').trim();
      
      // Ignora se a descrição é vazia ou muito curta
      if (desc.length < 2) continue;
      
      if (nums.length >= 5) {
        items.push(buildItem(m[1], desc, nums[0][1], nums[1][1], nums[2][1], nums[3][1], nums[4][1]));
      } else if (nums.length >= 3) {
        // qtd + valor unitário + total
        items.push(buildItem(m[1], desc, nums[0][1], nums[1][1], '0,00', '0,00', nums[2][1]));
      } else {
        // qtd + total
        items.push(buildItem(m[1], desc, nums[0][1], nums[1][1], '0,00', '0,00', nums[1][1]));
      }
    }
  }
  return items;
}

function estrategiaValoresBR(text: string) {
  // Procura agrupamentos de 3+ valores numéricos BR com texto precedente
  const items: ReturnType<typeof buildItem>[] = [];
  const allNums = [...text.matchAll(new RegExp(`(${NUM_BR})`, 'g'))];
  
  if (allNums.length < 3) return items;
  
  // Agrupa valores próximos (dentro de 200 chars entre si)
  let i = 0;
  while (i < allNums.length) {
    const groupStart = i;
    let groupEnd = i;
    
    while (groupEnd + 1 < allNums.length && 
           allNums[groupEnd + 1].index! - (allNums[groupEnd].index! + allNums[groupEnd][0].length) < 50) {
      groupEnd++;
    }
    
    const groupSize = groupEnd - groupStart + 1;
    
    if (groupSize >= 2) {
      const startPos = allNums[groupStart].index!;
      const precedingText = text.substring(Math.max(0, startPos - 300), startPos).trim();
      
      // Extrai descrição: últimas palavras significativas antes dos números
      const desc = extractDescription(precedingText);
      
      if (desc.length >= 2) {
        if (groupSize >= 5) {
          items.push(buildItem('', desc,
            allNums[groupStart][1], allNums[groupStart + 1][1],
            allNums[groupStart + 2][1], allNums[groupStart + 3][1],
            allNums[groupStart + 4][1]));
        } else if (groupSize >= 3) {
          items.push(buildItem('', desc,
            allNums[groupStart][1], allNums[groupStart + 1][1],
            '0,00', '0,00', allNums[groupStart + 2][1]));
        } else {
          items.push(buildItem('', desc,
            '1,00', allNums[groupStart][1],
            '0,00', '0,00', allNums[groupStart + 1][1]));
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
  // Procura padrões "descrição ... R$ valor" ou "descrição ... valor"
  const items: ReturnType<typeof buildItem>[] = [];
  const lineRe = /(.{5,100}?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  let m: RegExpExecArray | null;
  
  while ((m = lineRe.exec(text)) !== null) {
    const desc = m[1].replace(/\s+/g, ' ').trim();
    const valor = m[2];
    
    // Ignora linhas que parecem ser cabeçalhos ou totais
    if (/(?:total|subtotal|desconto|observ|condição|assinatura)/i.test(desc)) continue;
    if (/^\d+$/.test(desc)) continue;
    
    items.push(buildItem('', desc, '1,00', valor, '0,00', '0,00', valor));
  }
  return items;
}

function estrategiaGenerica(text: string) {
  // Última tentativa: busca qualquer linha que tenha texto + pelo menos um valor monetário
  const items: ReturnType<typeof buildItem>[] = [];
  const segments = text.split(/[;\n]/);
  
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (trimmed.length < 5) continue;
    
    const valores = [...trimmed.matchAll(new RegExp(`(${NUM_ANY})`, 'g'))];
    const textoPartes = trimmed.replace(new RegExp(NUM_ANY, 'g'), '').replace(/\s+/g, ' ').trim();
    
    if (valores.length >= 1 && textoPartes.length > 3 && !/(?:total|subtotal)/i.test(textoPartes)) {
      const valorTotal = valores[valores.length - 1][1];
      items.push(buildItem('', textoPartes, '1,00', valorTotal, '0,00', '0,00', valorTotal));
    }
  }
  
  // Filtra itens muito genéricos (sem descrição real)
  return items.filter(item => item.descricao.length > 3);
}

function extractDescription(text: string): string {
  // Remove códigos e números do começo, pega palavras significativas
  const cleaned = text
    .replace(/\d{4,}/g, '') // remove códigos numéricos longos
    .replace(/(?:SUBSTITUIR|REPARAR|TROCAR|REVISAR|AJUSTAR|INSTALAR|DESMONTAR|MONTAR|VERIFICAR|REGULAR|ALINHAR|BALANCEAR|CALIBRAR|DIAGNOSTICAR|Em\s+orçamento|Pendente|Aprovado|Reprovado)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Pega as últimas palavras significativas (até 15 palavras)
  const words = cleaned.split(/\s+/).filter(w => w.length > 1);
  return words.slice(-15).join(' ');
}

function buildItem(
  codigo: string, descricao: string,
  qtdPecaStr: string, valorPecaTotalStr: string,
  qtdMOStr: string, valorMOTotalStr: string,
  valorTotalStr: string
) {
  const qtdPeca = parseDecimal(qtdPecaStr) || 1;
  const valorPecaTotal = parseDecimal(valorPecaTotalStr);
  const qtdMO = parseDecimal(qtdMOStr);
  const valorMOTotal = parseDecimal(valorMOTotalStr);
  const valorTotal = parseDecimal(valorTotalStr);

  return {
    id: crypto.randomUUID(),
    codigo,
    descricao: descricao.replace(/\s+/g, ' ').trim(),
    qtdPeca,
    valorPeca: qtdPeca > 0 ? valorPecaTotal / qtdPeca : valorPecaTotal,
    qtdMaoObra: qtdMO,
    valorMaoObra: qtdMO > 0 ? valorMOTotal / qtdMO : valorMOTotal,
    valorTotal: valorTotal || (qtdPeca * valorPecaTotal) + (qtdMO * valorMOTotal),
    status: 'pendente' as const,
    justificativa: ''
  };
}
