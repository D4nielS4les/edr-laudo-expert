import type { ItemOrcamento, DadosCliente, DadosVeiculo, DadosOficina } from "@/types/laudo";

function getTagValue(xml: string, tag: string): string {
  // Try case-insensitive match with multiple patterns
  const patterns = [
    new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'),
    new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([^\\]]*?)\\]\\]>\\s*</${tag}>`, 'i'),
  ];
  for (const re of patterns) {
    const m = xml.match(re);
    if (m && m[1].trim()) return m[1].trim();
  }
  return '';
}

function getAllMatches(xml: string, tagOpen: string, tagClose: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<${tagOpen}[^>]*>([\\s\\S]*?)</${tagClose}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[0]);
  }
  return results;
}

function parseBRDecimal(val: string): number {
  if (!val) return 0;
  // Handle both 1.234,56 and 1234.56 formats
  const cleaned = val.replace(/\s/g, '');
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return parseFloat(cleaned) || 0;
}

function findField(xml: string, keywords: string[]): string {
  for (const kw of keywords) {
    const val = getTagValue(xml, kw);
    if (val) return val;
  }
  return '';
}

export function parseXMLOrcamento(xmlContent: string) {
  const ordemServico = findField(xmlContent, ['OrdemServico', 'OS', 'NumeroOS', 'numero_os', 'NrOS', 'ordem_servico', 'nOS']);

  const dadosCliente: Partial<DadosCliente> = {
    solicitante: findField(xmlContent, ['Solicitante', 'solicitante', 'Cliente', 'cliente', 'NomeCliente', 'nome_cliente', 'RazaoSocial', 'razao_social']),
    empresa: findField(xmlContent, ['Empresa', 'empresa', 'Seguradora', 'seguradora', 'Companhia', 'companhia']),
    clienteFinal: findField(xmlContent, ['ClienteFinal', 'cliente_final', 'Segurado', 'segurado', 'Proprietario', 'proprietario']),
  };

  const dadosVeiculo: Partial<DadosVeiculo> = {
    marcaModelo: findField(xmlContent, ['MarcaModelo', 'marca_modelo', 'Veiculo', 'veiculo', 'Modelo', 'modelo', 'Marca', 'marca']),
    anoFabricacao: findField(xmlContent, ['AnoFabricacao', 'ano_fabricacao', 'AnoFab', 'anoFab']),
    anoModelo: findField(xmlContent, ['AnoModelo', 'ano_modelo']),
    placa: findField(xmlContent, ['Placa', 'placa', 'PlacaVeiculo', 'placa_veiculo']),
    chassi: findField(xmlContent, ['Chassi', 'chassi', 'NumeroChassi', 'numero_chassi', 'VIN', 'vin']),
    hodometro: findField(xmlContent, ['Hodometro', 'hodometro', 'KM', 'km', 'Quilometragem', 'quilometragem']),
  };

  const dadosOficina: Partial<DadosOficina> = {
    nome: findField(xmlContent, ['Oficina', 'oficina', 'NomeOficina', 'nome_oficina', 'Prestador', 'prestador']),
    endereco: findField(xmlContent, ['Endereco', 'endereco', 'EnderecoOficina', 'endereco_oficina']),
    bairro: findField(xmlContent, ['Bairro', 'bairro']),
    cidade: findField(xmlContent, ['Cidade', 'cidade', 'Municipio', 'municipio']),
    telefone: findField(xmlContent, ['Telefone', 'telefone', 'TelefoneOficina', 'telefone_oficina', 'Fone', 'fone']),
    responsavel: findField(xmlContent, ['Responsavel', 'responsavel', 'ResponsavelOficina', 'responsavel_oficina']),
    cnpj: findField(xmlContent, ['CNPJ', 'cnpj', 'CnpjOficina', 'cnpj_oficina']),
  };

  // Extract items - try multiple common tag names for item containers
  const itemTags = ['Item', 'item', 'ItemOrcamento', 'item_orcamento', 'Peca', 'peca', 'Servico', 'servico', 'LinhaOrcamento', 'linha_orcamento'];
  let itemBlocks: string[] = [];
  
  for (const tag of itemTags) {
    itemBlocks = getAllMatches(xmlContent, tag, tag);
    if (itemBlocks.length > 0) break;
  }

  const itens: ItemOrcamento[] = itemBlocks.map((block) => {
    const codigo = findField(block, ['Codigo', 'codigo', 'CodigoPeca', 'codigo_peca', 'Referencia', 'referencia', 'Ref', 'ref', 'cod']);
    const descricao = findField(block, ['Descricao', 'descricao', 'DescricaoPeca', 'descricao_peca', 'Nome', 'nome', 'desc']);
    
    const qtdPecaRaw = findField(block, ['QtdPeca', 'qtd_peca', 'QuantidadePeca', 'quantidade_peca', 'QtdePeca', 'Quantidade', 'quantidade', 'Qtd', 'qtd']);
    const qtdPeca = qtdPecaRaw ? parseBRDecimal(qtdPecaRaw) : 1;
    const valorPeca = parseBRDecimal(findField(block, ['ValorPeca', 'valor_peca', 'PrecoPeca', 'preco_peca', 'ValorUnitPeca', 'valor_unit_peca']));
    const qtdMaoObra = parseBRDecimal(findField(block, ['QtdMaoObra', 'qtd_mao_obra', 'QuantidadeMO', 'quantidade_mo', 'QtdeMO', 'HorasMO', 'horas_mo'])) || 0;
    const valorMaoObra = parseBRDecimal(findField(block, ['ValorMaoObra', 'valor_mao_obra', 'PrecoMO', 'preco_mo', 'ValorUnitMO', 'valor_unit_mo']));
    
    let valorTotal = parseBRDecimal(findField(block, ['ValorTotal', 'valor_total', 'Total', 'total', 'Subtotal', 'subtotal']));
    
    if (!valorTotal) {
      valorTotal = (qtdPeca * valorPeca) + (qtdMaoObra * valorMaoObra);
    }

    return {
      id: crypto.randomUUID(),
      codigo,
      grupo: findField(block, ['Grupo', 'grupo', 'Categoria', 'categoria', 'TipoItem', 'tipo_item']),
      descricao,
      acao: findField(block, ['Acao', 'acao', 'Operacao', 'operacao', 'TipoServico', 'tipo_servico']),
      statusItem: findField(block, ['StatusItem', 'status_item', 'SituacaoItem', 'situacao_item']),
      qtdPeca,
      valorPeca,
      qtdMaoObra,
      valorMaoObra,
      valorTotal,
      impostos: {
        ipi: parseBRDecimal(findField(block, ['IPI', 'ipi', 'ValorIPI', 'valor_ipi'])),
        icms: parseBRDecimal(findField(block, ['ICMS', 'icms', 'ValorICMS', 'valor_icms'])),
      },
      justificativa: findField(block, ['Justificativa', 'justificativa', 'Observacao', 'observacao', 'Obs', 'obs']),
      status: 'pendente' as const,
    };
  });

  return { ordemServico, dadosCliente, dadosVeiculo, dadosOficina, itens };
}
