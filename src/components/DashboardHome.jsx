import { useEffect } from 'react';
import { TrendingUp, Wallet, AlertTriangle, CheckCircle2, Users, CalendarDays, Sparkles } from 'lucide-react';
import { cn, money, weekLabel } from '../utils/cn.js';

function Card({ icon: Icon, label, value, sub, accent, delay = 0 }) {
  return (
    <div
      className={cn(
        'glass-card glass-card-hover relative overflow-hidden rounded-2xl p-5',
        'animate-[fadeUp_0.5s_ease-out_both]'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SemanaCard({ week, status, onNavigate }) {
  const members = status.members;
  let pagados = 0;
  let abonados = 0;
  let deudas = 0;
  let recaudado = 0;

  for (const m of members) {
    const key = `${m.numero_lista}-${week.id}`;
    const g = status.grouped?.[key];
    const abonado = g ? g.total : 0;
    recaudado += abonado;
    if (abonado >= week.monto_cuota) pagados++;
    else if (abonado > 0) abonados++;
    else deudas++;
  }

  const totalRec = money(recaudado);
  const totalEsperado = money(week.monto_cuota * members.length);

  return (
    <button
      onClick={() => onNavigate('planilla')}
      className="group glass-card glass-card-hover block w-full rounded-2xl p-4 text-left"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <CalendarDays className="h-4 w-4 text-emerald-400" />
          {weekLabel(week)}
        </div>
        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300">
          {money(week.monto_cuota)}/semana
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>Recaudado {totalRec} de {totalEsperado}</span>
        <span className="font-semibold text-slate-300">
          {pagados} pagados
        </span>
      </div>

      <div className="mt-2 flex gap-1.5">
        <span className="h-1 flex-1 rounded-full bg-emerald-500/80" />
        <span className="h-1 flex-1 rounded-full bg-amber-500/80" />
        <span className="h-1 flex-1 rounded-full bg-rose-500/80" />
      </div>

      <div className="mt-2 flex gap-2 text-[10px]">
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">{pagados}</span>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">{abonados}</span>
        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-300">{deudas}</span>
      </div>
    </button>
  );
}

export default function DashboardHome({ balance, status, onNavigate, session }) {
  const pct = balance.porcentajeCobro;

  return (
    <div className="space-y-6">
      <div className="animate-[fadeUp_0.5s_ease-out_both]">
        <h1 className="text-xl font-bold text-white">Hola, {session.nombre.split(' ')[0]} 👋</h1>
        <p className="mt-0.5 text-sm text-slate-400">Este es el estado financiero del grupo 3E2.</p>
      </div>

      {/* Tarjetas de balance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={Wallet}
          label="Total recaudado"
          value={money(balance.totalRecaudado)}
          sub={`de ${money(balance.totalEsperado)} esperados`}
          accent="bg-emerald-500/15 text-emerald-400"
          delay={0}
        />
        <Card
          icon={AlertTriangle}
          label="En deuda"
          value={money(balance.totalDeuda)}
          sub={`${balance.totalAlumnos} integrantes · ${balance.totalSemanas} semanas`}
          accent="bg-rose-500/15 text-rose-400"
          delay={80}
        />
        <Card
          icon={TrendingUp}
          label="Porcentaje cobrado"
          value={`${pct}%`}
          sub="del total proyectado"
          accent="bg-teal-500/15 text-teal-400"
          delay={160}
        />
        <Card
          icon={CheckCircle2}
          label="Grupo"
          value={`${balance.totalAlumnos}`}
          sub="integrantes inscritos"
          accent="bg-violet-500/15 text-violet-400"
          delay={240}
        />
      </div>

      {/* Barra de cumplimiento */}
      <div className="glass-panel rounded-2xl p-5 animate-[fadeUp_0.5s_ease-out_both] [animation-delay:200ms]">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Cumplimiento global
          </span>
          <span className="font-bold text-emerald-400">{pct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-1000"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      {/* Progreso semanal cerca */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Users className="h-4 w-4 text-emerald-400" />
            Progreso semanal
          </h2>
          <button
            onClick={() => onNavigate('planilla')}
            className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
          >
            Ver planilla →
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...status.weeks].slice(-6).reverse().map((w) => (
            <SemanaCard key={w.id} week={w} status={status} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}