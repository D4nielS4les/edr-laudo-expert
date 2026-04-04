/**
 * Utilitários genéricos para extração baseada em palavras-chave.
 * Cada campo tenta múltiplos padrões regex em ordem de prioridade.
 */

export function cleanRawText(text: string): string {
  return text
    .replace(/[•●◆■◼◾▪▸▹►▶]/g, ' ')
    .replace(/\s+/g, ' ')
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
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/[•●◆■◼◾▪▸▹►▶]+/g, ' ')
    .replace(/\s*(?:Taxa\(%\)|CEP|Fones?|Telefone|Responsável)(?=\b.*$).*$/i, '')
    .trim();
}

/** Converte string numérica BR (1.234,56) para number. */
export function parseDecimal(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", "."));
}
