import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker usando um link de CDN mais estável e compatível
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Filtra apenas itens que possuem conteúdo de texto
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  console.log("Texto extraído do PDF:", fullText); // Para debug no console
  return fullText;
}

export function parseOSData(text: string) {
  const data: any = {
    dadosCliente: {},
    dadosVeiculo: {},
    dadosOficina: {},
    itens: []
  };

  // Regex mais flexíveis (ignoram espaços extras e variações de caixa)
  const findValue = (regex: RegExp) => {
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };

  data.ordemServico = findValue(/Ordem de Serviço[:\s]+(\d+)/i);
  data.dadosVeiculo.placa = findValue(/Placa[:\s]+([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
  data.dadosVeiculo.marcaModelo = findValue(/Veículo[:\s]+([^|]+)/i);
  data.dadosCliente.empresa = findValue(/Empresa[:\s]+([^|]+)/i);
  data.dadosOficina.nome = findValue(/Oficina[:\s]+([^|]+)/i);

  // Tenta capturar o ano se disponível (ex: 2015/2016)
  const anoMatch = text.match(/Ano[:\s]+(\d{4})\/(\d{4})/i);
  if (anoMatch) {
    data.dadosVeiculo.anoFabricacao = anoMatch[1];
    data.dadosVeiculo.anoModelo = anoMatch[2];
  }

  // Processamento de itens com Regex mais tolerante
  // Padrão: Código(8 dígitos) Descrição(Texto) Qtd Valor Qtd Valor
  const itemRegex = /(\d{8})\s+([A-Z0-9\s\-\.\/]+?)\s+(\d+)\s+([\d,.]+)\s+(\d+)\s+([\d,.]+)/gi;
  let match;
  
  while ((match = itemRegex.exec(text)) !== null) {
    const qtdPeca = parseInt(match[3]);
    const valorPeca = parseFloat(match[4].replace('.', '').replace(',', '.'));
    const qtdMO = parseInt(match[5]);
    const valorMO = parseFloat(match[6].replace('.', '').replace(',', '.'));

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

  return data;
}