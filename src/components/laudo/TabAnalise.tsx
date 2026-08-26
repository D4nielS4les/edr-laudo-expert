import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Layers, Unlink, ImagePlus, X, CheckCheck, XCircle } from "lucide-react";
import { useLaudo } from "@/contexts/LaudoContext";
import type { ItemOrcamento, GrupoAnalise, FotoItem } from "@/types/laudo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Bloco =
  | { kind: "item"; id: string; item: ItemOrcamento }
  | { kind: "grupo"; id: string; grupo: GrupoAnalise; itens: ItemOrcamento[] };

const fmtBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function TabAnalise() {
  const { laudo, updateAnalise } = useLaudo();
  const { itensOrcamento, causaRaiz, historicoManutencao, relatoMotorista } = laudo.analise;
  const grupos = laudo.analise.gruposAnalise ?? [];
  const ordem = laudo.analise.ordemItens;

  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const toggleItem = (id: string) => setOpenItems(p => ({ ...p, [id]: !p[id] }));

  // ----- ordem efetiva -----
  const itensIdsAgrupados = new Set(grupos.flatMap(g => g.itemIds));
  const blocosCalc: Bloco[] = useMemo(() => {
    const itensSoltos = itensOrcamento.filter(i => !itensIdsAgrupados.has(i.id));
    const blocosBase: Bloco[] = [
      ...itensSoltos.map<Bloco>(it => ({ kind: "item", id: it.id, item: it })),
      ...grupos.map<Bloco>(g => ({
        kind: "grupo",
        id: `grupo:${g.id}`,
        grupo: g,
        itens: g.itemIds
          .map(iid => itensOrcamento.find(i => i.id === iid))
          .filter((x): x is ItemOrcamento => !!x),
      })),
    ];
    if (!ordem || ordem.length === 0) return blocosBase;
    const map = new Map(blocosBase.map(b => [b.id, b]));
    const ordenados: Bloco[] = [];
    for (const id of ordem) {
      const b = map.get(id);
      if (b) { ordenados.push(b); map.delete(id); }
    }
    return [...ordenados, ...map.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensOrcamento, grupos, ordem]);

  const persistOrdem = (novaOrdem: string[]) => updateAnalise({ ordemItens: novaOrdem });
  const persistGrupos = (novosGrupos: GrupoAnalise[], novaOrdem?: string[]) =>
    updateAnalise({ gruposAnalise: novosGrupos, ...(novaOrdem ? { ordemItens: novaOrdem } : {}) });

  // ----- ações de item -----
  const addItem = () => {
    const novo: ItemOrcamento = {
      id: crypto.randomUUID(),
      codigo: "", grupo: "", descricao: "", acao: "", statusItem: "",
      qtdPeca: 1, valorPeca: 0, qtdMaoObra: 0, valorMaoObra: 0, valorTotal: 0,
      impostos: { ipi: 0, icms: 0 }, justificativa: "", status: "pendente", statusMaoObra: "pendente",
    };
    updateAnalise({
      itensOrcamento: [...itensOrcamento, novo],
      ordemItens: [...(ordem ?? blocosCalc.map(b => b.id)), novo.id],
    });
    setOpenItems(p => ({ ...p, [novo.id]: true }));
  };

  const updateItem = (id: string, updates: Partial<ItemOrcamento>) => {
    updateAnalise({
      itensOrcamento: itensOrcamento.map(item => {
        if (item.id !== id) return item;
        const upd = { ...item, ...updates };
        const pecaOk = upd.status !== 'reprovado';
        const moOk = (upd.statusMaoObra ?? 'pendente') !== 'reprovado';
        upd.valorTotal = (pecaOk ? upd.valorPeca : 0) + (moOk ? upd.valorMaoObra : 0);
        return upd;
      }),
    });
  };

  const removeItem = (id: string) => {
    updateAnalise({
      itensOrcamento: itensOrcamento.filter(i => i.id !== id),
      gruposAnalise: grupos.map(g => ({ ...g, itemIds: g.itemIds.filter(x => x !== id) }))
                           .filter(g => g.itemIds.length > 0),
      ordemItens: (ordem ?? blocosCalc.map(b => b.id)).filter(x => x !== id),
    });
  };

  // ----- ações de grupo -----
  const updateGrupo = (gid: string, updates: Partial<GrupoAnalise>) => {
    persistGrupos(grupos.map(g => g.id === gid ? { ...g, ...updates } : g));
  };

  const removerItemDoGrupo = (gid: string, itemId: string) => {
    const novos = grupos
      .map(g => g.id === gid ? { ...g, itemIds: g.itemIds.filter(x => x !== itemId) } : g)
      .filter(g => g.itemIds.length > 0);
    const novaOrdem = [...(ordem ?? blocosCalc.map(b => b.id))];
    // se grupo deixou de existir, remove da ordem; insere o item solto no fim
    const grupoExiste = novos.some(g => g.id === gid);
    if (!grupoExiste) {
      const idx = novaOrdem.indexOf(`grupo:${gid}`);
      if (idx >= 0) novaOrdem.splice(idx, 1, itemId);
      else novaOrdem.push(itemId);
    } else if (!novaOrdem.includes(itemId)) {
      novaOrdem.push(itemId);
    }
    persistGrupos(novos, novaOrdem);
  };

  const desfazerGrupo = (gid: string) => {
    const g = grupos.find(x => x.id === gid);
    if (!g) return;
    const novos = grupos.filter(x => x.id !== gid);
    const novaOrdem = [...(ordem ?? blocosCalc.map(b => b.id))];
    const idx = novaOrdem.indexOf(`grupo:${gid}`);
    if (idx >= 0) novaOrdem.splice(idx, 1, ...g.itemIds);
    else novaOrdem.push(...g.itemIds);
    persistGrupos(novos, novaOrdem);
  };

  // ----- DnD -----
  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const ordemAtual = blocosCalc.map(b => b.id);
    const oldIdx = ordemAtual.indexOf(activeId);
    const newIdx = ordemAtual.indexOf(overId);
    if (oldIdx === -1 || newIdx === -1) return;

    const activeBloco = blocosCalc[oldIdx];
    const overBloco = blocosCalc[newIdx];

    // Mesclar: soltar item sobre outro item -> cria grupo
    if (activeBloco.kind === "item" && overBloco.kind === "item") {
      const novoGrupo: GrupoAnalise = {
        id: crypto.randomUUID(),
        nome: "Nova categoria",
        itemIds: [overBloco.id, activeBloco.id],
        justificativa: "",
        status: "pendente",
      };
      const novaOrdem = ordemAtual
        .filter(x => x !== activeBloco.id && x !== overBloco.id);
      const insertAt = Math.min(oldIdx, newIdx);
      novaOrdem.splice(insertAt, 0, `grupo:${novoGrupo.id}`);
      persistGrupos([...grupos, novoGrupo], novaOrdem);
      return;
    }

    // Mesclar: soltar item sobre grupo -> adiciona ao grupo
    if (activeBloco.kind === "item" && overBloco.kind === "grupo") {
      const novosGrupos = grupos.map(g =>
        g.id === overBloco.grupo.id
          ? { ...g, itemIds: [...g.itemIds, activeBloco.id] }
          : g
      );
      const novaOrdem = ordemAtual.filter(x => x !== activeBloco.id);
      persistGrupos(novosGrupos, novaOrdem);
      return;
    }

    // Demais casos: apenas reordenar
    persistOrdem(arrayMove(ordemAtual, oldIdx, newIdx));
  };

  // ----- totais -----
  const subtotalPecas = itensOrcamento.reduce((s, i) => s + i.valorPeca, 0);
  const subtotalMaoObra = itensOrcamento.reduce((s, i) => s + i.valorMaoObra, 0);
  const totalGeral = itensOrcamento.reduce((s, i) => s + i.valorTotal, 0);

  const aprovarTodos = () => {
    updateAnalise({
      itensOrcamento: itensOrcamento.map(item => {
        const upd = { ...item, status: 'aprovado' as const, statusMaoObra: 'aprovado' as const };
        upd.valorTotal = upd.valorPeca + upd.valorMaoObra;
        return upd;
      }),
      gruposAnalise: grupos.map(g => ({ ...g, status: 'aprovado' as const })),
    });
  };

  const reprovarTodos = () => {
    updateAnalise({
      itensOrcamento: itensOrcamento.map(item => ({
        ...item,
        status: 'reprovado' as const,
        statusMaoObra: 'reprovado' as const,
        valorTotal: 0,
      })),
      gruposAnalise: grupos.map(g => ({ ...g, status: 'reprovado' as const })),
    });
  };

  const activeBloco = activeId ? blocosCalc.find(b => b.id === activeId) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relato do Motorista</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={relatoMotorista} onChange={e => updateAnalise({ relatoMotorista: e.target.value })} placeholder="Ex: LANCA DO SKY VOLTOU A APRESENTAR ESTALOS QUANDO FAZ MOVIMENTOS." rows={2} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Itens do Orçamento</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Arraste pelo ícone <GripVertical className="inline h-3 w-3" /> para reordenar. Solte um item sobre outro para criar uma <strong>categoria</strong> e analisar em conjunto.
            </p>
          </div>
          <Button size="sm" onClick={addItem} className="gap-1"><Plus className="h-4 w-4" /> Adicionar Item</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blocosCalc.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {blocosCalc.map((bloco, idx) => (
                bloco.kind === "item" ? (
                  <ItemCard
                    key={bloco.id}
                    idx={idx}
                    item={bloco.item}
                    open={!!openItems[bloco.id]}
                    onToggle={() => toggleItem(bloco.id)}
                    onUpdate={(u) => updateItem(bloco.item.id, u)}
                    onRemove={() => removeItem(bloco.item.id)}
                  />
                ) : (
                  <GrupoCard
                    key={bloco.id}
                    idx={idx}
                    grupo={bloco.grupo}
                    itens={bloco.itens}
                    open={!!openItems[bloco.id]}
                    onToggle={() => toggleItem(bloco.id)}
                    onUpdateGrupo={(u) => updateGrupo(bloco.grupo.id, u)}
                    onRemoverItem={(itemId) => removerItemDoGrupo(bloco.grupo.id, itemId)}
                    onUpdateItem={updateItem}
                    onDesfazer={() => desfazerGrupo(bloco.grupo.id)}
                  />
                )
              ))}
            </SortableContext>
            <DragOverlay>
              {activeBloco && (
                <div className="border border-primary/40 bg-card rounded-lg p-3 shadow-lg opacity-90">
                  <span className="text-sm font-medium">
                    {activeBloco.kind === "item"
                      ? (activeBloco.item.descricao || "Item")
                      : `📁 ${activeBloco.grupo.nome}`}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {itensOrcamento.length > 0 && (
            <div className="border-t border-border pt-3 flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex flex-wrap gap-6">
                <span>Subtotal Peças: <strong>{fmtBRL(subtotalPecas)}</strong></span>
                <span>Subtotal M.O.: <strong>{fmtBRL(subtotalMaoObra)}</strong></span>
                <span className="text-foreground font-bold">Total Geral: {fmtBRL(totalGeral)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={aprovarTodos} className="gap-1">
                  <CheckCheck className="h-4 w-4 text-success" /> Aprovar todos os itens
                </Button>
                <Button size="sm" variant="outline" onClick={reprovarTodos} className="gap-1">
                  <XCircle className="h-4 w-4 text-destructive" /> Reprovar todos os itens
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Causa Raiz da Intercorrência</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={causaRaiz} onChange={e => updateAnalise({ causaRaiz: e.target.value })} placeholder="Descreva os pontos pertinentes sobre a causa raiz..." rows={4} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Manutenção</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={historicoManutencao} onChange={e => updateAnalise({ historicoManutencao: e.target.value })} placeholder="Considerações pertinentes com base no histórico de manutenção..." rows={4} />
        </CardContent>
      </Card>
    </div>
  );
}

/* =================== ItemCard =================== */

interface ItemCardProps {
  idx: number;
  item: ItemOrcamento;
  open: boolean;
  onToggle: () => void;
  onUpdate: (u: Partial<ItemOrcamento>) => void;
  onRemove: () => void;
}

function ItemCard({ idx, item, open, onToggle, onUpdate, onRemove }: ItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const peca = isPeca(item);

  return (
    <div ref={setNodeRef} style={style}>
    <Collapsible
      open={open}
      onOpenChange={onToggle}
      className={cn(
        "border rounded-lg overflow-hidden bg-card border-l-4",
        peca ? "border-border border-l-primary" : "border-border border-l-accent"
      )}
    >
      <div className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground"
            aria-label="Arrastar item"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <CollapsibleTrigger asChild>
            <button className="flex flex-1 items-center gap-3 text-left min-w-0">
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                <span className={cn("text-sm font-bold shrink-0", peca ? "text-primary" : "text-accent")}>Item {idx + 1}</span>
                <span className={cn(
                  "text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full shrink-0",
                  peca ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                )}>
                  {peca ? "Peça" : "M.O."}
                </span>
                <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-md">
                  {item.descricao || "Sem descrição"}
                </span>

                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded border transition-colors shrink-0",
                  item.status === 'reprovado'
                    ? "text-destructive bg-destructive/10 border-destructive/20"
                    : item.status === 'aprovado'
                      ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                      : "text-amber-600 bg-amber-50 border-amber-100"
                )}>
                  {fmtBRL(item.valorTotal)}
                </span>
              </div>
            </button>
          </CollapsibleTrigger>
        </div>
        <Button variant="ghost" size="sm" aria-label="Remover item" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <CollapsibleContent className="p-4 space-y-4 border-t border-border">
        <ItemFields item={item} onUpdate={onUpdate} />
      </CollapsibleContent>
    </Collapsible>
    </div>
  );
}

/* =================== GrupoCard =================== */

interface GrupoCardProps {
  idx: number;
  grupo: GrupoAnalise;
  itens: ItemOrcamento[];
  open: boolean;
  onToggle: () => void;
  onUpdateGrupo: (u: Partial<GrupoAnalise>) => void;
  onRemoverItem: (itemId: string) => void;
  onUpdateItem: (id: string, u: Partial<ItemOrcamento>) => void;
  onDesfazer: () => void;
}

function GrupoCard({ idx, grupo, itens, open, onToggle, onUpdateGrupo, onRemoverItem, onUpdateItem, onDesfazer }: GrupoCardProps) {
  const dndId = `grupo:${grupo.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: dndId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const totalPeca = itens.reduce((s, i) => s + i.valorPeca, 0);
  const totalMO = itens.reduce((s, i) => s + i.valorMaoObra, 0);
  const total = totalPeca + totalMO;

  return (
    <div ref={setNodeRef} style={style}>
    <Collapsible
      open={open}
      onOpenChange={onToggle}
      className={cn(
        "border-2 rounded-lg overflow-hidden bg-card transition-colors",
        isOver ? "border-primary ring-2 ring-primary/30" : "border-primary/40"
      )}
    >
      <div className="flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground"
            aria-label="Arrastar categoria"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <CollapsibleTrigger asChild>
            <button className="flex flex-1 items-center gap-3 text-left min-w-0">
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              <Layers className="h-4 w-4 text-primary shrink-0" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                <span className="text-sm font-bold text-primary shrink-0">Categoria {idx + 1}</span>
                <span className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md">
                  {grupo.nome || "Categoria"} <span className="text-xs text-muted-foreground font-normal">({itens.length} itens)</span>
                </span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded border shrink-0",
                  grupo.status === 'reprovado'
                    ? "text-destructive bg-destructive/10 border-destructive/20"
                    : grupo.status === 'aprovado'
                      ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                      : "text-amber-600 bg-amber-50 border-amber-100"
                )}>
                  {fmtBRL(total)}
                </span>
              </div>
            </button>
          </CollapsibleTrigger>
        </div>
        <Button variant="ghost" size="sm" aria-label="Desfazer agrupamento" onClick={(e) => { e.stopPropagation(); onDesfazer(); }} title="Desfazer agrupamento">
          <Unlink className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <CollapsibleContent className="p-4 space-y-4 border-t border-border">
        <div>
          <Label className="text-xs">Nome da Categoria</Label>
          <Input value={grupo.nome} onChange={e => onUpdateGrupo({ nome: e.target.value })} placeholder="Ex: Sistema Hidráulico" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Itens nesta categoria</Label>
          {itens.map(it => (
            <SubItem key={it.id} item={it} onUpdate={(u) => onUpdateItem(it.id, u)} onRemover={() => onRemoverItem(it.id)} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm bg-muted/30 rounded-md p-3">
          <div><span className="text-muted-foreground">Peças:</span> <strong>{fmtBRL(totalPeca)}</strong></div>
          <div><span className="text-muted-foreground">M.O.:</span> <strong>{fmtBRL(totalMO)}</strong></div>
          <div><span className="text-muted-foreground">Total:</span> <strong>{fmtBRL(total)}</strong></div>
        </div>

        <div>
          <Label className="text-xs">Status da Categoria</Label>
          <Select value={grupo.status} onValueChange={v => onUpdateGrupo({ status: v as GrupoAnalise["status"] })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Justificativa Técnica (categoria)</Label>
          <Textarea
            value={grupo.justificativa}
            onChange={e => onUpdateGrupo({ justificativa: e.target.value })}
            placeholder="Análise técnica considerando todos os itens desta categoria..."
            rows={4}
          />
        </div>

        <FotosManager
          fotos={grupo.fotos ?? []}
          onChange={(fotos) => onUpdateGrupo({ fotos })}
          label="Fotos da categoria"
        />
      </CollapsibleContent>
    </Collapsible>
    </div>
  );
}

/* =================== SubItem (dentro do grupo) =================== */

function SubItem({ item, onUpdate, onRemover }: { item: ItemOrcamento; onUpdate: (u: Partial<ItemOrcamento>) => void; onRemover: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border rounded-md">
      <div className="flex items-center justify-between p-2 bg-muted/20">
        <CollapsibleTrigger asChild>
          <button className="flex flex-1 items-center gap-2 text-left text-sm">
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span className="truncate">{item.descricao || "Sem descrição"}</span>
            <span className="text-xs text-muted-foreground ml-auto mr-2">{fmtBRL(item.valorTotal)}</span>
          </button>
        </CollapsibleTrigger>
        <Button variant="ghost" size="sm" aria-label="Remover do grupo" onClick={(e) => { e.stopPropagation(); onRemover(); }} title="Remover do grupo">
          <Unlink className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
      <CollapsibleContent className="p-3 border-t border-border">
        <ItemFields item={item} onUpdate={onUpdate} hideStatus />
      </CollapsibleContent>
    </Collapsible>
  );
}

/* =================== Campos de item reutilizáveis =================== */

function ItemFields({ item, onUpdate, hideStatus }: { item: ItemOrcamento; onUpdate: (u: Partial<ItemOrcamento>) => void; hideStatus?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><Label className="text-xs">Código</Label><Input value={item.codigo} onChange={e => onUpdate({ codigo: e.target.value })} placeholder="88331579" /></div>
        <div className="md:col-span-2"><Label className="text-xs">Descrição</Label><Input value={item.descricao} onChange={e => onUpdate({ descricao: e.target.value })} placeholder="Rolamento Sem Fim - Substituir" /></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><Label className="text-xs">Qtd Peça</Label><Input type="number" value={item.qtdPeca} onChange={e => onUpdate({ qtdPeca: +e.target.value })} /></div>
        <div><Label className="text-xs">Valor Peça (R$)</Label><Input type="number" step="0.01" value={item.valorPeca} onChange={e => onUpdate({ valorPeca: +e.target.value })} /></div>
        <div><Label className="text-xs">Qtd Mão de Obra</Label><Input type="number" value={item.qtdMaoObra} onChange={e => onUpdate({ qtdMaoObra: +e.target.value })} /></div>
        <div><Label className="text-xs">Valor Mão de Obra (R$)</Label><Input type="number" step="0.01" value={item.valorMaoObra} onChange={e => onUpdate({ valorMaoObra: +e.target.value })} /></div>
      </div>
      {!hideStatus && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status Peça</Label>
              <Select value={item.status} onValueChange={v => onUpdate({ status: v as ItemOrcamento["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status Mão de Obra</Label>
              <Select
                value={item.statusMaoObra ?? 'pendente'}
                onValueChange={v => onUpdate({ statusMaoObra: v as NonNullable<ItemOrcamento["statusMaoObra"]> })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Justificativa Técnica</Label>
            <Textarea value={item.justificativa} onChange={e => onUpdate({ justificativa: e.target.value })} placeholder="Descreva a justificativa técnica para este item..." rows={3} />
          </div>
          <FotosManager
            fotos={item.fotos ?? []}
            onChange={(fotos) => onUpdate({ fotos })}
            label="Fotos do item"
          />
        </>
      )}
    </div>
  );
}

/* =================== FotosManager =================== */

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FotosManager({
  fotos,
  onChange,
  label,
}: {
  fotos: FotoItem[];
  onChange: (fotos: FotoItem[]) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const novas: FotoItem[] = [];
    for (const f of Array.from(files)) {
      const dataUrl = await fileToDataUrl(f);
      novas.push({ id: crypto.randomUUID(), dataUrl, descricao: "" });
    }
    onChange([...fotos, ...novas]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removerFoto = (id: string) => onChange(fotos.filter(f => f.id !== id));
  const updateDesc = (id: string, descricao: string) =>
    onChange(fotos.map(f => f.id === id ? { ...f, descricao } : f));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-3 w-3" /> Adicionar foto
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>
      {fotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {fotos.map(f => (
            <div key={f.id} className="relative group border border-border rounded-md overflow-hidden bg-muted/20">
              <img src={f.dataUrl} alt={f.descricao || "Foto do item"} className="w-full h-24 object-cover" />
              <button
                type="button"
                onClick={() => removerFoto(f.id)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remover foto"
              >
                <X className="h-3 w-3" />
              </button>
              <Input
                value={f.descricao ?? ""}
                onChange={e => updateDesc(f.id, e.target.value)}
                placeholder="Descrição..."
                className="rounded-none border-0 border-t text-xs h-7"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}