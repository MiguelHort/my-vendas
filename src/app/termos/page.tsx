import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos e condições de uso do WinLeads.",
};

const VERSAO = "1.0";
const VIGENCIA = "12 de maio de 2025";
const EMPRESA = "Victor Hugo Sistemas LTDA";
const CNPJ = "54.046.645/0001-94";
const CONTATO_EMAIL = "contato@winleads.com.br";

export default function TermosPage() {
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
            Termos de Uso
          </h1>
          <p className="text-muted-foreground">
            Este instrumento regula a utilização do serviço{" "}
            <strong>WinLeads</strong>, de titularidade de{" "}
            <strong>{EMPRESA}</strong> (CNPJ {CNPJ}), doravante denominada{" "}
            <strong>&quot;WinLeads&quot;</strong> ou <strong>&quot;nós&quot;</strong>, pelo usuário cadastrado,
            doravante denominado <strong>&quot;Usuário&quot;</strong> ou{" "}
            <strong>&quot;você&quot;</strong>. Ao criar uma conta ou utilizar o serviço,
            você declara ter lido, compreendido e aceito estes Termos em sua
            integralidade.
          </p>
        </div>

        <Section title="1. Objeto">
          <p>
            O WinLeads é uma plataforma de CRM (Customer Relationship
            Management) voltada a corretores de planos de saúde, que oferece
            funcionalidades para gestão de leads, funil de vendas, controle de
            comissões, relatórios e ferramentas de produtividade.
          </p>
          <p>
            O acesso ao serviço é fornecido como Software como Serviço (SaaS),
            mediante assinatura ou período de avaliação gratuita, conforme
            descrito na página de planos.
          </p>
        </Section>

        <Section title="2. Cadastro e conta">
          <p>
            O cadastro é realizado exclusivamente via autenticação Google (OAuth
            2.0). Ao realizar o login pela primeira vez, uma conta é criada
            automaticamente com os dados fornecidos pelo Google (nome e e-mail).
          </p>
          <p>
            Você é responsável pela confidencialidade da sua conta Google e por
            todas as atividades realizadas em sua conta WinLeads. Notifique-nos
            imediatamente em caso de acesso não autorizado.
          </p>
        </Section>

        <Section title="3. Período de avaliação e assinatura">
          <p>
            Novos usuários têm acesso gratuito por <strong>7 (sete) dias</strong>{" "}
            a partir do cadastro, sem necessidade de informar dados de pagamento.
            Após esse período, o acesso fica condicionado à contratação de um
            plano pago.
          </p>
          <p>
            Os planos e valores vigentes estão disponíveis na{" "}
            <Link href="/planos" className="underline">
              página de planos
            </Link>
            . Os preços podem ser alterados com aviso prévio de 30 (trinta)
            dias.
          </p>
        </Section>

        <Section title="4. Pagamento">
          <p>
            Os pagamentos são processados pela <strong>Stripe Inc.</strong>, de
            forma segura e criptografada. Não armazenamos dados de cartão de
            crédito. As cobranças são recorrentes (mensais ou anuais, conforme o
            plano escolhido) e processadas automaticamente na data de renovação.
          </p>
          <p>
            Em caso de falha no pagamento, o acesso pode ser suspenso após
            notificação por e-mail. O desbloqueio ocorre automaticamente após a
            regularização do pagamento.
          </p>
        </Section>

        <Section title="5. Cancelamento">
          <p>
            Você pode cancelar sua assinatura a qualquer momento, diretamente na
            plataforma ou pelo portal do cliente Stripe. O cancelamento encerra a
            renovação automática, mantendo o acesso até o fim do período já pago.
          </p>
          <p>
            Não há reembolso proporcional para períodos não utilizados, exceto
            nos casos previstos no Código de Defesa do Consumidor (Lei nº
            8.078/90), incluindo o direito de arrependimento em até 7 dias após a
            contratação.
          </p>
        </Section>

        <Section title="6. Exclusão de conta">
          <p>
            Você pode solicitar a exclusão definitiva da sua conta e de todos os
            seus dados em <strong>Configurações → Minha Conta</strong>. A
            exclusão é irreversível e remove todos os dados pessoais e
            informações inseridas na plataforma, respeitados os prazos de
            retenção previstos em lei.
          </p>
        </Section>

        <Section title="7. Propriedade intelectual">
          <p>
            Todo o conteúdo da plataforma — código-fonte, interface, marca,
            logotipos e textos — é de propriedade exclusiva da WinLeads e
            protegido pela legislação de propriedade intelectual brasileira (Lei
            nº 9.610/98 e Lei nº 9.279/96). É vedada a reprodução, distribuição
            ou engenharia reversa sem autorização expressa.
          </p>
          <p>
            Os dados inseridos por você na plataforma (leads, comissões, etc.)
            pertencem a você. A WinLeads não reivindica propriedade sobre esse
            conteúdo.
          </p>
        </Section>

        <Section title="8. Uso aceitável">
          <p>É vedado ao Usuário:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Utilizar a plataforma para finalidades ilegais ou contrárias à boa-fé.</li>
            <li>Compartilhar sua conta com terceiros não autorizados.</li>
            <li>Tentar acessar áreas restritas ou dados de outros usuários.</li>
            <li>Inserir dados falsos, maliciosos ou que violem direitos de terceiros.</li>
            <li>Realizar engenharia reversa, descompilação ou tentativa de extração do código-fonte.</li>
          </ul>
        </Section>

        <Section title="9. Limitação de responsabilidade">
          <p>
            O WinLeads é fornecido &quot;como está&quot;, sem garantia de disponibilidade
            ininterrupta. Não nos responsabilizamos por:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Perdas de negócio decorrentes de indisponibilidade do serviço.</li>
            <li>Decisões comerciais tomadas com base nas informações da plataforma.</li>
            <li>Danos causados por falhas em serviços de terceiros (Google, Stripe, Supabase).</li>
            <li>Perda de dados por ação ou omissão do próprio Usuário.</li>
          </ul>
          <p className="mt-2">
            Em qualquer hipótese, nossa responsabilidade fica limitada ao valor
            pago pelo Usuário nos últimos 3 (três) meses.
          </p>
        </Section>

        <Section title="10. Privacidade">
          <p>
            O tratamento de dados pessoais é regido pela nossa{" "}
            <Link href="/privacidade" className="underline">
              Política de Privacidade
            </Link>
            , que integra estes Termos por referência.
          </p>
        </Section>

        <Section title="11. Modificações">
          <p>
            Reservamo-nos o direito de modificar estes Termos a qualquer momento.
            Alterações materiais serão comunicadas com antecedência mínima de 15
            (quinze) dias por e-mail ou aviso na plataforma. O uso continuado
            após a vigência das alterações constitui aceite das novas condições.
          </p>
        </Section>

        <Section title="12. Foro e legislação aplicável">
          <p>
            Estes Termos são regidos pelas leis da República Federativa do
            Brasil. Fica eleito o foro da comarca de São Paulo – SP para dirimir
            quaisquer controvérsias decorrentes deste instrumento, com renúncia
            expressa a qualquer outro, por mais privilegiado que seja.
          </p>
        </Section>

        <Section title="13. Contato">
          <p>
            Em caso de dúvidas sobre estes Termos, entre em contato:
          </p>
          <div className="mt-3 rounded-lg border p-4 text-sm space-y-1">
            <p>
              <strong>Empresa:</strong> {EMPRESA}
            </p>
            <p>
              <strong>CNPJ:</strong> {CNPJ}
            </p>
            <p>
              <strong>E-mail:</strong>{" "}
              <a
                href={`mailto:${CONTATO_EMAIL}`}
                className="underline hover:text-primary"
              >
                {CONTATO_EMAIL}
              </a>
            </p>
          </div>
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
