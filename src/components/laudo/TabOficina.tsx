import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useLaudo } from "@/contexts/LaudoContext";
import { cn } from "@/lib/utils";

const campos: { key: "nome" | "cnpj" | "endereco" | "bairro" | "cidade" | "telefone" | "responsavel"; label: string; placeholder: string; colSpan?: boolean }[] = [
  { key: "nome", label: "Nome da Oficina", placeholder: "Ex: ATIVA CAR" },
  { key: "cnpj", label: "CNPJ", placeholder: "22.740.348/0001-58" },
  { key: "endereco", label: "Endereço", placeholder: "Avenida Radialista João Ramos, Nº 1581", colSpan: true },
  { key: "bairro", label: "Bairro", placeholder: "Cidade Nova" },
  { key: "cidade", label: "Cidade / UF", placeholder: "Maracanaú - CE" },
  { key: "telefone", label: "Telefone", placeholder: "(85) 98632-2032" },
  { key: "responsavel", label: "Responsável", placeholder: "Sr. Edson" },
];

export function TabOficina() {
  const { laudo, updateOficina } = useLaudo();
  const oficina = laudo.dadosOficina;
  const hasAnyData = Object.values(oficina).some(v => v.trim() !== "");
  const emptyFields = hasAnyData ? campos.filter(c => !oficina[c.key]?.trim()) : [];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Dados da Oficina</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {emptyFields.length > 0 && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {emptyFields.length === 1
                ? `O campo "${emptyFields[0].label}" não foi preenchido.`
                : `${emptyFields.length} campos não preenchidos: ${emptyFields.map(f => f.label).join(", ")}.`}
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campos.map(({ key, label, placeholder, colSpan }) => {
            const isEmpty = hasAnyData && !oficina[key]?.trim();
            return (
              <div key={key} className={colSpan ? "md:col-span-2" : undefined}>
                <Label className={cn(isEmpty && "text-destructive")}>{label} {isEmpty && <span className="text-xs font-normal">(vazio)</span>}</Label>
                <Input
                  value={oficina[key]}
                  onChange={e => updateOficina({ [key]: e.target.value })}
                  placeholder={placeholder}
                  className={cn(isEmpty && "border-destructive/50 focus-visible:ring-destructive/30")}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
