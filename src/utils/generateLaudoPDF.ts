import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LaudoPericial, ItemOrcamento } from "@/types/laudo";
import { isPeca } from "@/utils/itemTipo";
import { supabase } from "@/integrations/supabase/client";

import edrLogoUrl from "@/assets/edr-logo.png";
import robotoRegularUrl from "@/assets/fonts/Roboto-Regular.ttf?url";
import robotoBoldUrl from "@/assets/fonts/Roboto-Bold.ttf?url";

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
  doc.setFont("Roboto", "bold");
  doc.text("EDR", MARGIN, 12);
  doc.setFont("Roboto", "normal");
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
  doc.setFont("Roboto", "bold");
  doc.text(title, MARGIN + 4, y + 5.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont("Roboto", "normal");
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function loadImageBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar imagem (${res.status})`);
  const blob = await res.blob();
  if (blob.type && !blob.type.startsWith("image/")) throw new Error("Conteúdo não é uma imagem");
  return blobToDataUrl(blob);
}

async function loadStoredPhoto(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("laudo-fotos").download(path);
  if (error || !data) throw error ?? new Error("Foto não encontrada no armazenamento");
  return blobToDataUrl(data);
}

/** Pré-carrega todas as fotos (vistoria, itens e grupos) como Data URL. */
async function buildPhotoCache(laudo: LaudoPericial): Promise<Map<string, string>> {
  const cache = new Map<string, string>();

  await Promise.all(
    (laudo.fotos ?? []).map(async (foto) => {
      try {
        if (foto.file) cache.set(foto.id, await blobToDataUrl(foto.file));
        else if (foto.path) cache.set(foto.id, await loadStoredPhoto(foto.path));
        else if (foto.preview?.startsWith("data:")) cache.set(foto.id, foto.preview);
        else if (foto.preview) cache.set(foto.id, await loadImageBase64(foto.preview));
      } catch (e) {
        console.warn("Foto de vistoria não pôde ser carregada para o PDF", e);
      }
    })
  );

  const extras = [
    ...laudo.analise.itensOrcamento.flatMap(i => i.fotos ?? []),
    ...(laudo.analise.gruposAnalise ?? []).flatMap(g => g.fotos ?? []),
  ];
  await Promise.all(
    extras.map(async (foto) => {
      const raw = foto.dataUrl;
      if (!raw) return;
      try {
        cache.set(foto.id, raw.startsWith("data:") ? raw : await loadImageBase64(raw));
      } catch (e) {
        console.warn("Foto de item/grupo não pôde ser carregada para o PDF", e);
      }
    })
  );

  return cache;
}

async function loadLogoBase64(): Promise<string> {
  return loadImageBase64(edrLogoUrl);
}


async function fetchFontBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function registerRoboto(doc: jsPDF) {
  try {
    const [reg, bold] = await Promise.all([
      fetchFontBase64(robotoRegularUrl),
      fetchFontBase64(robotoBoldUrl),
    ]);
    doc.addFileToVFS("Roboto-Regular.ttf", reg);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", bold);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    doc.setFont("Roboto", "normal");
  } catch (e) {
    console.warn("Falha ao carregar fonte Roboto, usando Helvetica padrão.", e);
  }
}

export async function generateLaudoPDF(laudo: LaudoPericial) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let pageNum = 1;

  // Embed Roboto so the PDF survives external compression / signing without
  // glyph spacing corruption (Helvetica is referenced by name, not embedded).
  await registerRoboto(doc);

  // Pré-carrega todas as fotos como Data URL (jsPDF não aceita blob:/URL remota)
  const photoCache = await buildPhotoCache(laudo);
  const img = (id: string, raw?: string): string =>
    photoCache.get(id) ?? (raw ? photoCache.get(raw) ?? (raw.startsWith("data:") ? raw : "") : "");
  const valorMOItem = (i: ItemOrcamento) => i.valorMaoObra;
  const valorPecaItem = (i: ItemOrcamento) => (isPeca(i) ? i.valorPeca * i.qtdPeca : 0);


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
    doc.setFont("Roboto", "bold");
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
  doc.setFont("Roboto", "bold");
  doc.text("Parecer Técnico: Automotivo", PAGE_W / 2, boxY + 55, { align: "center" });

  // Info fields
  doc.setFontSize(10);
  doc.setFont("Roboto", "normal");
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
    doc.setFont("Roboto", "bold");
    doc.text(label, boxX + 20, ly);
    doc.setFont("Roboto", "normal");
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
  doc.setFont("Roboto", "bold");
  doc.text("LAUDO PERICIAL AUTOMOTIVO", PAGE_W / 2, y, { align: "center" });
  y += 12;

  y = sectionTitle(doc, "Sumário", y);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont("Roboto", "normal");

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
    headStyles: { fillColor: NAVY, fontSize: 9, font: "Roboto", fontStyle: "bold" },
    bodyStyles: { fontSize: 9, font: "Roboto", fontStyle: "normal" },
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
    doc.setFont("Roboto", "bold");
    doc.text("Relato do Motorista:", MARGIN, y);
    doc.setFont("Roboto", "normal");
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
    headStyles: { fillColor: NAVY, fontSize: 9, font: "Roboto", fontStyle: "bold" },
    bodyStyles: { fontSize: 9, font: "Roboto", fontStyle: "normal" },
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
    headStyles: { fillColor: NAVY, fontSize: 9, font: "Roboto", fontStyle: "bold" },
    bodyStyles: { fontSize: 9, font: "Roboto", fontStyle: "normal" },
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
        const imgData = img(foto.id, foto.preview);
        if (!imgData) throw new Error("sem imagem");

        const catLabel = categorias[foto.categoria] || foto.categoria;

        doc.setFontSize(8);
        doc.setFont("Roboto", "bold");
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
      headStyles: { fillColor: NAVY, fontSize: 7, font: "Roboto", fontStyle: "bold" },
      bodyStyles: { fontSize: 7, font: "Roboto", fontStyle: "normal" },
      theme: "grid",
      columnStyles: {
        0: { cellWidth: 8 },
        2: { cellWidth: 35 },
        8: { cellWidth: 18 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Totals
    const subtotalPecas = laudo.analise.itensOrcamento.reduce((s, i) => s + valorPecaItem(i), 0);
    const subtotalMO = laudo.analise.itensOrcamento.reduce((s, i) => s + valorMOItem(i), 0);

    const total = subtotalPecas + subtotalMO;

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Subtotal Peças: ${formatCurrency(subtotalPecas)}    |    Subtotal M.O.: ${formatCurrency(subtotalMO)}`, MARGIN, y);
    y += 5;
    doc.setFont("Roboto", "bold");
    doc.setTextColor(...NAVY);
    doc.text(`Total Geral: ${formatCurrency(total)}`, MARGIN, y);
    doc.setFont("Roboto", "normal");
    y += 10;

    // Justificativas por item
    for (const item of laudo.analise.itensOrcamento) {
      if (!item.justificativa) continue;
      if (y > PAGE_H - 40) {
        pageNum = newPage(doc, pageNum);
        y = 28;
      }
      doc.setFontSize(9);
      doc.setFont("Roboto", "bold");
      doc.setTextColor(...NAVY);
      doc.text(`Justificativa - ${item.descricao || item.codigo}:`, MARGIN, y);
      y += 5;
      doc.setFont("Roboto", "normal");
      doc.setTextColor(60, 60, 60);
      y = addWrappedText(doc, item.justificativa, MARGIN, y, CONTENT_W, 9);
      y += 4;
    }
  }

  // ===== ITENS AGRUPADOS (todos os grupos, com itens, fotos e parecer) =====
  {
    const grupos = laudo.analise.gruposAnalise ?? [];
    if (grupos.length > 0) {
      pageNum = newPage(doc, pageNum);
      y = 28;
      y = sectionTitle(doc, "Itens Agrupados", y);

      const statusLabel = (s: string) =>
        s === "aprovado" ? "Aprovado" : s === "reprovado" ? "Reprovado" : "Pendente";
      const statusColor = (s: string): [number, number, number] =>
        s === "aprovado" ? [34, 139, 70] : s === "reprovado" ? [180, 35, 35] : [150, 120, 30];

      for (const grupo of grupos) {
        if (y > PAGE_H - 60) { pageNum = newPage(doc, pageNum); y = 28; }

        // Título do grupo
        doc.setFontSize(11);
        doc.setFont("Roboto", "bold");
        doc.setTextColor(...NAVY);
        doc.text(`Grupo: ${grupo.nome || "Sem nome"}`, MARGIN, y);

        // Badge de parecer
        const label = statusLabel(grupo.status);
        const [r, g, b] = statusColor(grupo.status);
        doc.setFontSize(9);
        doc.setTextColor(r, g, b);
        doc.text(`Parecer: ${label}`, PAGE_W - MARGIN, y, { align: "right" });
        y += 6;

        // Itens do grupo
        const itensDoGrupo = grupo.itemIds
          .map(id => laudo.analise.itensOrcamento.find(i => i.id === id))
          .filter((x): x is typeof laudo.analise.itensOrcamento[number] => !!x);

        if (itensDoGrupo.length > 0) {
          autoTable(doc, {
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            head: [["#", "Cód.", "Descrição", "Qtd P.", "Vlr Peça", "Qtd MO", "Vlr MO", "Total"]],
            body: itensDoGrupo.map((item, idx) => [
              String(idx + 1),
              item.codigo,
              item.descricao,
              String(item.qtdPeca),
              formatCurrency(item.valorPeca),
              String(item.qtdMaoObra),
              formatCurrency(item.valorMaoObra),
              formatCurrency(item.valorTotal),
            ]),
            headStyles: { fillColor: NAVY, fontSize: 7, font: "Roboto", fontStyle: "bold" },
            bodyStyles: { fontSize: 7, font: "Roboto", fontStyle: "normal" },
            theme: "grid",
            columnStyles: { 0: { cellWidth: 8 }, 2: { cellWidth: 50 } },
          });
          y = (doc as any).lastAutoTable.finalY + 4;

          const totalGrupo = itensDoGrupo.reduce((s, i) => s + (i.valorTotal || 0), 0);
          doc.setFontSize(9);
          doc.setFont("Roboto", "bold");
          doc.setTextColor(...NAVY);
          doc.text(`Total do Grupo: ${formatCurrency(totalGrupo)}`, PAGE_W - MARGIN, y, { align: "right" });
          doc.setFont("Roboto", "normal");
          y += 6;
        }

        // Fotos do grupo + fotos dos itens vinculados
        const fotosCombinadas = [
          ...(grupo.fotos ?? []),
          ...itensDoGrupo.flatMap(i => i.fotos ?? []),
        ];
        if (fotosCombinadas.length > 0) {
          const imgW = 55, imgH = 40, gap = 5;
          let x = MARGIN;
          for (const foto of fotosCombinadas) {
            if (x + imgW > MARGIN + CONTENT_W) { x = MARGIN; y += imgH + 8; }
            if (y + imgH > PAGE_H - 25) { pageNum = newPage(doc, pageNum); y = 28; x = MARGIN; }
            try {
              doc.addImage(img(foto.id, foto.dataUrl), "JPEG", x, y, imgW, imgH);
              if (foto.descricao) {
                doc.setFontSize(7);
                doc.setTextColor(...GRAY);
                doc.text(doc.splitTextToSize(foto.descricao, imgW)[0] ?? "", x, y + imgH + 3);
              }
            } catch { /* ignore */ }
            x += imgW + gap;
          }
          y += imgH + 8;
        }

        // Parecer / justificativa
        if (grupo.justificativa) {
          if (y > PAGE_H - 30) { pageNum = newPage(doc, pageNum); y = 28; }
          doc.setFontSize(9);
          doc.setFont("Roboto", "bold");
          doc.setTextColor(...NAVY);
          doc.text("Parecer Técnico do Grupo:", MARGIN, y);
          y += 5;
          doc.setFont("Roboto", "normal");
          doc.setTextColor(60, 60, 60);
          y = addWrappedText(doc, grupo.justificativa, MARGIN, y, CONTENT_W, 9);
        }
        y += 8;
      }
    }
  }

  // ===== ITENS REPROVADOS (descrição + fotos + justificativa) =====
  {
    const itensReprovados = laudo.analise.itensOrcamento.filter(i => i.status === "reprovado");
    const gruposReprovados = (laudo.analise.gruposAnalise ?? []).filter(g => g.status === "reprovado");

    if (itensReprovados.length > 0 || gruposReprovados.length > 0) {
      pageNum = newPage(doc, pageNum);
      y = 28;
      y = sectionTitle(doc, "Itens Reprovados", y);

      const renderBlock = (titulo: string, descricao: string, fotos: { id: string; dataUrl: string; descricao?: string }[] | undefined, justificativa: string) => {
        if (y > PAGE_H - 50) { pageNum = newPage(doc, pageNum); y = 28; }
        doc.setFontSize(10);
        doc.setFont("Roboto", "bold");
        doc.setTextColor(...NAVY);
        doc.text(titulo, MARGIN, y);
        y += 5;
        if (descricao) {
          doc.setFont("Roboto", "normal");
          doc.setTextColor(60, 60, 60);
          y = addWrappedText(doc, descricao, MARGIN, y, CONTENT_W, 9);
        }

        if (fotos && fotos.length > 0) {
          const imgW = 55;
          const imgH = 40;
          const gap = 5;
          let x = MARGIN;
          for (const foto of fotos) {
            if (x + imgW > MARGIN + CONTENT_W) { x = MARGIN; y += imgH + 8; }
            if (y + imgH > PAGE_H - 25) { pageNum = newPage(doc, pageNum); y = 28; x = MARGIN; }
            try {
              doc.addImage(img(foto.id, foto.dataUrl), "JPEG", x, y, imgW, imgH);
              if (foto.descricao) {
                doc.setFontSize(7);
                doc.setTextColor(...GRAY);
                doc.text(doc.splitTextToSize(foto.descricao, imgW)[0] ?? "", x, y + imgH + 3);
              }
            } catch { /* ignore broken image */ }
            x += imgW + gap;
          }
          y += imgH + 8;
        }

        if (justificativa) {
          if (y > PAGE_H - 30) { pageNum = newPage(doc, pageNum); y = 28; }
          doc.setFontSize(9);
          doc.setFont("Roboto", "bold");
          doc.setTextColor(...NAVY);
          doc.text("Justificativa Técnica:", MARGIN, y);
          y += 5;
          doc.setFont("Roboto", "normal");
          doc.setTextColor(60, 60, 60);
          y = addWrappedText(doc, justificativa, MARGIN, y, CONTENT_W, 9);
        }
        y += 6;
      };

      for (const item of itensReprovados) {
        renderBlock(
          `${item.codigo ? item.codigo + " - " : ""}${item.descricao || "Item"}`,
          "",
          item.fotos,
          item.justificativa,
        );
      }

      for (const grupo of gruposReprovados) {
        const itensDoGrupo = grupo.itemIds
          .map(id => laudo.analise.itensOrcamento.find(i => i.id === id))
          .filter((x): x is typeof laudo.analise.itensOrcamento[number] => !!x);
        const descricao = itensDoGrupo.map(i => `• ${i.codigo ? i.codigo + " - " : ""}${i.descricao}`).join("\n");
        const fotosCombinadas = [
          ...(grupo.fotos ?? []),
          ...itensDoGrupo.flatMap(i => i.fotos ?? []),
        ];
        renderBlock(
          `Categoria: ${grupo.nome || "Sem nome"}`,
          descricao,
          fotosCombinadas,
          grupo.justificativa,
        );
      }
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

  // ===== RESUMO EXECUTIVO COM GRÁFICOS =====
  {
    y = sectionTitle(doc, "Resumo da Análise", y);

    const itens = laudo.analise.itensOrcamento;
    const totalItens = itens.length;
    const aprovados = itens.filter(i => i.status === "aprovado");
    const reprovados = itens.filter(i => i.status === "reprovado");
    const pendentes = itens.filter(i => i.status === "pendente");

    const vlrAprovado = aprovados.reduce((s, i) => s + (i.valorTotal || 0), 0);
    const vlrReprovado = reprovados.reduce((s, i) => s + (i.valorTotal || 0), 0);
    const vlrPendente = pendentes.reduce((s, i) => s + (i.valorTotal || 0), 0);
    const vlrTotal = vlrAprovado + vlrReprovado + vlrPendente;
    const economizado = vlrReprovado;

    // KPI cards
    const cardW = (CONTENT_W - 10) / 3;
    const cardH = 22;
    const drawCard = (x: number, title: string, value: string, color: [number, number, number]) => {
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, "F");
      doc.setFillColor(...color);
      doc.rect(x, y, 2, cardH, "F");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.setFont("Roboto", "normal");
      doc.text(title, x + 5, y + 6);
      doc.setFontSize(12);
      doc.setTextColor(...NAVY);
      doc.setFont("Roboto", "bold");
      doc.text(value, x + 5, y + 16);
    };
    drawCard(MARGIN, "Total Orçado", formatCurrency(vlrTotal), NAVY);
    drawCard(MARGIN + cardW + 5, "Aprovado", formatCurrency(vlrAprovado), [34, 139, 70]);
    drawCard(MARGIN + (cardW + 5) * 2, "Economizado (Glosado)", formatCurrency(economizado), [180, 35, 35]);
    y += cardH + 8;

    // ---- Gráfico de barras: quantidade de itens por status ----
    doc.setFontSize(10);
    doc.setFont("Roboto", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Itens por Status (quantidade)", MARGIN, y);
    y += 4;

    const chartX = MARGIN;
    const chartY = y;
    const chartW = CONTENT_W;
    const chartH = 50;
    const baseY = chartY + chartH;

    // axes
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(chartX, baseY, chartX + chartW, baseY);

    const bars = [
      { label: "Aprovados", value: aprovados.length, color: [34, 139, 70] as [number, number, number] },
      { label: "Reprovados", value: reprovados.length, color: [180, 35, 35] as [number, number, number] },
      { label: "Pendentes", value: pendentes.length, color: [200, 160, 40] as [number, number, number] },
    ];
    const maxVal = Math.max(1, ...bars.map(b => b.value));
    const barW = 25;
    const slot = chartW / bars.length;
    bars.forEach((b, i) => {
      const h = (b.value / maxVal) * (chartH - 8);
      const bx = chartX + slot * i + (slot - barW) / 2;
      const by = baseY - h;
      doc.setFillColor(...b.color);
      doc.rect(bx, by, barW, h, "F");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.setFont("Roboto", "bold");
      doc.text(String(b.value), bx + barW / 2, by - 1.5, { align: "center" });
      doc.setFont("Roboto", "normal");
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.text(b.label, bx + barW / 2, baseY + 5, { align: "center" });
    });
    y = baseY + 12;

    // ---- Gráfico de barras horizontais: valores ----
    doc.setFontSize(10);
    doc.setFont("Roboto", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Distribuição do Orçamento (R$)", MARGIN, y);
    y += 4;

    const vals = [
      { label: "Aprovado", value: vlrAprovado, color: [34, 139, 70] as [number, number, number] },
      { label: "Reprovado (Glosa)", value: vlrReprovado, color: [180, 35, 35] as [number, number, number] },
      { label: "Pendente", value: vlrPendente, color: [200, 160, 40] as [number, number, number] },
    ];
    const maxV = Math.max(1, ...vals.map(v => v.value));
    const labelW = 45;
    const valueW = 35;
    const trackW = CONTENT_W - labelW - valueW - 4;
    const rowH = 7;
    vals.forEach((v) => {
      doc.setFontSize(9);
      doc.setFont("Roboto", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(v.label, MARGIN, y + 5);
      // track
      doc.setFillColor(230, 233, 240);
      doc.rect(MARGIN + labelW, y, trackW, rowH, "F");
      // fill
      const w = (v.value / maxV) * trackW;
      doc.setFillColor(...v.color);
      doc.rect(MARGIN + labelW, y, w, rowH, "F");
      // value
      doc.setFont("Roboto", "bold");
      doc.setTextColor(...NAVY);
      doc.text(formatCurrency(v.value), MARGIN + CONTENT_W, y + 5, { align: "right" });
      y += rowH + 3;
    });

    y += 4;
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("Roboto", "bold");
    doc.setTextColor(...WHITE);
    doc.text(`Total de itens analisados: ${totalItens}`, MARGIN + 4, y + 9);
    const pctEcon = vlrTotal > 0 ? ((economizado / vlrTotal) * 100).toFixed(1) : "0.0";
    doc.text(
      `Total economizado: ${formatCurrency(economizado)}  (${pctEcon}%)`,
      PAGE_W - MARGIN - 4, y + 9, { align: "right" }
    );
    doc.setTextColor(0, 0, 0);
    doc.setFont("Roboto", "normal");
    y += 20;

    if (y > PAGE_H - 60) {
      pageNum = newPage(doc, pageNum);
      y = 28;
    }
  }

  y = sectionTitle(doc, "Conclusões", y);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  if (laudo.conclusao.parecerTecnico) {
    doc.setFont("Roboto", "bold");
    doc.text("Parecer Técnico:", MARGIN, y);
    y += 5;
    doc.setFont("Roboto", "normal");
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
  doc.setFont("Roboto", "bold");
  doc.text(laudo.conclusao.analistaVistoriador || "Analista Vistoriador", MARGIN, sigY + 5);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7);
  doc.text("Analista Vistoriador", MARGIN, sigY + 9);

  // Right signature
  doc.line(PAGE_W - MARGIN - 70, sigY, PAGE_W - MARGIN, sigY);
  doc.setFontSize(9);
  doc.setFont("Roboto", "bold");
  doc.text(laudo.conclusao.gestorOperacoes || "Gestor de Operações", PAGE_W - MARGIN - 70, sigY + 5);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7);
  doc.text("Gestor de Operações EDR", PAGE_W - MARGIN - 70, sigY + 9);

  // Save
  const fileName = `Laudo_Pericial_${laudo.dadosVeiculo.placa || "SemPlaca"}_${laudo.dataLaudo || "sem_data"}.pdf`;
  doc.save(fileName);
}
