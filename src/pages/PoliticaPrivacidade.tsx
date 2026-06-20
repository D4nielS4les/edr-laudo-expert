import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/laudo/PageHeader";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Política de Privacidade — EDR Inspeções</title>
        <meta name="description" content="Política de Privacidade da EDR SERVIÇOS TÉCNICOS LTDA: como tratamos dados pessoais no sistema de laudos, em conformidade com a LGPD." />
        <link rel="canonical" href="https://edr-laudo-mate.lovable.app/privacidade" />
        <meta property="og:title" content="Política de Privacidade — EDR Inspeções" />
        <meta property="og:url" content="https://edr-laudo-mate.lovable.app/privacidade" />
      </Helmet>
      <PageHeader />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-accent hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Card className="p-6 md:p-10 space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-primary">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground mt-1">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
          </header>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">1. Controlador dos Dados</h2>
            <p className="text-sm leading-relaxed">
              <strong>EDR SERVIÇOS TÉCNICOS LTDA</strong> ("EDR", "nós") é a Controladora dos dados pessoais tratados
              neste sistema, nos termos da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD).
            </p>
            <p className="text-sm leading-relaxed">
              Contato do Encarregado (DPO): <a href="mailto:edr@edr.com.br" className="text-accent underline">edr@edr.com.br</a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">2. Dados Coletados</h2>
            <p className="text-sm leading-relaxed">Tratamos os seguintes dados, fornecidos pelo próprio usuário ou pelo solicitante do laudo:</p>
            <ul className="list-disc pl-6 text-sm space-y-1">
              <li><strong>Identificação:</strong> nome, CPF/CNPJ, telefone, e-mail e endereço.</li>
              <li><strong>Dados do veículo:</strong> placa, chassi, marca/modelo, ano e demais informações técnicas.</li>
              <li><strong>Dados do laudo:</strong> fotos, descrições técnicas, orçamentos e pareceres.</li>
              <li><strong>Dados de uso:</strong> registros locais (localStorage) para funcionamento do sistema.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">3. Finalidades e Base Legal</h2>
            <p className="text-sm leading-relaxed">
              Os dados são tratados para a <strong>elaboração de laudos periciais e regulação de sinistros</strong>, com base nas
              hipóteses dos arts. 7º e 11 da LGPD: execução de contrato, cumprimento de obrigação legal/regulatória,
              exercício regular de direitos em processos e legítimo interesse do Controlador.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">4. Compartilhamento</h2>
            <p className="text-sm leading-relaxed">
              Os laudos podem ser compartilhados com seguradoras, oficinas, clientes finais e autoridades competentes,
              estritamente para a finalidade contratada. Não vendemos dados pessoais a terceiros.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">5. Armazenamento e Segurança</h2>
            <p className="text-sm leading-relaxed">
              Adotamos medidas técnicas e administrativas para proteger os dados contra acessos não autorizados,
              perda, alteração ou destruição. Os laudos são mantidos pelo prazo necessário ao cumprimento da
              finalidade e das obrigações legais (em regra, até 5 anos após o encerramento do sinistro).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">6. Direitos do Titular (art. 18 da LGPD)</h2>
            <p className="text-sm leading-relaxed">O titular pode, a qualquer momento, solicitar:</p>
            <ul className="list-disc pl-6 text-sm space-y-1">
              <li>Confirmação da existência de tratamento;</li>
              <li>Acesso, correção ou atualização dos dados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Portabilidade e informação sobre compartilhamentos;</li>
              <li>Revogação do consentimento.</li>
            </ul>
            <p className="text-sm leading-relaxed">
              Solicitações devem ser enviadas a <a href="mailto:edr@edr.com.br" className="text-accent underline">edr@edr.com.br</a>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">7. Cookies</h2>
            <p className="text-sm leading-relaxed">
              Utilizamos apenas armazenamento local essencial ao funcionamento do sistema (rascunhos de laudos e
              preferências). Não utilizamos cookies de rastreamento publicitário sem consentimento prévio.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">8. Incidentes</h2>
            <p className="text-sm leading-relaxed">
              Em caso de incidente de segurança que possa acarretar risco relevante aos titulares, a ANPD e os
              titulares afetados serão comunicados no prazo legal.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">9. Alterações</h2>
            <p className="text-sm leading-relaxed">
              Esta política pode ser atualizada. A versão vigente estará sempre disponível nesta página.
            </p>
          </section>
        </Card>
      </main>
    </div>
  );
}