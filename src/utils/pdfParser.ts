import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker usando unpkg que é mais resiliente para versões específicas
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
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

    if (!fullText.trim()) {
      throw new Error("O PDF parece estar vazio ou é uma imagem (OCR necessário).");
    }

    return fullText;
  } catch (error) {
    console.error("Erro detalhado no PDF.js:", error);
    throw error;
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

  // Função auxiliar para busca flexível
  const extract = (regex: RegExp) => {
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };

  // Mapeamento de campos baseado no modelo Ticket Log / Edenred
  data.ordemServico = extract(/Ordem de Serviço[:\s]+(\d+)/i) || extract(/OS[:\s]+(\d+)/i);
  data.dadosVeiculo.placa = extract(/Placa[:\s]+([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
  data.dadosVeiculo.marcaModelo = extract(/Veículo[:\s]+([^|]+)/i) || extract(/Modelo[:\s]+([^|]+)/i);
  data.dadosCliente.empresa = extract(/Empresa[:\s]+([^|]+)/i) || extract(/Cliente[:\s]+([^|]+)/i);
  data.dadosOficina.nome = extract(/Oficina[:\s]+([^|]+)/i) || extract(/Estabelecimento[:\s]+([^|]+)/i);
  
  // Tenta capturar o ano (ex: 2015/2016)
  const anoMatch = text.match(/Ano[:\s]+(\d{4})\/(\d{4})/i);
  if (anoMatch) {
    data.dadosVeiculo.anoFabricacao = anoMatch[1];
    data.dadosVeiculo.anoModelo = anoMatch[2];
  }

  // Captura de itens do orçamento
  // Padrão: Código(8) Descrição Qtd VlrPeca QtdMO VlrMO
  // Ex: 88331579 ROLAMENTO 1 150,00 1 80,00
  const itemRegex = /(\d{8})\s+([A-Z0-9\s\-\.\/]{5,50}?)\s+(\d+)\s+([\d,.]+)\s+(\d+)\s+([\d,.]+)/gi;
  let match;
  
  while ((match = itemRegex.exec(text)) !== null) {
    const qtdPeca = parseInt(match[3]);
    const valorPeca = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
    const qtdMO = parseInt(match[5]);
    const valorMO = parseFloat(match[6].replace(/\./g, '').replace(',', '.'));

    if (!isNaN(qtdPeca) || !isNaN(qtdMO)) {
      data.itens.push({
        id: crypto.randomUUID(),
        codigo: match[1],
        descricao: match[2].trim(),
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