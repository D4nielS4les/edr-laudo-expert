import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LaudoPericial } from "@/types/laudo";


const NAVY: [number, number, number] = [27, 42, 74];    // #1B2A4A
const BLUE: [number, number, number] = [51, 102, 153];  // accent
const WHITE = [255, 255, 255] as const;
const GRAY = [100, 100, 100] as const;
const LIGHT_BG = [240, 243, 248] as const;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

function addHeader(doc: jsPDF, pageNum: number) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 18, "F");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text("EDR", MARGIN, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("INSPEÇÕES E REGULAÇÕES DE SINISTROS", MARGIN + 14, 12);
}

function addFooter(doc: jsPDF, pageNum: number) {
  const y = PAGE_H - 12;
  doc.setFillColor(...NAVY);
  doc.rect(0, y - 4, PAGE_W, 20, "F");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text("(81) 3334-1313", MARGIN, y + 2);
  doc.text(`${pageNum}`, PAGE_W / 2, y + 2, { align: "center" });
  doc.text("edr@edr.com.br", PAGE_W - MARGIN - 40, y + 2);
  doc.text("Rua Lopes de Carvalho Nº 101 - Madalena - Recife – PE", PAGE_W / 2, y + 7, { align: "center" });
}

function newPage(doc: jsPDF, pageNum: number): number {
  doc.addPage();
  pageNum++;
  addHeader(doc, pageNum);
  addFooter(doc, pageNum);
  return pageNum;
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CONTENT_W, 8, "F");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(title, MARGIN + 4, y + 5.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  return y + 14;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize = 10): number {
  if (!text) return y;
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  const lineHeight = fontSize * 0.45;
  for (const line of lines) {
    if (y > PAGE_H - 30) return y; // caller should handle page breaks
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y + 2;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toLocaleDateString("pt-BR");
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function loadLogoBase64(): Promise<string> {
  const res = await fetch(edrLogoUrl);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function generateLaudoPDF(laudo: LaudoPericial) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let pageNum = 1;

  // Load logo
  let logoBase64: string | null = null;
  try {
    logoBase64 = await loadLogoBase64();
  } catch { /* fallback to text */ }

  // ===== COVER PAGE =====
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // White box in center
  const boxX = 25, boxY = 50, boxW = 160, boxH = 180;
  doc.setFillColor(...WHITE);
  doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, "F");

  // Top accent line
  doc.setFillColor(...BLUE);
  doc.rect(boxX, boxY, boxW, 4, "F");

  // Logo image or text fallback
  if (logoBase64) {
    const logoW = 60;
    const logoH = logoW * (512 / 800); // maintain aspect ratio
    doc.addImage(logoBase64, "PNG", PAGE_W / 2 - logoW / 2, boxY + 8, logoW, logoH);
  } else {
    doc.setFontSize(28);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.text("EDR", PAGE_W / 2, boxY + 25, { align: "center" });
  }
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("INSPEÇÕES E REGULAÇÕES DE SINISTROS", PAGE_W / 2, boxY + 33, { align: "center" });

  // Divider
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.line(boxX + 20, boxY + 40, boxX + boxW - 20, boxY + 40);

  // Title
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text("Parecer Técnico: Automotivo", PAGE_W / 2, boxY + 55, { align: "center" });

  // Info fields
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const infoY = boxY + 72;
  const infoLines = [
    ["Empresa:", laudo.dadosCliente.empresa],
    ["Análise:", "Inspeção Técnica / Validação orçamento"],
    ["Veículo:", `${laudo.dadosVeiculo.marcaModelo} Ano ${laudo.dadosVeiculo.anoFabricacao}/${laudo.dadosVeiculo.anoModelo}`],
    ["Placa:", laudo.dadosVeiculo.placa],
    ["Solicitante:", laudo.dadosCliente.solicitante],
    ["Cliente:", laudo.dadosCliente.clienteFinal],
    ["O.S.:", laudo.ordemServico],
    ["Data:", formatDate(laudo.dataLaudo)],
  ];
  infoLines.forEach(([label, value], i) => {
    const ly = infoY + i * 10;
    doc.setFont("helvetica", "bold");
    doc.text(label, boxX + 20, ly);
    doc.setFont("helvetica", "normal");
    doc.text(value || "—", boxX + 55, ly);
  });

  // Bottom contact
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text("(81) 3334-1313  |  edr@edr.com.br  |  Rua Lopes de Carvalho Nº 101 - Madalena - Recife – PE", PAGE_W / 2, PAGE_H - 15, { align: "center" });

  // ===== PAGE 2: SUMÁRIO =====
  pageNum = newPage(doc, pageNum);
  let y = 28;

  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text("LAUDO PERICIAL AUTOMOTIVO", PAGE_W / 2, y, { align: "center" });
  y += 12;

  y = sectionTitle(doc, "Sumário", y);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");

  const summaryItems = [
    "Informações Gerais do Processo",
    "Objetivo de Perícia",
    "Descrição do Evento",
    "Identificação e Aspecto Geral do Veículo",
    "Registro Fotográfico do Veículo",
    "Análise do Orçamento e Justificativas Técnicas",
    "Causa Raiz da Intercorrência",
    "Histórico de Manutenção",
    "Conclusões e Recomendações",
  ];
  summaryItems.forEach((item, i) => {
    const dotFill = ".".repeat(80 - item.length);
    doc.text(`• ${item} ${dotFill}`, MARGIN + 4, y);
    y += 7;
  });

  // ===== PAGE 3: INFORMAÇÕES GERAIS + OBJETIVO + DESCRIÇÃO =====
  pageNum = newPage(doc, pageNum);
  y = 28;

  y = sectionTitle(doc, "Informações Gerais do Processo", y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Analista", "Vistoriador", "Resp. Técnico"]],
    body: [
      [
        laudo.dadosProcesso.analista || "—",
        laudo.dadosProcesso.vistoriador || "—",
        `${laudo.dadosProcesso.respTecnico || "—"}\n${laudo.dadosProcesso.cargoRespTecnico || ""}`,
      ],
    ],
    headStyles: { fillColor: NAVY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    theme: "grid",
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  y = sectionTitle(doc, "Objetivo de Perícia", y);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  y = addWrappedText(
    doc,
    "A motivação do presente Laudo é a de levantar informações que possam esclarecer se o orçamento apresentado pela oficina está em conformidade com os danos apresentados no veículo. Conforme análise do caso e dos indícios apresentados, consideramos alguns pontos que contribuirão para a solução da demanda proposta.",
    MARGIN, y, CONTENT_W
  );
  y += 6;

  y = sectionTitle(doc, "Descrição do Evento", y);
  const descEvento = `Atendendo à solicitação de diligência in loco para esclarecimento dos fatos quanto ao veículo ${laudo.dadosVeiculo.marcaModelo}, fabricação ${laudo.dadosVeiculo.anoFabricacao} ano ${laudo.dadosVeiculo.anoModelo}, de placa ${laudo.dadosVeiculo.placa}, Chassi: ${laudo.dadosVeiculo.chassi}, para verificação dos serviços mediante ordem em anexo nº ${laudo.ordemServico}.`;
  y = addWrappedText(doc, descEvento, MARGIN, y, CONTENT_W);

  if (laudo.analise.relatoMotorista) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Relato do Motorista:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    y = addWrappedText(doc, laudo.analise.relatoMotorista, MARGIN, y, CONTENT_W);
  }

  // ===== PAGE 4: IDENTIFICAÇÃO DO VEÍCULO =====
  pageNum = newPage(doc, pageNum);
  y = 28;

  y = sectionTitle(doc, "Identificação e Aspecto Geral do Veículo", y);

  const oficinaText = `A vistoria se deu conforme visita feita na Oficina ${laudo.dadosOficina.nome}, situada na ${laudo.dadosOficina.endereco}, Bairro ${laudo.dadosOficina.bairro}, ${laudo.dadosOficina.cidade}. Na ocasião houve a identificação geral do veículo, onde foi inspecionado inicialmente o estado geral do veículo.`;
  y = addWrappedText(doc, oficinaText, MARGIN, y, CONTENT_W);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Dado", "Valor"]],
    body: [
      ["Marca/Modelo", laudo.dadosVeiculo.marcaModelo],
      ["Ano Fabricação/Modelo", `${laudo.dadosVeiculo.anoFabricacao}/${laudo.dadosVeiculo.anoModelo}`],
      ["Placa", laudo.dadosVeiculo.placa],
      ["Chassi", laudo.dadosVeiculo.chassi],
      ["Hodômetro", laudo.dadosVeiculo.hodometro],
    ],
    headStyles: { fillColor: NAVY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    theme: "grid",
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Oficina info table
  y = sectionTitle(doc, "Dados da Oficina", y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Dado", "Valor"]],
    body: [
      ["Nome", laudo.dadosOficina.nome],
      ["Endereço", `${laudo.dadosOficina.endereco}, ${laudo.dadosOficina.bairro}`],
      ["Cidade", laudo.dadosOficina.cidade],
      ["Telefone", laudo.dadosOficina.telefone],
      ["Responsável", laudo.dadosOficina.responsavel],
      ["CNPJ", laudo.dadosOficina.cnpj],
    ],
    headStyles: { fillColor: NAVY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    theme: "grid",
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
  });

  // ===== PHOTO PAGES =====
  if (laudo.fotos.length > 0) {
    pageNum = newPage(doc, pageNum);
    y = 28;
    y = sectionTitle(doc, "Registro Fotográfico do Veículo, em Oficina", y);

    const categorias = {
      geral: "Aspecto Geral",
      placa_chassi: "Placa / Chassi",
      hodometro: "Hodômetro",
      defeito: "Detalhes de Defeitos",
    };

    for (const foto of laudo.fotos) {
      if (y > PAGE_H - 90) {
        pageNum = newPage(doc, pageNum);
        y = 28;
      }

      try {
        const imgData = foto.preview;
        const catLabel = categorias[foto.categoria] || foto.categoria;

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...NAVY);
        doc.text(`${catLabel}${foto.descricao ? ` - ${foto.descricao}` : ""}`, MARGIN, y);
        y += 3;

        doc.addImage(imgData, "JPEG", MARGIN, y, 80, 60);
        y += 65;
      } catch {
        doc.setFontSize(8);
        doc.text("[Foto não disponível]", MARGIN, y);
        y += 10;
      }
    }
  }

  // ===== ANÁLISE DO ORÇAMENTO =====
  if (laudo.analise.itensOrcamento.length > 0) {
    pageNum = newPage(doc, pageNum);
    y = 28;
    y = sectionTitle(doc, "Análise do Orçamento e Justificativas Técnicas", y);

    const tableBody = laudo.analise.itensOrcamento.map((item, idx) => [
      String(idx + 1),
      item.codigo,
      item.descricao,
      String(item.qtdPeca),
      formatCurrency(item.valorPeca),
      String(item.qtdMaoObra),
      formatCurrency(item.valorMaoObra),
      formatCurrency(item.valorTotal),
      item.status === "aprovado" ? "Aprovado" : item.status === "reprovado" ? "Reprovado" : "Pendente",
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["#", "Cód.", "Descrição", "Qtd P.", "Vlr Peça", "Qtd MO", "Vlr MO", "Total", "Status"]],
      body: tableBody,
      headStyles: { fillColor: NAVY, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      theme: "grid",
      columnStyles: {
        0: { cellWidth: 8 },
        2: { cellWidth: 35 },
        8: { cellWidth: 18 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Totals
    const subtotalPecas = laudo.analise.itensOrcamento.reduce((s, i) => s + i.qtdPeca * i.valorPeca, 0);
    const subtotalMO = laudo.analise.itensOrcamento.reduce((s, i) => s + i.qtdMaoObra * i.valorMaoObra, 0);
    const total = subtotalPecas + subtotalMO;

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Subtotal Peças: ${formatCurrency(subtotalPecas)}    |    Subtotal M.O.: ${formatCurrency(subtotalMO)}`, MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(`Total Geral: ${formatCurrency(total)}`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    y += 10;

    // Justificativas por item
    for (const item of laudo.analise.itensOrcamento) {
      if (!item.justificativa) continue;
      if (y > PAGE_H - 40) {
        pageNum = newPage(doc, pageNum);
        y = 28;
      }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      doc.text(`Justificativa - ${item.descricao || item.codigo}:`, MARGIN, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      y = addWrappedText(doc, item.justificativa, MARGIN, y, CONTENT_W, 9);
      y += 4;
    }
  }

  // ===== CAUSA RAIZ =====
  if (laudo.analise.causaRaiz) {
    if (y > PAGE_H - 60) {
      pageNum = newPage(doc, pageNum);
      y = 28;
    }
    y = sectionTitle(doc, "Pontos Pertinentes Sobre a Causa Raiz da Intercorrência", y);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    y = addWrappedText(doc, laudo.analise.causaRaiz, MARGIN, y, CONTENT_W);
    y += 6;
  }

  // ===== HISTÓRICO DE MANUTENÇÃO =====
  if (laudo.analise.historicoManutencao) {
    if (y > PAGE_H - 60) {
      pageNum = newPage(doc, pageNum);
      y = 28;
    }
    y = sectionTitle(doc, "Considerações com Base no Histórico de Manutenção", y);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    y = addWrappedText(doc, laudo.analise.historicoManutencao, MARGIN, y, CONTENT_W);
    y += 6;
  }

  // ===== CONCLUSÕES =====
  pageNum = newPage(doc, pageNum);
  y = 28;

  y = sectionTitle(doc, "Conclusões", y);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  if (laudo.conclusao.parecerTecnico) {
    doc.setFont("helvetica", "bold");
    doc.text("Parecer Técnico:", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, laudo.conclusao.parecerTecnico, MARGIN, y, CONTENT_W);
    y += 6;
  }

  if (laudo.conclusao.recomendacoes) {
    if (y > PAGE_H - 60) {
      pageNum = newPage(doc, pageNum);
      y = 28;
    }
    y = sectionTitle(doc, "Recomendações Técnicas", y);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    y = addWrappedText(doc, laudo.conclusao.recomendacoes, MARGIN, y, CONTENT_W);
    y += 10;
  }

  // Signatures
  if (y > PAGE_H - 70) {
    pageNum = newPage(doc, pageNum);
    y = 28;
  }

  y += 10;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);

  // Left signature
  const sigY = y + 15;
  doc.line(MARGIN, sigY, MARGIN + 70, sigY);
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(laudo.conclusao.analistaVistoriador || "Analista Vistoriador", MARGIN, sigY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Analista Vistoriador", MARGIN, sigY + 9);

  // Right signature
  doc.line(PAGE_W - MARGIN - 70, sigY, PAGE_W - MARGIN, sigY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(laudo.conclusao.gestorOperacoes || "Gestor de Operações", PAGE_W - MARGIN - 70, sigY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Gestor de Operações EDR", PAGE_W - MARGIN - 70, sigY + 9);

  // Save
  const fileName = `Laudo_Pericial_${laudo.dadosVeiculo.placa || "SemPlaca"}_${laudo.dataLaudo || "sem_data"}.pdf`;
  doc.save(fileName);
}
