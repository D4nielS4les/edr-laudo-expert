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
      // Preserva a ordem das linhas unindo os itens de texto
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    console.log("--- INÍCIO DO TEXTO EXTRAÍDO ---");
    console.log(fullText);
    console.log("--- FIM DO TEXTO EXTRAÍDO ---");

    return fullText;
  } catch (error) {
    console.error("Erro no PDF.js:", error);
    throw new Error("Falha ao processar o arquivo PDF. Verifique o console para detalhes.");
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

  // Limpeza básica do texto
  const cleanText = text.replace(/\s+/g, ' ');

  // Captura de campos principais com buscas mais amplas
  const osMatch = cleanText.match(/(?:Ordem de Serviço|OS|Nº OS)[:\s]+(\d+)/i);
  if (osMatch) data.ordemServico = osMatch[1];

  const placaMatch = cleanText.match(/(?:Placa)[:\s]+([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
  if (placaMatch) data.dadosVeiculo.placa = placaMatch[1];

  const chassiMatch = cleanText.match(/(?:Chassi)[:\s]+([A-Z0-9]{17})/i);
  if (chassiMatch) data.dadosVeiculo.chassi = chassiMatch[1];

  // Captura de Itens (Lógica de Tabela)
  // Padrão comum: Código(8) Descrição Qtd Valor Qtd Valor
  // Exemplo: 88331579 ROLAMENTO 1 150,00 1 80,00
  const itemRegex = /(\d{8})\s+([A-Z0-9\s\-\.\/]{3,60}?)\s+(\d+)\s+([\d,.]+)\s+(\d+)\s+([\d,.]+)/gi;
  let match;
  
  while ((match = itemRegex.exec(cleanText)) !== null) {
    const codigo = match[1];
    const descricao = match[2].trim();
    const qtdPeca = parseInt(match[3]);
    const valorPeca = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
    const qtdMO = parseInt(match[5]);
    const valorMO = parseFloat(match[6].replace(/\./g, '').replace(',', '.'));

    // Só adiciona se tiver pelo menos uma quantidade válida
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