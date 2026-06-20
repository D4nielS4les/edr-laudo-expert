import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/laudo/PageHeader";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Termos de Uso — EDR Inspeções</title>
        <meta name="description" content="Termos de Uso do sistema de gestão de laudos periciais da EDR SERVIÇOS TÉCNICOS LTDA: direitos, deveres e regras de utilização." />
        <link rel="canonical" href="https://edr-laudo-mate.lovable.app/termos" />
        <meta property="og:title" content="Termos de Uso — EDR Inspeções" />
        <meta property="og:url" content="https://edr-laudo-mate.lovable.app/termos" />
      </Helmet>
      <PageHeader />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-accent hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Card className="p-6 md:p-10 space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-primary">Termos de Uso</h1>
            <p className="text-sm text-muted-foreground mt-1">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
          </header>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">1. Aceitação</h2>
            <p className="text-sm leading-relaxed">
              Ao utilizar o sistema de Gestão de Laudos Periciais da <strong>EDR SERVIÇOS TÉCNICOS LTDA</strong>, o
              usuário declara ter lido e concordado integralmente com estes Termos e com a
              <Link to="/privacidade" className="text-accent underline mx-1">Política de Privacidade</Link>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">2. Objeto</h2>
            <p className="text-sm leading-relaxed">
              O sistema destina-se à elaboração, armazenamento e exportação de laudos técnicos veiculares,
              sendo de uso restrito a profissionais autorizados pela EDR ou por seus clientes contratantes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">3. Responsabilidades do Usuário</h2>
            <ul className="list-disc pl-6 text-sm space-y-1">
              <li>Fornecer informações verdadeiras, completas e atualizadas;</li>
              <li>Obter autorização do titular dos dados pessoais antes de inseri-los no sistema;</li>
              <li>Manter sigilo sobre credenciais de acesso;</li>
              <li>Não utilizar o sistema para fins ilícitos ou que violem direitos de terceiros.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">4. Propriedade Intelectual</h2>
            <p className="text-sm leading-relaxed">
              Todo o conteúdo, marca, layout e código do sistema pertencem à EDR ou aos seus licenciadores,
              sendo vedada a reprodução, modificação ou distribuição sem autorização expressa.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">5. Limitação de Responsabilidade</h2>
            <p className="text-sm leading-relaxed">
              A EDR empenha-se na disponibilidade e segurança do sistema, mas não se responsabiliza por
              indisponibilidades decorrentes de caso fortuito, força maior, falhas de internet ou uso indevido
              pelo usuário. O conteúdo técnico dos laudos é de responsabilidade do profissional signatário.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">6. Proteção de Dados</h2>
            <p className="text-sm leading-relaxed">
              O tratamento de dados pessoais segue a LGPD e a
              <Link to="/privacidade" className="text-accent underline mx-1">Política de Privacidade</Link>,
              parte integrante destes Termos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">7. Foro</h2>
            <p className="text-sm leading-relaxed">
              Fica eleito o foro da Comarca de Recife/PE para dirimir quaisquer controvérsias decorrentes
              destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>
        </Card>
      </main>
    </div>
  );
}