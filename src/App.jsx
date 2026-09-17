import { useCallback, useEffect, useState } from 'react';
import { LogOut, LayoutDashboard, Table2, Users, FileDown, Wallet } from 'lucide-react';
import LoginPage from './components/LoginPage.jsx';
import DashboardHome from './components/DashboardHome.jsx';
import Planilla from './components/Planilla.jsx';
import AlumnosPanel from './components/AlumnosPanel.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import Toast from './components/Toast.jsx';
import { cn, rolInfo } from './utils/cn.js';
import * as api from './services/api.js';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'planilla', label: 'Planilla', icon: Table2 },
  { id: 'alumnos', label: 'Alumnos', icon: Users },
  { id: 'exportar', label: 'Exportar', icon: FileDown }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState('resumen');
  const [status, setStatus] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [st, bal] = await Promise.all([api.getStatus(), api.getBalance()]);
      setStatus(st);
      setBalance(bal);
    } catch (e) {
      if (e.message === 'no-auth') {
        await api.logout();
        setSession(null);
        showToast('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    api.getSession().then((s) => {
      setSession(s);
      setChecked(true);
    });
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session, loadData]);

  async function handleLogin(user) {
    setSession(user);
    showToast(`Bienvenido, ${user.nombre}.`);
  }

  async function handleLogout() {
    await api.logout();
    setSession(null);
    setStatus(null);
    setBalance(null);
    setTab('resumen');
  }

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950" />;
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const info = rolInfo(session.rol);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* fondo decorativo */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-teal-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <button onClick={() => setTab('resumen')} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-500/25">
              <Wallet className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold leading-tight text-white">Control 3E2</p>
              <p className="text-[10px] leading-tight text-slate-400">Cuotas semanales</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <div className={cn('hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium sm:flex', info.color)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', info.dot)} />
              {info.label} · {session.nombre}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-[57px] z-30 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 no-scrollbar">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 shadow-inner'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl animate-[fadeUp_0.35s_ease-out_both] px-4 py-6 pb-28">
        {loading && !status && (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
          </div>
        )}

        {!loading && status && balance && (
          <>
            {tab === 'resumen' && (
              <DashboardHome
                balance={balance}
                status={status}
                onNavigate={setTab}
                refresh={refresh}
                session={session}
              />
            )}
            {tab === 'planilla' && (
              <Planilla status={status} balance={balance} refresh={refresh} session={session} showToast={showToast} />
            )}
            {tab === 'alumnos' && (
              <AlumnosPanel status={status} balance={balance} session={session} showToast={showToast} />
            )}
            {tab === 'exportar' && (
              <ExportPanel status={status} balance={balance} session={session} showToast={showToast} />
            )}
          </>
        )}
      </main>

      {/* Bottom nav móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/90 backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition',
                  active ? 'text-emerald-400' : 'text-slate-500'
                )}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {toast && <Toast key={toast.id} toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}