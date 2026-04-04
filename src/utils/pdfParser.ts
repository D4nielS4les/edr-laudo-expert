import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker usando a versão exata instalada para evitar conflitos
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: true,
      isEvalSupported: false,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("Erro no PDF.js:", error);
    throw new Error("Falha ao processar o arquivo PDF.");
  }
}

export function parseOSData(text: string) {
  const data: any = {
    ordemServico: "",
    dadosCliente: { solicitante: "", empresa: "", clienteFinal: "" },
    dadosVeiculo: { marcaModelo: "", anoFabricacao: "", anoModelo: "", placa: "", chassi: "", hodometro: "" },
    dadosOficina: { nome: "", endereco: "", bairro: "", cidade: "", telefone: "", responsavel: "", cnpj: "" },
    itens: []
  };

  const cleanText = text
    .replace(/[•●◆■◼◾▪▸▹►▶]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const extract = (regex: RegExp, source = cleanText) => {
    const match = source.match(regex);
    return match ? match[1].trim() : "";
  };

  const cleanField = (value: string) => value
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/[•●◆■◼◾▪▸▹►▶]+/g, ' ')
    .replace(/\s*(?:Taxa\(%\)|CEP|Fones?|Telefone|Responsável)(?=\b.*$).*$/i, '')
    .trim();

  const extractFromPatterns = (patterns: RegExp[], source = cleanText) => {
    for (const pattern of patterns) {
      const value = extract(pattern, source);
      if (value) return cleanField(value);
    }
    return "";
  };

  const extractCidadeUf = (source: string) => {
    const cidadeDireta = extractFromPatterns([
      /Cidade\s*\/\s*UF\s*[:\s-]+([^|]+?)(?=\s*(?:CEP|Fones?|Telefone|Responsável|Taxa|$))/i,
      /\bCidade\s*[:\s-]+([^|]+?)(?=\s*(?:CEP|Fones?|Telefone|Responsável|Taxa|$))/i,
    ], source);

    const stripLabel = (v: string) => v.replace(/^(?:Cidade\s*\/?\s*UF|Cidade|Bairro|CEP|Complemento)\s*/i, '').trim();

    if (cidadeDireta) {
      const cleaned = stripLabel(cidadeDireta);
      const cidadeComUf = cleaned.match(/([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)\s*-\s*([A-Z]{2})/i);
      if (cidadeComUf) {
        return cleanField(`${cidadeComUf[1].trim()} - ${cidadeComUf[2]}`);
      }
    }

    const cidadePorTrecho = source.match(/(?:Bairro|Cidade\s*\/\s*UF|Cidade|CEP|Taxa\(%\)|Complemento)\s*[:\s-]*.*?\b([A-ZÀ-Ú][A-ZÀ-Ú\s]+\s*-\s*[A-Z]{2})\b/i);
    if (cidadePorTrecho) {
      return cleanField(stripLabel(cidadePorTrecho[1]));
    }

    const cidadeGenerica = source.match(/\b([A-ZÀ-Ú][A-ZÀ-Ú\s]{2,}\s*-\s*[A-Z]{2})\b/i);
    if (cidadeGenerica) {
      return cleanField(stripLabel(cidadeGenerica[1]));
    }
    return "";
  };

  // --- CAPTURA DE DADOS GERAIS ---
  data.ordemServico = extract(/(?:Ordem de Serviço|OS|Nº OS)[:\s]+(\d+)/i);
  
  // Dados do Cliente - Ajustado para o padrão "Cliente - ID: NOME - DEPARTAMENTO"
  const clienteMatch = cleanText.match(/Cliente.*?:\s*([^-\n]+?)\s*-/i);
  if (clienteMatch) {
    data.dadosCliente.clienteFinal = clienteMatch[1].trim();
  } else {
    data.dadosCliente.clienteFinal = extract(/(?:Cliente|Cliente Final)[:\s]+([^|]+?)(?=\s(?:Solicitante|Empresa|Veículo|$))/i);
  }

  // Solicitante: Agora para antes de "Relato" ou "Quilometragem"
  data.dadosCliente.solicitante = extract(/(?:Solicitante|Usuário)[:\s]+(.*?)(?=\s(?:Relato|Quilometragem|Empresa|Cliente|Placa|Veículo|Data|CPF|CNPJ|$))/i);
  
  data.dadosCliente.empresa = extract(/(?:Empresa)[:\s]+([^|]+?)(?=\s(?:Cliente|Solicitante|Placa|$))/i);

  // Dados do Veículo
  data.dadosVeiculo.placa = extract(/(?:Placa)[:\s]+([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
  data.dadosVeiculo.chassi = extract(/(?:Chassi)[:\s]+([A-Z0-9]{17})/i);
  
  // Marca/Modelo: Busca o padrão "Veículo: PLACA - MODELO" e extrai apenas o MODELO
  const modeloMatch = cleanText.match(/(?:Veículo|Modelo)[:\s]+[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\s*-\s*([^|]+?)(?=\s(?:Consulta|Ano|Placa|Chassi|$))/i);
  if (modeloMatch) {
    data.dadosVeiculo.marcaModelo = modeloMatch[1].trim();
  } else {
    data.dadosVeiculo.marcaModelo = extract(/(?:Veículo|Modelo|Marca\/Modelo)[:\s]+([^|]+?)(?=\s(?:Ano|Placa|Chassi|$))/i);
  }
  
  // Hodômetro: Captura o valor numérico após "Quilometragem Informada no AutoAgendamento" ou similares
  data.dadosVeiculo.hodometro = extract(/(?:Quilometragem|Km|Quilometragem Informada|Hodômetro).*?[:\s]+([\d.]+)/i);

  const anoMatch = cleanText.match(/(?:Ano|Ano Fab\/Mod)[:\s]+(\d{4})(?:\/(\d{4}))?/i);
  if (anoMatch) {
    data.dadosVeiculo.anoFabricacao = anoMatch[1];
    data.dadosVeiculo.anoModelo = anoMatch[2] || anoMatch[1];
  }

  // Dados da Oficina
  const oficinaSection = extract(/(?:Estabelecimento)(.*)$/i, cleanText) || cleanText;

  data.dadosOficina.nome = extractFromPatterns([
    /(?:Estabelecimento\s+)?Nome[:\s]+([^\n|]+?)(?=\s*(?:CNPJ|Logradouro|Endereço|Bairro|Cidade|Fones?|Telefone|Responsável|$))/i,
  ], oficinaSection);

  data.dadosOficina.cnpj = extractFromPatterns([
    /(?:CNPJ)[:\s]+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i,
  ], oficinaSection);

  data.dadosOficina.endereco = extractFromPatterns([
    /(?:Logradouro\/Número|Logradouro|Endereço)[:\s]+([^\n|]+?)(?=\s*(?:Complemento|Bairro|Cidade|CEP|Fones?|Telefone|CNPJ|Responsável|$))/i,
  ], oficinaSection);

  data.dadosOficina.bairro = extractFromPatterns([
    /(?:Bairro)[:\s]+([^\n|]+?)(?=\s*(?:Cidade\s*\/\s*UF|Cidade|CEP|Fones?|Telefone|UF|Responsável|Taxa\(%\)|$))/i,
  ], oficinaSection);

  const cidadeBase = extractCidadeUf(oficinaSection) || extractCidadeUf(cleanText);
  const uf = extractFromPatterns([/(?:UF|Estado)[:\s]+([A-Z]{2})/i], oficinaSection) || extractFromPatterns([/(?:UF|Estado)[:\s]+([A-Z]{2})/i], cleanText);
  data.dadosOficina.cidade = cidadeBase && uf && !cidadeBase.includes(' - ') ? `${cidadeBase} - ${uf}` : cidadeBase;

  data.dadosOficina.telefone = extractFromPatterns([
    /(?:Fones?|Telefone)[:\s]+([\d\(\)\s\-]+)/i,
  ], oficinaSection);

  data.dadosOficina.responsavel = extractFromPatterns([
    /(?:Responsável pelo Orçamento|Responsável)[:\s]+([^\n|]+?)(?=\s*(?:Data|Fones?|Telefone|CNPJ|$))/i,
  ], oficinaSection);

  // --- CAPTURA DE ITENS DO ORÇAMENTO ---
  const itensSectionMatch = cleanText.match(
    /Itens\s+Código\s+Grupo\s+de\s+Peça\s+Peça\s+Mão\s+de\s+Obra\s+Status\s+Peça\s+Qtd\s+Valor\s+Mão\s+de\s+Obra\s+Qtd\s+Valor\s+Valor\s+Total\s+(.+?)(?=\s+Subtotais\b|\s+Totais\b|\s+Total\b|$)/i,
  );

  const itensText = itensSectionMatch?.[1] ?? "";
  const parseDecimal = (value: string) => parseFloat(value.replace(/\./g, "").replace(",", "."));

  if (itensText) {
    const itemRowRegex = /(\d{8})\s+(.+?)\s+(SUBSTITUIR|REPARAR|TROCAR|REVISAR|AJUSTAR|INSTALAR|DESMONTAR|MONTAR|VERIFICAR|REGULAR)\s+(Em\s+orçamento|Pendente|Aprovado|Reprovado)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/gi;
    let itemMatch: RegExpExecArray | null;

    while ((itemMatch = itemRowRegex.exec(itensText)) !== null) {
      const codigo = itemMatch[1];
      const descricao = itemMatch[2].replace(/\s+/g, " ").trim();
      const qtdPeca = parseDecimal(itemMatch[5]);
      const valorPeca = parseDecimal(itemMatch[6]);
      const qtdMaoObra = parseDecimal(itemMatch[7]);
      const valorMaoObra = parseDecimal(itemMatch[8]);
      const valorTotal = parseDecimal(itemMatch[9]);

      data.itens.push({
        id: crypto.randomUUID(),
        codigo,
        descricao,
        qtdPeca: isNaN(qtdPeca) ? 0 : qtdPeca,
        valorPeca: isNaN(valorPeca) ? 0 : valorPeca,
        qtdMaoObra: isNaN(qtdMaoObra) ? 0 : qtdMaoObra,
        valorMaoObra: isNaN(valorMaoObra) ? 0 : valorMaoObra,
        valorTotal: isNaN(valorTotal) ? 0 : valorTotal,
        status: 'pendente',
        justificativa: ''
      });
    }
  }

  return data;
}
