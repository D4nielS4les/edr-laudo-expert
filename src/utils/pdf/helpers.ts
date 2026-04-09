/**
 * Utilitários genéricos para extração baseada em palavras-chave.
 */

export function cleanRawText(text: string): string {
  return text
    .replace(/[•●◆■◼◾▪▸▹►▶]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Tenta cada regex na lista e retorna o primeiro grupo capturado, ou "". */
export function extractFirst(patterns: RegExp[], source: string): string {
  for (const p of patterns) {
    const m = source.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

/** Limpa rótulos residuais de um campo extraído. */
export function cleanField(value: string): string {
  return value
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/[•●◆■◼◾▪▸▹►▶]+/g, ' ')
    .trim();
}

/** Converte string numérica BR (1.234,56) para number. */
export function parseDecimal(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\s/g, '');
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return parseFloat(cleaned) || 0;
}

/**
 * Busca genérica por linha: procura uma linha que contenha o keyword,
 * e retorna o valor após o keyword (separado por : ou espaço).
 * Opera linha a linha para evitar matches cruzados.
 */
export function scanForKeyword(text: string, keywords: string[]): string {
  const lines = text.split('\n');
  
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    
    for (const line of lines) {
      const lineLower = line.toLowerCase();
      const idx = lineLower.indexOf(kwLower);
      if (idx === -1) continue;
      
      // Pega tudo após o keyword na mesma linha
      let after = line.substring(idx + kw.length).trim();
      
      // Remove separadores iniciais (: = -)
      after = after.replace(/^[\s:=\-–]+/, '').trim();
      
      if (after.length > 0 && after.length < 200) {
        return cleanField(after);
      }
    }
  }
  return '';
}
