import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync
} from 'expo-image-picker';
import { getDocumentAsync } from 'expo-document-picker';

export const CATEGORIAS = ['Papelería', 'Eventos', 'Transporte', 'Materiales', 'Otros'];
export const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024;

const DIRECTORIO = new Directory(Paths.document, 'facturas');

function extensionPorMime(mime, nombre) {
  if (mime === 'application/pdf') return 'pdf';
  const fromName = String(nombre || '').match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(fromName)) return fromName;
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function sanitizar(nombre) {
  return String(nombre || 'factura')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 60);
}

export function formatearTamano(bytes) {
  const b = Number(bytes || 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function asegurarDirectorio() {
  if (!DIRECTORIO.exists) DIRECTORIO.create({ intermediates: true });
}

export async function prepararArchivo(archivo) {
  if (!archivo?.uri) throw new Error('No se seleccionó ningún archivo.');
  const mime = archivo.mime || archivo.mimeType || 'image/jpeg';
  if (!MIMES_PERMITIDOS.includes(mime)) {
    throw new Error('Formato no admitido. Usa JPG, PNG, WEBP o PDF.');
  }
  if (Number(archivo.size || 0) > MAX_ARCHIVO_BYTES) {
    throw new Error(`La factura pesa ${formatearTamano(archivo.size)} y el máximo es 10 MB.`);
  }

  let uri = archivo.uri;
  if (mime !== 'application/pdf') {
    const manipulado = await ImageManipulator.manipulateAsync(
      archivo.uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.7, format: mime === 'image/png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG }
    );
    uri = manipulado.uri;
  }

  return {
    uri,
    mime,
    nombre: archivo.nombre || archivo.name || `factura.${extensionPorMime(mime, archivo.nombre)}`,
    size: archivo.size || 0,
    comprimido: uri !== archivo.uri
  };
}

export async function tomarFoto() {
  const permiso = await requestCameraPermissionsAsync();
  if (!permiso.granted) throw new Error('Se necesita permiso de cámara para tomar la foto.');
  const resultado = await launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false
  });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  return resultado.assets[0];
}

export async function elegirDeGaleria() {
  const permiso = await requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) throw new Error('Se necesita permiso de fotos para elegir la factura.');
  const resultado = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false
  });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  return resultado.assets[0];
}

export async function elegirPdf() {
  const resultado = await getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false
  });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  const asset = resultado.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    size: asset.size,
    mime: asset.mimeType || 'application/pdf'
  };
}

export async function guardarFactura(archivo) {
  if (!archivo?.uri) return null;
  asegurarDirectorio();
  const extension = extensionPorMime(archivo.mime, archivo.nombre);
  const nombre = `${Date.now()}-${sanitizar(archivo.nombre).replace(/\.[^.]+$/, '')}.${extension}`;
  const destino = new File(DIRECTORIO, nombre);
  await new File(archivo.uri).copy(destino, { overwrite: true });
  return {
    uri: destino.uri,
    nombre: archivo.nombre,
    mime: archivo.mime,
    tamano: Number(destino.info().size || archivo.size || 0)
  };
}

export async function eliminarFactura(gasto) {
  if (!gasto?.uri_archivo) return;
  const archivo = new File(gasto.uri_archivo);
  if (archivo.exists) archivo.delete();
}

export async function compartirFactura(gasto) {
  if (!gasto?.uri_archivo) throw new Error('Este gasto no tiene factura adjunta.');
  const archivo = new File(gasto.uri_archivo);
  if (!archivo.exists) throw new Error('El archivo de la factura ya no está disponible.');
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) throw new Error('El intercambio de archivos no está disponible en este dispositivo.');
  await Sharing.shareAsync(gasto.uri_archivo, {
    mimeType: gasto.mime || 'application/octet-stream',
    dialogTitle: gasto.nombre_archivo || 'Factura',
    UTI: gasto.mime === 'application/pdf' ? 'com.adobe.pdf' : 'public.image'
  });
}
