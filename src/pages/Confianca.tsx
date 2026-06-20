import { Link } from "react-router-dom";
import { PageHeader } from "@/components/laudo/PageHeader";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Database, FileCheck, Mail } from "lucide-react";

export default function Confianca() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageHeader />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-accent hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Card className="p-6 md:p-10 space-y-8">
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-7 w-7" />
              <h1 className="text-3xl font-bold">Central de Confiança</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta página é mantida pela EDR SERVIÇOS TÉCNICOS LTDA para responder a perguntas comuns
              sobre segurança, privacidade e operação do sistema de laudos. Não constitui certificação
              independente.
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Lock className="h-5 w-5" /> Acesso e autenticação</h2>
            <p className="text-sm leading-relaxed">
              O sistema é operado pela equipe técnica da EDR. O acesso é restrito a colaboradores
              autorizados pela Controladora, em estações de trabalho de uso interno.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Database className="h-5 w-5" /> Dados tratados e armazenamento</h2>
            <p className="text-sm leading-relaxed">
              O sistema processa documentos de orçamento (PDF) e gera laudos de vistoria contendo
              dados de identificação, dados do veículo e valores. Os dados ficam armazenados localmente
              no navegador do operador (localStorage) para uso durante a vistoria.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><FileCheck className="h-5 w-5" /> Cookies e logs</h2>
            <p className="text-sm leading-relaxed">
              Utilizamos apenas cookies/armazenamento estritamente necessários ao funcionamento.
              Veja o banner de consentimento ao acessar o sistema. Logs técnicos detalhados estão
              desabilitados em produção para evitar exposição de dados sensíveis.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Responsabilidade compartilhada</h2>
            <p className="text-sm leading-relaxed">
              A infraestrutura de hospedagem provê controles de plataforma (rede, isolamento, atualizações).
              A EDR é responsável pela configuração da aplicação, gestão de acessos e tratamento dos
              dados pessoais. O cliente é responsável pela exatidão das informações fornecidas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Direitos do titular (LGPD)</h2>
            <p className="text-sm leading-relaxed">
              Para exercer direitos previstos na LGPD (acesso, correção, exclusão, portabilidade),
              consulte a <Link to="/privacidade" className="text-accent underline">Política de Privacidade</Link> e
              os <Link to="/termos" className="text-accent underline">Termos de Uso</Link>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Mail className="h-5 w-5" /> Contato de segurança</h2>
            <p className="text-sm leading-relaxed">
              Reporte incidentes ou vulnerabilidades para{" "}
              <a href="mailto:edr@edr.com.br" className="text-accent underline">edr@edr.com.br</a>.
            </p>
          </section>
        </Card>
      </main>
    </div>
  );
}