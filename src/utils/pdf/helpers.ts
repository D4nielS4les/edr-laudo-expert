/**
 * Utilitários genéricos para extração baseada em palavras-chave.
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
 * Busca genérica: dado um array de labels, procura "label: valor" ou "label valor"
 * no texto e retorna o primeiro match encontrado.
 * Captura tudo após o label até encontrar outro label conhecido ou fim de linha.
 */
export function scanForKeyword(text: string, keywords: string[], stopWords: string[] = []): string {
  const defaultStops = [
    'Placa', 'Chassi', 'Modelo', 'Marca', 'Ano', 'Veículo', 'Veiculo',
    'Cliente', 'Solicitante', 'Empresa', 'Razão Social', 'CNPJ', 'CPF',
    'Endereço', 'Endereco', 'Bairro', 'Cidade', 'Município', 'Municipio',
    'Telefone', 'Fone', 'Celular', 'Email', 'E-mail',
    'Oficina', 'Estabelecimento', 'Prestador', 'Responsável', 'Responsavel',
    'Ordem de Serviço', 'OS', 'Data', 'Hodômetro', 'Hodometro', 'Quilometragem', 'KM',
    'Seguradora', 'Segurado', 'Proprietário', 'Proprietario',
    'Observação', 'Observacao', 'Relato', 'Itens', 'Total', 'Subtotal',
    'Complemento', 'CEP', 'UF', 'Estado', 'Logradouro', 'Número', 'Numero',
    'Peça', 'Peca', 'Serviço', 'Servico', 'Quantidade', 'Valor',
    'Marca/Modelo', 'Ano Fab', 'Ano Mod', 'VIN',
    ...stopWords,
  ];
  
  const stopPattern = defaultStops
    .filter(s => s.length > 1)
    .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  for (const kw of keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Tenta "Keyword: valor" e "Keyword valor"
    const patterns = [
      new RegExp(`(?:${escaped})\\s*[:=]\\s*(.+?)(?=\\s*(?:${stopPattern})\\s*[:\\s=]|$)`, 'i'),
      new RegExp(`(?:${escaped})\\s+([^\\n]+?)(?=\\s*(?:${stopPattern})\\s*[:\\s=]|$)`, 'i'),
    ];
    
    for (const re of patterns) {
      const m = text.match(re);
      if (m?.[1]) {
        const val = cleanField(m[1]);
        // Ignora valores muito curtos ou que são apenas números/pontuação
        if (val.length > 0 && val.length < 200) return val;
      }
    }
  }
  return '';
}
