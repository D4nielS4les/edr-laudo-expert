import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useLaudo } from "@/contexts/LaudoContext";
import type { FotoVistoria } from "@/types/laudo";

const categorias = [
  { value: "geral", label: "Aspecto Geral" },
  { value: "placa_chassi", label: "Placa / Chassi" },
  { value: "hodometro", label: "Hodômetro" },
  { value: "defeito", label: "Peças com Defeito" },
] as const;

export function TabFotos() {
  const { laudo, updateLaudo } = useLaudo();
  const [categoria, setCategoria] = useState<FotoVistoria["categoria"]>("geral");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const novasFotos: FotoVistoria[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      categoria,
      descricao: "",
    }));
    updateLaudo({ fotos: [...laudo.fotos, ...novasFotos] });
  };

  const removerFoto = (id: string) => {
    const foto = laudo.fotos.find(f => f.id === id);
    if (foto) URL.revokeObjectURL(foto.preview);
    updateLaudo({ fotos: laudo.fotos.filter(f => f.id !== id) });
  };

  const atualizarDescricao = (id: string, descricao: string) => {
    updateLaudo({ fotos: laudo.fotos.map(f => f.id === id ? { ...f, descricao } : f) });
  };

  const fotosPorCategoria = categorias.map(c => ({
    ...c,
    fotos: laudo.fotos.filter(f => f.categoria === c.value),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Upload de Fotos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as FotoVistoria["categoria"])}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" /> Selecionar Fotos
            </Button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>
        </CardContent>
      </Card>

      {fotosPorCategoria.map(cat => cat.fotos.length > 0 && (
        <Card key={cat.value}>
          <CardHeader><CardTitle className="text-sm">{cat.label} ({cat.fotos.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cat.fotos.map(foto => (
                <div key={foto.id} className="relative group rounded-lg overflow-hidden border border-border">
                  <img src={foto.preview} alt={foto.descricao || cat.label} className="w-full h-32 object-cover" />
                  <button onClick={() => removerFoto(foto.id)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                  <Input placeholder="Descrição..." value={foto.descricao} onChange={e => atualizarDescricao(foto.id, e.target.value)} className="rounded-none border-0 border-t text-xs h-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {laudo.fotos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-2 opacity-30" />
          <p className="text-sm">Nenhuma foto registrada ainda</p>
        </div>
      )}
    </div>
  );
}
