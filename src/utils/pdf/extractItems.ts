/**
 * Extração de itens do orçamento com múltiplas estratégias de fallback.
 */
import { parseDecimal } from './helpers';

const ACOES = 'SUBSTITUIR|REPARAR|TROCAR|REVISAR|AJUSTAR|INSTALAR|DESMONTAR|MONTAR|VERIFICAR|REGULAR|ALINHAR|BALANCEAR|CALIBRAR|DIAGNOSTICAR';
const STATUS = 'Em\\s+orçamento|Pendente|Aprovado|Reprovado';
const NUM_BR = '\\d{1,3}(?:\\.\\d{3})*,\\d{2}';

export function extractItensOrcamento(cleanText: string) {
  // Isola seção de itens entre "Itens" e "Subtotais/Totais"
  const secMatch = cleanText.match(/\bItens\b([\s\S]+?)(?:\bSubtotais\b|\bTotais\b)/i);
  const itensText = secMatch?.[1] ?? "";

  if (!itensText) {
    console.log("[Parser] Seção de itens não encontrada no texto.");
    return [];
  }

  console.log("[Parser] Seção de itens:", itensText.substring(0, 2000));

  // Estratégia 1: código(8dig) + grupo(letras coladas) + descrição + ação + status + 5 valores
  const items = estrategia1(itensText);
  if (items.length > 0) return items;

  // Estratégia 2: código(8dig) + qualquer texto + 5 valores numéricos BR
  const items2 = estrategia2(itensText);
  if (items2.length > 0) return items2;

  // Estratégia 3: sem código, apenas linhas com 5+ valores numéricos
  return estrategia3(itensText);
}

function estrategia1(text: string) {
  const regex = new RegExp(
    `(\\d{8})([A-ZÀ-Ú]+)(.*?)\\s+(?:${ACOES})\\s+(?:${STATUS})\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})\\s+(${NUM_BR})`,
    'gi'
  );

  const items: any[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    items.push(buildItem(m[1], `${m[2]} ${m[3]}`, m[4], m[5], m[6], m[7], m[8]));
  }

  if (items.length > 0) console.log(`[Parser] Estratégia 1: ${items.length} itens`);
  return items;
}

function estrategia2(text: string) {
  const codes = [...text.matchAll(/(\d{8})/g)];
  const items: any[] = [];

  for (const codeMatch of codes) {
    const afterCode = text.substring(codeMatch.index! + 8);
    const nums = [...afterCode.matchAll(new RegExp(`(${NUM_BR})`, 'g'))];
    if (nums.length >= 5) {
      const firstNumPos = nums[0].index!;
      const desc = afterCode.substring(0, firstNumPos)
        .replace(/\s+/g, ' ')
        .replace(new RegExp(`\\b(?:${ACOES}|${STATUS.replace(/\\\\/g, '\\')})\\b`, 'gi'), '')
        .trim();

      items.push(buildItem(codeMatch[1], desc, nums[0][1], nums[1][1], nums[2][1], nums[3][1], nums[4][1]));
    }
  }

  if (items.length > 0) console.log(`[Parser] Estratégia 2: ${items.length} itens`);
  return items;
}

function estrategia3(text: string) {
  // Linhas com pelo menos 5 valores numéricos BR consecutivos
  const numRegex = new RegExp(`(${NUM_BR})`, 'g');
  const lines = text.split(/(?=\d{1,3}(?:\.\d{3})*,\d{2})/);
  const items: any[] = [];

  // Tenta agrupar blocos de 5 valores
  const allNums = [...text.matchAll(new RegExp(`(${NUM_BR})`, 'g'))];
  for (let i = 0; i + 4 < allNums.length; i += 5) {
    const startPos = allNums[i].index!;
    const precedingText = text.substring(Math.max(0, startPos - 200), startPos).trim();
    // Pega as últimas palavras como descrição
    const descWords = precedingText.split(/\s+/).slice(-10).join(' ');

    items.push(buildItem(
      '', descWords,
      allNums[i][1], allNums[i + 1][1], allNums[i + 2][1], allNums[i + 3][1], allNums[i + 4][1]
    ));
  }

  if (items.length > 0) console.log(`[Parser] Estratégia 3: ${items.length} itens`);
  return items;
}

function buildItem(
  codigo: string, descricao: string,
  qtdPecaStr: string, valorPecaTotalStr: string,
  qtdMOStr: string, valorMOTotalStr: string,
  valorTotalStr: string
) {
  const qtdPeca = parseDecimal(qtdPecaStr);
  const valorPecaTotal = parseDecimal(valorPecaTotalStr);
  const qtdMO = parseDecimal(qtdMOStr);
  const valorMOTotal = parseDecimal(valorMOTotalStr);

  return {
    id: crypto.randomUUID(),
    codigo,
    descricao: descricao.replace(/\s+/g, ' ').trim(),
    qtdPeca,
    valorPeca: qtdPeca > 0 ? valorPecaTotal / qtdPeca : valorPecaTotal,
    qtdMaoObra: qtdMO,
    valorMaoObra: qtdMO > 0 ? valorMOTotal / qtdMO : valorMOTotal,
    valorTotal: parseDecimal(valorTotalStr),
    status: 'pendente' as const,
    justificativa: ''
  };
}
