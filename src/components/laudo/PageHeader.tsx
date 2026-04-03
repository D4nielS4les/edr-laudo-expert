import { Phone, Mail, MapPin } from "lucide-react";

export function PageHeader() {
  return (
    <header className="gradient-hero px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold tracking-wider text-primary-foreground">EDR</h1>
          <span className="text-[10px] font-medium tracking-widest text-primary-foreground/80 uppercase">
            Inspeções e Regulações de Sinistros
          </span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-6 text-primary-foreground/80 text-xs">
        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> (81) 3334-1313</span>
        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> edr@edr.com.br</span>
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Rua Lopes de Carvalho Nº 101 - Madalena - Recife – PE</span>
      </div>
    </header>
  );
}
