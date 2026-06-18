import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "edr_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const handle = (value: "accepted" | "rejected") => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies e privacidade"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 rounded-lg border border-border bg-card shadow-2xl p-5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-accent/10 p-2 shrink-0">
          <Cookie className="h-5 w-5 text-accent" />
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <h2 className="font-semibold text-primary">Privacidade & Cookies (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mt-1">
              Utilizamos armazenamento local essencial para o funcionamento do sistema (rascunhos de laudos
              e preferências). Não usamos cookies de rastreamento sem o seu consentimento. Saiba mais em
              nossa{" "}
              <Link to="/privacidade" className="text-accent underline">Política de Privacidade</Link> e{" "}
              <Link to="/termos" className="text-accent underline">Termos de Uso</Link>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handle("rejected")}>
              Recusar não-essenciais
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handle("accepted")}>
              Aceitar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}