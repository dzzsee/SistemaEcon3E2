import { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Paperclip,
  ScanLine,
  Trash2,
  X
} from 'lucide-react-native';
import { money } from '../utils/cn.js';
import * as api from '../services/api.js';
import {
  CATEGORIAS,
  elegirDeGaleria,
  elegirPdf,
  formatearTamano,
  prepararArchivo,
  tomarFoto
} from '../services/files.js';
import { Card, Chip, Field, Label, PrimaryButton } from './ui.jsx';

function aISO(date) {
  const d = date instanceof Date ? date : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function GastoModal({ session, onClose, onSaved, showToast }) {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [nota, setNota] = useState('');

  const [archivo, setArchivo] = useState(null);
  const [archivoInfo, setArchivoInfo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const montoNum = Number(monto);
  const valido = concepto.trim() && montoNum > 0 && !guardando;

  async function ponerArchivo(seleccionado) {
    if (!seleccionado) return;
    setAviso(null);
    setProcesando(true);
    try {
      const preparado = await prepararArchivo(seleccionado);
      setArchivo(preparado);
      setArchivoInfo({
        nombre: preparado.nombre,
        tamano: preparado.size,
        mime: preparado.mime,
        comprimido: preparado.comprimido
      });
    } catch (error) {
      setArchivo(null);
      setArchivoInfo(null);
      setAviso(error?.message || 'No se pudo procesar el archivo.');
    } finally {
      setProcesando(false);
    }
  }

  async function desdeCamara() {
    try {
      await ponerArchivo(await tomarFoto());
    } catch (error) {
      setAviso(error?.message || 'No se pudo abrir la cámara.');
    }
  }

  async function desdeGaleria() {
    try {
      await ponerArchivo(await elegirDeGaleria());
    } catch (error) {
      setAviso(error?.message || 'No se pudo abrir la galería.');
    }
  }

  async function desdePdf() {
    try {
      await ponerArchivo(await elegirPdf());
    } catch (error) {
      setAviso(error?.message || 'No se pudo abrir el PDF.');
    }
  }

  function quitarArchivo() {
    setArchivo(null);
    setArchivoInfo(null);
    setAviso(null);
  }

  async function handleSubmit() {
    if (!valido) return;
    setGuardando(true);
    try {
      await api.addGasto(
        {
          concepto: concepto.trim(),
          monto: montoNum,
          fecha: aISO(fecha),
          categoria,
          nota: nota.trim()
        },
        archivo
      );
      onSaved(`Gasto de ${money(montoNum)} registrado.`);
    } catch (error) {
      showToast?.(error?.message || 'No se pudo registrar el gasto.', 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/60">
        <Pressable onPress={() => {}}>
          <Card className="max-h-[92%] rounded-t-3xl">
            <ScrollView keyboardShouldPersistTaps="handled">
              <View className="relative border-b border-white/5 px-6 py-5">
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-1.5"
                >
                  <X size={16} color="#94a3b8" />
                </Pressable>
                <Text className="text-[11px] font-medium uppercase tracking-wider text-amber-400">
                  Salida de dinero
                </Text>
                <Text className="mt-1 text-lg font-bold text-white">Nuevo gasto</Text>
                <Text className="mt-0.5 text-xs text-slate-400">
                  Reduce el saldo de caja y aumenta la deuda del grupo.
                </Text>
              </View>

              <View className="px-6 py-5">
                <Field
                  label="Concepto"
                  value={concepto}
                  onChangeText={setConcepto}
                  placeholder="Ej: Papelería para la exposición"
                />

                <View className="mb-3 flex-row gap-3">
                  <View className="flex-1">
                    <Label>Monto</Label>
                    <View className="flex-row items-center rounded-xl border border-white/10 bg-slate-950/80 px-3">
                      <FileText size={16} color="#fbbf24" />
                      <TextInput
                        value={monto}
                        onChangeText={setMonto}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#64748b"
                        className="flex-1 py-3 pl-2 text-lg font-bold text-white"
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Label>Fecha</Label>
                    <Pressable
                      onPress={() => setMostrarFecha(true)}
                      className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5"
                    >
                      <Text className="text-sm text-white">{aISO(fecha)}</Text>
                    </Pressable>
                    {mostrarFecha ? (
                      <DateTimePicker
                        value={fecha}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, selected) => {
                          setMostrarFecha(false);
                          if (selected) setFecha(selected);
                        }}
                      />
                    ) : null}
                  </View>
                </View>

                <Label>Categoría</Label>
                <View className="mb-3 flex-row flex-wrap gap-1.5">
                  {CATEGORIAS.map((c) => (
                    <Chip key={c} active={categoria === c} onPress={() => setCategoria(c)}>
                      {c}
                    </Chip>
                  ))}
                </View>

                <Label>Factura o recibo (opcional)</Label>
                <View className="mb-3 flex-row gap-2">
                  <Pressable
                    onPress={desdeCamara}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 py-2.5 active:opacity-70"
                  >
                    <Camera size={16} color="#fcd34d" />
                    <Text className="text-xs font-semibold text-amber-300">Tomar foto</Text>
                  </Pressable>
                  <Pressable
                    onPress={desdeGaleria}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 active:opacity-70"
                  >
                    <Paperclip size={16} color="#cbd5e1" />
                    <Text className="text-xs font-semibold text-slate-300">Galería</Text>
                  </Pressable>
                  <Pressable
                    onPress={desdePdf}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 active:opacity-70"
                  >
                    <FileText size={16} color="#cbd5e1" />
                    <Text className="text-xs font-semibold text-slate-300">PDF</Text>
                  </Pressable>
                </View>

                {procesando ? (
                  <View className="mb-3 flex-row items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <Loader2 size={16} color="#fbbf24" />
                    <Text className="text-xs text-slate-300">Preparando la factura…</Text>
                  </View>
                ) : null}

                {archivoInfo ? (
                  <View className="mb-3 flex-row items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    {archivoInfo.mime !== 'application/pdf' && archivo?.uri ? (
                      <Image source={{ uri: archivo.uri }} className="h-14 w-14 rounded-lg" />
                    ) : (
                      <View className="h-14 w-14 items-center justify-center rounded-lg bg-slate-800">
                        <FileText size={22} color="#94a3b8" />
                      </View>
                    )}
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-xs font-semibold text-white">
                        {archivoInfo.nombre}
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        {formatearTamano(archivoInfo.tamano)}
                        {archivoInfo.comprimido ? ' · comprimida' : ''}
                      </Text>
                    </View>
                    <Pressable onPress={quitarArchivo} hitSlop={8}>
                      <Trash2 size={17} color="#fda4af" />
                    </Pressable>
                  </View>
                ) : null}

                <Pressable
                  onPress={() =>
                    showToast?.('OCR no disponible en Expo Go. Escribe el monto manualmente.', 'info')
                  }
                  className="mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 py-2.5 active:opacity-70"
                >
                  <ScanLine size={16} color="#7dd3fc" />
                  <Text className="text-xs font-semibold text-sky-300">Verificar el total con OCR</Text>
                </Pressable>

                {aviso ? (
                  <View className="mb-3 flex-row items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                    <AlertTriangle size={15} color="#fcd34d" />
                    <Text className="flex-1 text-[11px] text-amber-200">{aviso}</Text>
                  </View>
                ) : null}

                <View className="mb-3 flex-row items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <Info size={15} color="#94a3b8" />
                  <Text className="flex-1 text-[11px] text-slate-400">
                    La factura se guarda en este dispositivo y se puede compartir desde la lista de gastos.
                  </Text>
                </View>

                <Field
                  label="Nota (opcional)"
                  value={nota}
                  onChangeText={setNota}
                  placeholder="Ej: Pagado en efectivo, ticket 0042…"
                  className="mb-5"
                />

                <PrimaryButton
                  onPress={handleSubmit}
                  disabled={!valido}
                  loading={guardando}
                  icon={CheckCircle2}
                  className="bg-amber-500"
                >
                  Registrar gasto de {money(montoNum || 0)}
                </PrimaryButton>

                <Text className="mt-3 text-center text-[11px] text-slate-500">
                  Registrado por: {session?.nombre} ({session?.rol})
                </Text>
              </View>
            </ScrollView>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
