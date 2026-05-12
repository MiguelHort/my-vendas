import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a WinLeads coleta, usa e protege seus dados pessoais.",
};

const VERSAO = "1.0";
const VIGENCIA = "12 de maio de 2025";
const DPO_EMAIL = "privacidade@winleads.com.br";
const EMPRESA = "Victor Hugo Sistemas LTDA";
const CNPJ = "54.046.645/0001-94";

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header mínimo */}
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">
            WinLeads
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Versão {VERSAO} — vigente desde {VIGENCIA}
          </p>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Política de Privacidade
          </h1>
          <p className="text-muted-foreground">
            Esta Política de Privacidade descreve como a{" "}
            <strong>{EMPRESA}</strong> (CNPJ {CNPJ}), controladora dos dados
            pessoais tratados pelo produto <strong>WinLeads</strong>, coleta,
            usa, armazena e protege suas informações, em conformidade com a Lei
            Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
          </p>
        </div>

        <Section title="1. Dados que coletamos">
          <p>Coletamos os seguintes dados pessoais:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Dados de identificação:</strong> nome completo e endereço
              de e-mail fornecidos pela sua conta Google no momento do login.
            </li>
            <li>
              <strong>Dados de uso:</strong> páginas visitadas, ações realizadas
              dentro da plataforma, datas e horários de acesso.
            </li>
            <li>
              <strong>Dados comerciais:</strong> leads, lotes de produção,
              comissões e demais informações que você insere na plataforma no
              exercício da sua atividade profissional.
            </li>
            <li>
              <strong>Dados de faturamento:</strong> identificador do cliente e
              da assinatura no Stripe (não armazenamos dados de cartão de
              crédito).
            </li>
            <li>
              <strong>Dados técnicos:</strong> endereço IP, tipo de dispositivo
              e navegador, coletados automaticamente para fins de segurança e
              diagnóstico.
            </li>
            <li>
              <strong>Dados de consentimento:</strong> registro de data, hora,
              IP e versão dos termos aceitos.
            </li>
          </ul>
        </Section>

        <Section title="2. Finalidade do tratamento">
          <p>Tratamos seus dados para:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Prover e manter o serviço WinLeads (base legal: execução de contrato).</li>
            <li>Processar pagamentos via Stripe (base legal: execução de contrato).</li>
            <li>Enviar comunicados relacionados à conta, como alertas de expiração de plano (base legal: execução de contrato).</li>
            <li>Analisar o uso da plataforma para melhorias (base legal: legítimo interesse, sujeito a consentimento para analytics).</li>
            <li>Cumprir obrigações legais e regulatórias (base legal: cumprimento de obrigação legal).</li>
          </ul>
        </Section>

        <Section title="3. Compartilhamento de dados">
          <p>Seus dados são compartilhados apenas com:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Google Firebase / Google LLC</strong> — autenticação (OAuth) e
              armazenamento do token de sessão.
            </li>
            <li>
              <strong>Supabase Inc.</strong> — banco de dados PostgreSQL
              hospedado nos servidores da Supabase.
            </li>
            <li>
              <strong>Stripe Inc.</strong> — processamento de pagamentos.
            </li>
            <li>
              <strong>Microsoft (Clarity)</strong> — analytics de comportamento,
              apenas mediante consentimento explícito.
            </li>
          </ul>
          <p className="mt-3">
            Não vendemos, alugamos nem cedemos seus dados a terceiros para fins
            de marketing.
          </p>
        </Section>

        <Section title="4. Cookies e tecnologias de rastreamento">
          <p>
            Utilizamos cookies essenciais para manter sua sessão ativa. Com seu
            consentimento, também utilizamos o Microsoft Clarity para análise de
            comportamento na plataforma. Você pode gerenciar suas preferências a
            qualquer momento pelo banner de cookies ou pelo link &quot;Gerenciar
            cookies&quot; no rodapé.
          </p>
        </Section>

        <Section title="5. Retenção de dados">
          <p>
            Seus dados são mantidos enquanto sua conta estiver ativa. Após a
            exclusão da conta, os dados pessoais são removidos em até{" "}
            <strong>30 dias</strong>, salvo obrigações legais que exijam retenção
            por prazo maior (ex.: dados fiscais, retidos por 5 anos conforme
            legislação tributária brasileira).
          </p>
        </Section>

        <Section title="6. Seus direitos como titular">
          <p>
            Nos termos da LGPD (art. 18), você tem direito a:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Confirmar a existência de tratamento dos seus dados.</li>
            <li>Acessar seus dados pessoais.</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
            <li>Portabilidade dos dados (exportação em JSON).</li>
            <li>Revogar o consentimento a qualquer momento.</li>
            <li>Solicitar a exclusão completa da sua conta e dados.</li>
          </ul>
          <p className="mt-3">
            Todos esses direitos podem ser exercidos diretamente em{" "}
            <strong>Configurações → Minha Conta</strong> ou pelo contato com o
            DPO abaixo.
          </p>
        </Section>

        <Section title="7. Segurança">
          <p>
            Adotamos medidas técnicas e administrativas para proteger seus dados,
            incluindo comunicação criptografada (HTTPS/TLS), controle de acesso
            por autenticação Firebase, e tokens de sessão com validade limitada.
            Em caso de incidente de segurança que possa afetar seus dados,
            notificaremos a ANPD e os titulares afetados conforme exigido pela
            LGPD.
          </p>
        </Section>

        <Section title="8. Transferência internacional de dados">
          <p>
            Seus dados podem ser processados em servidores localizados nos
            Estados Unidos (Google, Supabase, Stripe, Microsoft). Essas
            transferências ocorrem com base nas salvaguardas previstas no art. 33
            da LGPD, incluindo cláusulas contratuais padrão e certificações de
            privacidade reconhecidas internacionalmente.
          </p>
        </Section>

        <Section title="9. Menores de idade">
          <p>
            O WinLeads é destinado exclusivamente a profissionais maiores de 18
            anos. Não coletamos intencionalmente dados de menores.
          </p>
        </Section>

        <Section title="10. Alterações nesta política">
          <p>
            Esta política pode ser atualizada periodicamente. Em caso de
            alterações materiais, notificaremos você por e-mail ou mediante aviso
            na plataforma. A versão vigente está sempre disponível nesta página.
          </p>
        </Section>

        <Section title="11. Contato e DPO">
          <p>
            Para exercer seus direitos, esclarecer dúvidas ou registrar
            reclamações, entre em contato com nosso Encarregado de Dados (DPO):
          </p>
          <div className="mt-3 rounded-lg border p-4 text-sm space-y-1">
            <p>
              <strong>Empresa:</strong> {EMPRESA}
            </p>
            <p>
              <strong>CNPJ:</strong> {CNPJ}
            </p>
            <p>
              <strong>E-mail do DPO:</strong>{" "}
              <a
                href={`mailto:${DPO_EMAIL}`}
                className="underline hover:text-primary"
              >
                {DPO_EMAIL}
              </a>
            </p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Você também pode registrar reclamações perante a Autoridade Nacional
            de Proteção de Dados (ANPD) em{" "}
            <span className="underline">www.gov.br/anpd</span>.
          </p>
        </Section>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} WinLeads. {EMPRESA} – CNPJ {CNPJ}</span>
          <div className="flex items-center gap-4">
            <Link href="/termos" className="hover:text-foreground">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}
