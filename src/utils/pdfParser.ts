import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

export function parseOSData(text: string) {
  // Esta função tenta encontrar padrões comuns em OS de frotas (Ticket Log/Edenred)
  // Baseado no modelo fornecido
  
  const data: any = {
    dadosCliente: {},
    dadosVeiculo: {},
    dadosOficina: {},
    itens: []
  };

  // Extração de campos básicos usando Regex
  const osMatch = text.match(/Ordem de Serviço[:\s]+(\d+)/i);
  if (osMatch) data.ordemServico = osMatch[1];

  const placaMatch = text.match(/Placa[:\s]+([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
  if (placaMatch) data.dadosVeiculo.placa = placaMatch[1];

  const veiculoMatch = text.match(/Veículo[:\s]+([^|]+)/i);
  if (veiculoMatch) data.dadosVeiculo.marcaModelo = veiculoMatch[1].trim();

  const empresaMatch = text.match(/Empresa[:\s]+([^|]+)/i);
  if (empresaMatch) data.dadosCliente.empresa = empresaMatch[1].trim();

  const oficinaMatch = text.match(/Oficina[:\s]+([^|]+)/i);
  if (oficinaMatch) data.dadosOficina.nome = oficinaMatch[1].trim();

  // Lógica simplificada para itens (geralmente em tabelas)
  // Procura por padrões de código e descrição
  const itemRegex = /(\d{8})\s+([A-Z\s-]+)\s+(\d+)\s+([\d,.]+)\s+(\d+)\s+([\d,.]+)/g;
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    data.itens.push({
      id: crypto.randomUUID(),
      codigo: match[1],
      descricao: match[2].trim(),
      qtdPeca: parseInt(match[3]),
      valorPeca: parseFloat(match[4].replace(',', '.')),
      qtdMaoObra: parseInt(match[5]),
      valorMaoObra: parseFloat(match[6].replace(',', '.')),
      valorTotal: (parseInt(match[3]) * parseFloat(match[4].replace(',', '.'))) + (parseInt(match[5]) * parseFloat(match[6].replace(',', '.'))),
      status: 'pendente',
      justificativa: ''
    });
  }

  return data;
}