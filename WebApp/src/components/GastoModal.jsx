import { useEffect, useRef, useState } from 'react';
import { X, Camera, Paperclip, Trash2, Receipt, ScanLine, CheckCircle2, AlertTriangle, Loader2, Info } from 'lucide-react';
import { cn, money } from '../utils/cn.js';
import { CATEGORIAS, MIMES_PERMITIDOS, MAX_ARCHIVO_BYTES, prepararArchivo, formatearTamano, vistaPrevia } from '../utils/files.js';
import { reconocerTexto, compararConOCR } from '../utils/ocr.js';
import * as api from '../services/api.js';

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ETIQUETA_OCR = {
  coincide: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', Icon: CheckCircle2 },
  difiere: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', Icon: AlertTriangle },
  'sin-importes': { text: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10', Icon: Info },
  'sin-monto': { text: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10', Icon: Info }
};

export default function GastoModal({ session, onClose, onSaved, showToast }) {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [nota, setNota] = useState('');

  const [archivo, setArchivo] = useState(null);
  const [archivoOcr, setArchivoOcr] = useState(null);
  const [archivoInfo, setArchivoInfo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [esLocal, setEsLocal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [ocr, setOcr] = useState(null);
  const [progreso, setProgreso] = useState(null);

  const inputFoto = useRef(null);
  const inputArchivo = useRef(null);

  const montoNum = Number(monto);
  const valido = concepto.trim() && montoNum > 0 && fecha && !guardando;

  useEffect(() => {
    api.getActiveMode().then((m) => setEsLocal(m !== 'd1'));
  }, []);

  // Object URL, no data URL: una factura de 10 MB en base64 dispara la memoria
  // del móvil. Al reemplazar o quitar la imagen se revoca la anterior.
  const ponerPreview = (url) => {
    setPreview((anterior) => {
      if (anterior?.url) URL.revokeObjectURL(anterior.url);
      return url ? { url } : null;
    });
  };

  // Cada archivo nuevo invalida el OCR anterior: los importes leidos ya no
  // corresponden a la imagen que se esta a punto de subir.
  async function elegirArchivo(file) {
    if (!file) return;
    setOcr(null);
    setProgreso(null);
    setAviso(null);

    if (!MIMES_PERMITIDOS.includes(file.type)) {
      setArchivo(null);
      setArchivoOcr(null);
      setArchivoInfo(null);
      setAviso('Formato no admitido. Usa JPG, PNG, WEBP o PDF.');
      return;
    }
    if (file.size > MAX_ARCHIVO_BYTES) {
      setArchivo(null);
      setArchivoOcr(null);
      setArchivoInfo(null);
      setAviso(`La factura pesa ${formatearTamano(file.size)} y el máximo es 10 MB.`);
      return;
    }

    setProcesando(true);
    try {
      const preparado = await prepararArchivo(file);
      setArchivo(preparado.subir);
      // Para un PDF, lo que Tesseract puede leer es la página rasterizada, no
      // el binario: sin esto el OCR de PDF no funcionaría nunca.
      setArchivoOcr(preparado.ocr);
      setArchivoInfo({
        nombre: preparado.subir.nombre,
        tamano: preparado.subir.blob.size,
        original: file.size,
        compressed: preparado.subir.blob.size < file.size,
        paginas: preparado.paginas,
        originalNombre: file.name
      });
      ponerPreview(await vistaPrevia(preparado.subir));
      setAviso(preparado.nota);
    } catch (err) {
      setArchivo(null);
      setArchivoOcr(null);
      setArchivoInfo(null);
      setAviso(err.message || 'No se pudo procesar el archivo.');
    } finally {
      setProcesando(false);
    }
  }

  function quitarArchivo() {
    setArchivo(null);
    setArchivoOcr(null);
    setArchivoInfo(null);
    ponerPreview(null);
    setOcr(null);
    setProgreso(null);
    setAviso(null);
    if (inputFoto.current) inputFoto.current.value = '';
    if (inputArchivo.current) inputArchivo.current.value = '';
  }

  async function correrOcr() {
    if (!archivo) return;
    setOcr(null);
    setAviso(null);

    if (!archivoOcr) {
      setAviso('No se pudo preparar una imagen legible de esta factura. Registra el gasto y descarga el archivo.');
      return;
    }

    setProcesando(true);
    setProgreso({ etiqueta: 'Preparando', pct: null });
    try {
      const { texto, ms } = await reconocerTexto(archivoOcr, setProgreso);
      const resultado = compararConOCR(montoNum, texto);
      setOcr({ ...resultado, texto, ms });
      if (resultado.estado === 'sin-importes') {
        setAviso('El OCR no encontró importes. Revisa la foto y escríbelo a mano.');
      }
    } catch (err) {
      setAviso(`El OCR no pudo ejecutarse: ${err.message}. Puedes registrar el gasto sin problema.`);
    } finally {
      setProcesando(false);
      setProgreso(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true);
    try {
      // Se sube el archivo original (o la imagen comprimida), no la imagen
      // rasterizada: el admin quiere descargar su factura tal cual.
      await api.addGasto(
        { concepto: concepto.trim(), monto: montoNum, fecha, categoria, nota: nota.trim() },
        archivo
      );
      onSaved(`Gasto de ${money(montoNum)} registrado.`);
    } catch (err) {
      if (err.message === 'no-auth') {
        onClose();
        return;
      }
      showToast(err.message || 'No se pudo registrar el gasto.', 'error');
    } finally {
      setGuardando(false);
    }
  }

  const ocrEstado = ocr ? ETIQUETA_OCR[ocr.estado] : null;
  const OcrIcon = ocrEstado?.Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto animate-[slideUp_0.35s_ease-out_both] rounded-t-3xl sm:rounded-3xl glass-panel shadow-2xl no-scrollbar"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/5 bg-slate-900/80 px-6 py-5 backdrop-blur-xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-[11px] font-medium uppercase tracking-wider text-amber-400">
            Salida de dinero
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">Nuevo gasto</h3>
          <p className="mt-0.5 text-xs text-slate-400">Reduce el saldo de caja y aumenta la deuda del grupo.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          {/* Concepto */}
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
            Concepto
          </label>
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej: Papelería para la exposición"
            className="mb-3 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
          />

          {/* Monto + Fecha */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Monto
              </label>
              <div className="relative">
                <Receipt className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 py-3 pl-10 pr-3 text-lg font-bold text-white outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>
          </div>

          {/* Categoría */}
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
            Categoría
          </label>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  categoria === c
                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Factura */}
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
            Factura o recibo (opcional)
          </label>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => inputFoto.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 py-2.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              <Camera className="h-4 w-4" />
              Tomar foto
            </button>
            <button
              type="button"
              onClick={() => inputArchivo.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-white/25"
            >
              <Paperclip className="h-4 w-4" />
              Adjuntar
            </button>
          </div>

          {/* capture="environment" abre la cámara trasera directo en el celular. */}
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => elegirArchivo(e.target.files?.[0])}
          />
          <input
            ref={inputArchivo}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => elegirArchivo(e.target.files?.[0])}
          />

          {esLocal && archivo && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Estás en modo local: la factura NO se guardará, solo los datos del gasto.</span>
            </div>
          )}

          {archivoInfo && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              {preview?.url && archivoInfo.nombre?.toLowerCase().endsWith('.jpg') ? (
                <img src={preview.url} alt="Vista previa de la factura" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                  <Receipt className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{archivoInfo.originalNombre}</p>
                <p className="text-[11px] text-slate-400">
                  {formatearTamano(archivoInfo.tamano)}
                  {archivoInfo.compressed && archivoInfo.original > archivoInfo.tamano
                    ? ` (de ${formatearTamano(archivoInfo.original)})`
                    : ''}
                  {archivoInfo.paginas ? ` · ${archivoInfo.paginas} páginas` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={quitarArchivo}
                className="rounded-lg p-1.5 text-slate-400 transition hover:text-rose-300"
                aria-label="Quitar archivo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {aviso && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{aviso}</span>
            </div>
          )}

          {/* OCR */}
          {archivo && (
            <div className="mb-3">
              <button
                type="button"
                onClick={correrOcr}
                disabled={procesando}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 py-2.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                {procesando ? 'Leyendo la factura…' : 'Verificar el total con OCR'}
              </button>

              {progreso && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                    {progreso.pct !== null && (
                      <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${progreso.pct}%` }} />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{progreso.etiqueta}</span>
                </div>
              )}

              {ocr && ocrEstado && (
                <div className={cn('mt-2 rounded-xl border px-3 py-2.5', ocrEstado.bg, ocrEstado.border)}>
                  <div className="flex items-center gap-2">
                    <OcrIcon className={cn('h-4 w-4 shrink-0', ocrEstado.text)} />
                    <span className={cn('text-xs font-semibold', ocrEstado.text)}>
                      {ocr.estado === 'coincide' && 'El OCR coincide con el monto capturado.'}
                      {ocr.estado === 'difiere' && 'El OCR leyó un importe distinto.'}
                      {ocr.estado === 'sin-importes' && 'No se detectaron importes en la imagen.'}
                      {ocr.estado === 'sin-monto' && 'Hay importes detectados, pero aún no capturaste el monto.'}
                    </span>
                  </div>
                  {ocr.mejor && (
                    <p className="mt-1 pl-6 text-[11px] text-slate-400">
                      Mejor candidato: <span className="font-semibold text-white">{money(ocr.mejor.valor)}</span>
                      {ocr.estado === 'difiere' && ` · diferencia ${money(Math.abs(ocr.diferencia))}`}
                    </p>
                  )}
                  {ocr.importes?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                      {ocr.importes.map((i) => (
                        <button
                          key={i.valor}
                          type="button"
                          onClick={() => setMonto(String(i.valor))}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-sky-400/40 hover:text-sky-300"
                          title={i.texto}
                        >
                          {money(i.valor)}
                        </button>
                      ))}
                    </div>
                  )}
                  <details className="group mt-2 pl-6">
                    <summary className="cursor-pointer text-[11px] text-slate-400 transition hover:text-slate-300">
                      Ver texto reconocido ({Math.round(ocr.ms / 100) / 10}s)
                    </summary>
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/60 p-2 text-[10px] text-slate-400 no-scrollbar">
                      {ocr.texto || '(vacío)'}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* Nota */}
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
            Nota (opcional)
          </label>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: Pagado en efectivo, ticket 0042…"
            className="mb-5 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
          />

          <button
            type="submit"
            disabled={!valido}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Registrar gasto de {money(montoNum || 0)}
          </button>

          <p className="mt-3 text-center text-[11px] text-slate-500">
            Registrado por: {session.nombre} ({session.rol})
          </p>
        </form>
      </div>
    </div>
  );
}
