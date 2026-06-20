import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extrai texto do PDF preservando layout (linhas e colunas).
 * Usa coordenadas Y para agrupar itens na mesma linha
 * e ordena por X dentro de cada linha.
 */
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
      
      // Agrupa itens por linha usando coordenada Y
      const items = textContent.items as any[];
      if (items.length === 0) continue;

      // Cada item tem: str, transform[4]=x, transform[5]=y, height, width
      const lineMap = new Map<number, { x: number; str: string }[]>();
      const tolerance = 3; // pixels de tolerância para mesma linha

      for (const item of items) {
        if (!item.str || item.str.trim() === '') continue;
        const y = Math.round(item.transform[5] / tolerance) * tolerance;
        const x = item.transform[4];
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push({ x, str: item.str });
      }

      // Ordena linhas por Y descendente (topo para baixo no PDF)
      const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
      
      for (const y of sortedYs) {
        const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
        
        // Junta itens da linha com espaço, inserindo tab se gap > 30px
        let lineText = '';
        let lastX = -Infinity;
        for (const item of lineItems) {
          const gap = item.x - lastX;
          if (lineText && gap > 30) {
            lineText += '\t';
          } else if (lineText) {
            lineText += ' ';
          }
          lineText += item.str;
          lastX = item.x + (item.str.length * 5); // estimativa de largura
        }
        
        fullText += lineText + '\n';
      }
      
      fullText += '\n--- PAGE BREAK ---\n';
    }

    if (import.meta.env.DEV) {
      console.log("[PDF] Texto extraído (primeiros 3000 chars):", fullText.substring(0, 3000));
    }
    return fullText;
  } catch (error) {
    console.error("Erro no PDF.js:", error);
    throw new Error("Falha ao processar o arquivo PDF.");
  }
}
