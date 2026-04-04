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

  const cleanText = text.replace(/\s+/g, ' ');

  const extract = (regex: RegExp, source = cleanText) => {
    const match = source.match(regex);
    return match ? match[1].trim() : "";
  };

  const cleanField = (value: string) => value.replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();

  const extractFromPatterns = (patterns: RegExp[], source = cleanText) => {
    for (const pattern of patterns) {
      const value = extract(pattern, source);
      if (value) return cleanField(value);
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
    /(?:Bairro)[:\s]+([^\n|]+?)(?=\s*(?:Cidade|CEP|Fones?|Telefone|UF|Responsável|$))/i,
  ], oficinaSection);

  const cidadeBase = extractFromPatterns([
    /(?:\bCidade)\s*[:\-]\s*([^\n|]+?)(?=\s*(?:UF|CEP|Fones?|Telefone|Responsável|$))/i,
  ], oficinaSection);
  const uf = extractFromPatterns([/(?:UF|Estado)[:\s]+([A-Z]{2})/i], oficinaSection);
  data.dadosOficina.cidade = cidadeBase && uf && !cidadeBase.includes(' - ') ? `${cidadeBase} - ${uf}` : cidadeBase;

  data.dadosOficina.telefone = extractFromPatterns([
    /(?:Fones?|Telefone)[:\s]+([\d\(\)\s\-]+)/i,
  ], oficinaSection);

  data.dadosOficina.responsavel = extractFromPatterns([
    /(?:Responsável pelo Orçamento|Responsável)[:\s]+([^\n|]+?)(?=\s*(?:Data|Fones?|Telefone|CNPJ|$))/i,
  ], oficinaSection);

  // --- CAPTURA DE ITENS DO ORÇAMENTO ---
  const itemRegex = /(\d{8})\s+([A-Z0-9\s\-\.\/]{3,60}?)\s+(\d+)\s+([\d,.]+)\s+(\d+)\s+([\d,.]+)/gi;
  let match;
  
  while ((match = itemRegex.exec(cleanText)) !== null) {
    const codigo = match[1];
    const descricao = match[2].trim();
    const qtdPeca = parseInt(match[3]);
    const valorPeca = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
    const qtdMO = parseInt(match[5]);
    const valorMO = parseFloat(match[6].replace(/\./g, '').replace(',', '.'));

    if (!isNaN(qtdPeca) || !isNaN(qtdMO)) {
      data.itens.push({
        id: crypto.randomUUID(),
        codigo,
        descricao,
        qtdPeca: isNaN(qtdPeca) ? 0 : qtdPeca,
        valorPeca: isNaN(valorPeca) ? 0 : valorPeca,
        qtdMaoObra: isNaN(qtdMO) ? 0 : qtdMO,
        valorMaoObra: isNaN(valorMO) ? 0 : valorMO,
        valorTotal: (isNaN(qtdPeca) ? 0 : qtdPeca * (isNaN(valorPeca) ? 0 : valorPeca)) + 
                    (isNaN(qtdMO) ? 0 : qtdMO * (isNaN(valorMO) ? 0 : valorMO)),
        status: 'pendente',
        justificativa: ''
      });
    }
  }

  return data;
}