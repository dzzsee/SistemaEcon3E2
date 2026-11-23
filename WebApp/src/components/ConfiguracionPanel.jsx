import { useEffect, useState } from 'react';
import { CalendarCog, Check, Coins, RefreshCw, Save, Users } from 'lucide-react';
import { cn } from '../utils/cn.js';
import * as api from '../services/api.js';

const ROLES = { tutor: 'Tutor(a)', presidente: 'Presidente', tesorero: 'Tesorero' };

export default function ConfiguracionPanel({ refresh, showToast }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ cuota_semanal: '', periodo_inicio: '', periodo_fin: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const result = await api.getConfig();
      setData(result);
      setForm(result.config);
    } catch (error) {
      showToast(error.message || 'No se pudo cargar la configuración.', 'error');
    }
  }

  useEffect(() => { load(); }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.saveConfig({ ...form, cuota_semanal: Number(form.cuota_semanal) });
      if (!result.success) throw new Error(result.message);
      setData((current) => ({ ...current, config: result.config }));
      showToast('Configuración guardada.');
      await refresh();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar.', 'error');
    } finally { setBusy(false); }
  }

  async function regenerate() {
    if (!window.confirm('¿Reconstruir las semanas? Se eliminarán las semanas fuera del nuevo periodo y sus abonos.')) return;
    setBusy(true);
    try {
      const result = await api.regenerateWeeks({ ...form, cuota_semanal: Number(form.cuota_semanal) });
      if (!result.success) throw new Error(result.message);
      showToast(`Periodo regenerado: ${result.weeks} semanas.`);
      await refresh();
      await load();
    } catch (error) {
      showToast(error.message || 'No se pudo regenerar el periodo.', 'error');
    } finally { setBusy(false); }
  }

  async function saveAdmin(admin) {
    const result = await api.updateAdmin({
      id: admin.id,
      nombre: admin.nombre,
      usuario: admin.usuario,
      pin: admin.pin || ''
    });
    if (!result.success) throw new Error(result.message);
    setData((current) => ({ ...current, admins: result.admins }));
    showToast('Usuario actualizado.');
  }

  if (!data) return <div className="py-24 text-center text-sm text-slate-400">Cargando configuración...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white"><CalendarCog className="h-5 w-5 text-emerald-400" />Configuración</h1>
        <p className="mt-0.5 text-sm text-slate-400">Cuota semanal, periodo lectivo y acceso de administradores.</p>
      </div>

      <section className="glass-panel rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white"><Coins className="h-4 w-4 text-emerald-400" />Cuota y periodo lectivo</h2>
        <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="text-xs text-slate-400">Cuota semanal ($)<input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" type="number" min="0.01" step="0.01" name="cuota_semanal" value={form.cuota_semanal} onChange={updateField} required /></label>
          <label className="text-xs text-slate-400">Inicio del periodo<input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" type="date" name="periodo_inicio" value={form.periodo_inicio} onChange={updateField} required /></label>
          <label className="text-xs text-slate-400">Fin del periodo<input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" type="date" name="periodo_fin" value={form.periodo_fin} onChange={updateField} required /></label>
          <div className="flex items-end gap-2">
            <button type="button" onClick={regenerate} disabled={busy} className="flex items-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300"><RefreshCw className="h-3.5 w-3.5" />Regenerar</button>
            <button type="submit" disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white"><Save className="h-3.5 w-3.5" />Guardar</button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">Guardar actualiza la cuota. Regenerar reconstruye el calendario y conserva los abonos dentro del periodo.</p>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white"><Users className="h-4 w-4 text-emerald-400" />Usuarios administradores</h2>
        <div className="mt-4 space-y-3">
          {data.admins.map((admin) => <AdminRow key={admin.id} admin={admin} onSave={saveAdmin} />)}
        </div>
      </section>
    </div>
  );
}

function AdminRow({ admin, onSave }) {
  const [form, setForm] = useState({ ...admin, pin: '' });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  return <div className="grid gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
    <label className="text-xs text-slate-400">Nombre<input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" name="nombre" value={form.nombre} onChange={update} /></label>
    <label className="text-xs text-slate-400">Usuario<input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" name="usuario" value={form.usuario} onChange={update} /></label>
    <label className="text-xs text-slate-400">PIN nuevo (opcional)<input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" type="password" name="pin" placeholder="••••" value={form.pin} onChange={update} /></label>
    <div className="flex items-center justify-between gap-3"><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300">{ROLES[admin.rol] || admin.rol}</span><button type="button" onClick={() => onSave(form)} className={cn('flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white')}><Check className="h-3.5 w-3.5" />Guardar</button></div>
  </div>;
}