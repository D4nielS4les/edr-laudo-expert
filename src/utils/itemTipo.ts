import type { ItemOrcamento } from "@/types/laudo";

export type TipoItem = 'peca' | 'mao_obra';

/** Deriva o tipo do item: usa `tipo` se existir; senão infere pela ação (Troca => peça). */
export function tipoItem(item: Pick<ItemOrcamento, 'tipo' | 'acao'>): TipoItem {
  if (item.tipo) return item.tipo;
  return /\btroca\b|^t$/i.test((item.acao ?? "").trim()) ? 'peca' : 'mao_obra';
}

export function isPeca(item: Pick<ItemOrcamento, 'tipo' | 'acao'>): boolean {
  return tipoItem(item) === 'peca';
}

/** Sort estável: peças primeiro, mantendo a ordem relativa original. */
export function ordenarPecasPrimeiro<T extends Pick<ItemOrcamento, 'tipo' | 'acao'>>(itens: T[]): T[] {
  return itens
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const pa = isPeca(a.item) ? 0 : 1;
      const pb = isPeca(b.item) ? 0 : 1;
      return pa !== pb ? pa - pb : a.index - b.index;
    })
    .map(({ item }) => item);
}
