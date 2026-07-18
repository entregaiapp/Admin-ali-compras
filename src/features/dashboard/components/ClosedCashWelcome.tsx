import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BadgePercent,
  Check,
  CheckCircle2,
  ExternalLink,
  PackageCheck,
  Printer,
  Rocket,
  Share2,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import entregaiLogo from '@/assets/logo.png';
import './ClosedCashWelcome.css';

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  icon: typeof Share2;
  theme: {
    card: string;
    accent: string;
    icon: string;
    number: string;
    action: string;
    glow: string;
  };
  action?: {
    label: string;
    path: string;
  };
};

type ClosedCashWelcomeProps = {
  firstName: string;
  primaryColor: string;
  storageDate: string;
  onStart: () => void;
};

const MOTIVATIONAL_MESSAGES = [
  'Cada pedido começa com uma operação bem preparada.',
  'Organização no início do dia transforma movimento em resultado.',
  'Hoje é uma nova oportunidade para encantar cada cliente.',
  'Pequenos cuidados agora fazem uma grande diferença ao longo do dia.',
  'Uma equipe preparada entrega experiências ainda melhores.',
  'Um bom começo deixa todo o restante do dia mais leve.',
  'Cada detalhe bem cuidado fortalece a confiança dos clientes.',
  'Grandes resultados nascem de uma rotina feita com atenção.',
  'Seu trabalho de hoje ajuda a construir o sucesso de amanhã.',
  'Atender bem é transformar cada pedido em uma boa lembrança.',
  'Uma operação organizada abre espaço para novas conquistas.',
  'Comece com foco, siga com constância e termine com orgulho.',
  'Cada cliente satisfeito é uma nova oportunidade que se abre.',
  'Preparação, dedicação e carinho fazem a diferença em cada entrega.',
  'O melhor resultado começa com o primeiro passo bem-feito.',
  'Hoje é um ótimo dia para superar expectativas.',
  'Consistência no atendimento transforma clientes em parceiros.',
  'Quando a equipe está pronta, o sucesso encontra o caminho.',
  'Uma loja bem preparada transmite confiança desde o primeiro pedido.',
  'A excelência está nos pequenos cuidados repetidos todos os dias.',
  'Cada pedido atendido com atenção aproxima a loja dos seus clientes.',
  'Energia positiva e organização formam uma combinação poderosa.',
  'Faça de cada atendimento uma razão para o cliente voltar.',
  'O movimento do dia começa com a confiança de quem se preparou.',
  'Boas experiências são entregues por pessoas que cuidam dos detalhes.',
  'Mais do que pedidos, hoje você pode entregar satisfação.',
  'Um dia produtivo começa com prioridades bem definidas.',
  'A dedicação de agora será percebida em cada entrega.',
  'Sua atenção transforma tarefas simples em resultados extraordinários.',
  'Cada nova manhã traz espaço para aprender, melhorar e crescer.',
  'Trabalhar com propósito torna cada conquista ainda mais especial.',
  'Uma rotina bem organizada deixa o talento da equipe aparecer.',
  'O cuidado antes da abertura evita obstáculos durante a operação.',
  'Clientes felizes são o reflexo de uma equipe comprometida.',
  'Prepare tudo com carinho e deixe o seu melhor acontecer.',
];

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'share-customer-link',
    title: 'Divulgar o link do cliente nas redes sociais',
    description: 'Lembre seus clientes de que a loja está pronta para receber pedidos.',
    icon: Share2,
    theme: {
      card: 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 hover:border-sky-300 hover:shadow-sky-100/80',
      accent: 'bg-sky-500',
      icon: 'bg-sky-500 text-white shadow-sky-200',
      number: 'bg-sky-100 text-sky-700',
      action: 'text-sky-700 hover:bg-sky-100/80',
      glow: 'bg-sky-300',
    },
  },
  {
    id: 'review-promotions',
    title: 'Conferir as promoções',
    description: 'Ative as campanhas do dia e desative as que já terminaram.',
    icon: BadgePercent,
    theme: {
      card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 hover:border-amber-300 hover:shadow-amber-100/80',
      accent: 'bg-amber-500',
      icon: 'bg-amber-500 text-white shadow-amber-200',
      number: 'bg-amber-100 text-amber-700',
      action: 'text-amber-700 hover:bg-amber-100/80',
      glow: 'bg-amber-300',
    },
    action: { label: 'Ver promoções', path: '/promotions' },
  },
  {
    id: 'check-print-agent',
    title: 'Conferir o Entregaí Print Agent',
    description: 'Verifique se o agente está ativo e faça uma impressão de teste em Configurações > Impressão.',
    icon: Printer,
    theme: {
      card: 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 hover:border-violet-300 hover:shadow-violet-100/80',
      accent: 'bg-violet-500',
      icon: 'bg-violet-500 text-white shadow-violet-200',
      number: 'bg-violet-100 text-violet-700',
      action: 'text-violet-700 hover:bg-violet-100/80',
      glow: 'bg-violet-300',
    },
    action: { label: 'Ir para configurações', path: '/settings' },
  },
  {
    id: 'review-catalog',
    title: 'Revisar produtos, estoque e horários',
    description: 'Confirme se o catálogo e a disponibilidade de hoje estão atualizados.',
    icon: PackageCheck,
    theme: {
      card: 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-pink-50 hover:border-rose-300 hover:shadow-rose-100/80',
      accent: 'bg-rose-500',
      icon: 'bg-rose-500 text-white shadow-rose-200',
      number: 'bg-rose-100 text-rose-700',
      action: 'text-rose-700 hover:bg-rose-100/80',
      glow: 'bg-rose-300',
    },
    action: { label: 'Ver produtos', path: '/products' },
  },
  {
    id: 'open-cash',
    title: 'Abrir o caixa',
    description: 'Prepare o caixa para começar a operação e receber os pedidos do dia.',
    icon: WalletCards,
    theme: {
      card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 hover:border-emerald-300 hover:shadow-emerald-100/80',
      accent: 'bg-emerald-500',
      icon: 'bg-emerald-500 text-white shadow-emerald-200',
      number: 'bg-emerald-100 text-emerald-700',
      action: 'text-emerald-700 hover:bg-emerald-100/80',
      glow: 'bg-emerald-300',
    },
    action: { label: 'Ir para o caixa', path: '/cash' },
  },
];

const getChecklistStorageKey = (storageDate: string) =>
  `entregai_admin_daily_checklist:${storageDate}`;

const readStoredChecklist = (storageDate: string) => {
  try {
    const stored = JSON.parse(localStorage.getItem(getChecklistStorageKey(storageDate)) || '[]');
    if (!Array.isArray(stored)) return [];

    const validIds = new Set(CHECKLIST_ITEMS.map((item) => item.id));
    return stored.filter((id): id is string => typeof id === 'string' && validIds.has(id));
  } catch {
    return [];
  }
};

export function ClosedCashWelcome({
  firstName,
  primaryColor,
  storageDate,
  onStart,
}: ClosedCashWelcomeProps) {
  const navigate = useNavigate();
  const [completedIds, setCompletedIds] = useState<string[]>(() => readStoredChecklist(storageDate));
  const [motivationalMessage] = useState(
    () => MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)],
  );
  const [showStartMessage, setShowStartMessage] = useState(false);
  const [startMessageVisible, setStartMessageVisible] = useState(false);

  const completedCount = completedIds.length;
  const progress = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

  const toggleItem = (itemId: string) => {
    setCompletedIds((current) => {
      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];

      try {
        localStorage.setItem(getChecklistStorageKey(storageDate), JSON.stringify(next));
      } catch {
        // O checklist continua funcional durante esta sessão se o armazenamento estiver indisponível.
      }

      return next;
    });
  };

  useEffect(() => {
    if (!showStartMessage) return;

    const fadeInTimer = window.setTimeout(() => setStartMessageVisible(true), 30);
    const fadeOutTimer = window.setTimeout(() => setStartMessageVisible(false), 1800);
    const finishTimer = window.setTimeout(onStart, 2500);

    return () => {
      window.clearTimeout(fadeInTimer);
      window.clearTimeout(fadeOutTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onStart, showStartMessage]);

  return (
    <div className="flex min-h-full flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <section className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {showStartMessage && (
          <div
            className={`absolute inset-0 z-50 flex items-center justify-center bg-white/75 p-6 text-center backdrop-blur-md transition-opacity duration-700 ease-in-out ${
              startMessageVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.82) 0%, rgba(240,249,255,0.76) 50%, rgba(236,253,245,0.78) 100%)',
            }}
            role="status"
            aria-live="polite"
          >
            <div className="relative max-w-5xl">
              <span className="pointer-events-none absolute left-1/2 top-8 h-28 w-28 -translate-x-1/2 rounded-full bg-emerald-300/40 blur-3xl" />
              <img
                src={entregaiLogo}
                alt="Entregaí"
                className="entregai-start-logo relative mx-auto mb-8 h-28 w-28 object-contain drop-shadow-xl sm:h-36 sm:w-36"
              />
              <p
                className="text-4xl font-bold leading-tight tracking-tight drop-shadow-sm sm:text-5xl lg:text-6xl"
                style={{ color: primaryColor }}
              >
                A equipe do Entregaí te deseja boas vendas!
              </p>
            </div>
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.08]"
          style={{
            background: `radial-gradient(circle at 15% 20%, ${primaryColor} 0, transparent 42%), radial-gradient(circle at 85% 0%, #16a34a 0, transparent 34%)`,
          }}
        />

        <div className="relative flex flex-1 flex-col px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-11">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div
                className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Preparação do dia
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Boas-vindas novamente, {firstName}!
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Antes de começar a operação, reserve um momento para conferir os pontos essenciais abaixo.
              </p>
            </div>

            <blockquote className="relative max-w-md overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 text-sm leading-6 text-emerald-950 shadow-sm lg:w-[360px]">
              <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-200/50 blur-2xl" />
              <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-700">
                <Sparkles className="h-4 w-4" />
                Para começar bem
              </div>
              “{motivationalMessage}”
            </blockquote>
          </div>

          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Checklist de abertura</h2>
            </div>
            <span className="shrink-0 text-sm font-semibold text-slate-600">
              {completedCount} de {CHECKLIST_ITEMS.length}
            </span>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner" aria-hidden="true">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-500 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {CHECKLIST_ITEMS.map((item, index) => {
              const checked = completedIds.includes(item.id);
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className={`group relative flex min-h-[112px] items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                    checked
                      ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-emerald-100/70'
                      : item.theme.card
                  } ${index === CHECKLIST_ITEMS.length - 1 ? 'lg:col-span-2' : ''}`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1 ${checked ? 'bg-emerald-500' : item.theme.accent}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`pointer-events-none absolute -bottom-10 -right-8 h-24 w-24 rounded-full opacity-20 blur-2xl ${
                      checked ? 'bg-emerald-300' : item.theme.glow
                    }`}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="relative flex min-w-0 flex-1 items-start gap-3 pl-1 text-left"
                    aria-pressed={checked}
                    aria-label={`${checked ? 'Desmarcar' : 'Marcar'}: ${item.title}`}
                  >
                    <span
                      className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform duration-200 group-hover:scale-105 ${
                        checked ? 'bg-emerald-600 text-white shadow-emerald-200' : item.theme.icon
                      }`}
                    >
                      {checked ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${checked ? 'bg-emerald-100 text-emerald-700' : item.theme.number}`}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className={`block text-sm font-semibold ${checked ? 'text-emerald-900' : 'text-slate-900'}`}>
                          {item.title}
                        </span>
                      </span>
                      <span className={`mt-1 block text-xs leading-5 ${checked ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {item.description}
                      </span>
                    </span>
                  </button>

                  {item.action && (
                    <button
                      type="button"
                      onClick={() => navigate(item.action!.path)}
                      className={`relative mt-1 hidden shrink-0 items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors sm:inline-flex ${
                        checked ? 'text-emerald-700 hover:bg-emerald-100' : item.theme.action
                      }`}
                    >
                      {item.action.label}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-auto flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-7 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Você pode iniciar mesmo que ainda existam itens pendentes.
            </div>
            <button
              type="button"
              onClick={() => setShowStartMessage(true)}
              disabled={showStartMessage}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-70 sm:w-auto"
              style={{ backgroundColor: primaryColor }}
            >
              <Rocket className="h-4 w-4" />
              Iniciar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
