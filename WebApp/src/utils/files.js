// Utilidades de archivo para los gastos: compresión de imágenes, rasterizado de
// PDF y descarga de blobs. Todo corre en el navegador, sin backend.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Espejo de ARCHIVOS_PERMITIDOS / MAX_ARCHIVO_BYTES en functions/_lib/db.js.
// Si cambias uno, cambia el otro.
export const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024;

export const CATEGORIAS = ['Papelería', 'Eventos', 'Transporte', 'Materiales', 'Otros'];

export function esImagen(mime) {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mime);
}

export function esPdf(mime) {
  return mime === 'application/pdf';
}

export function formatearTamano(bytes) {
  const b = Number(bytes || 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Damos margen antes de revocar: en Safari Immediate revocar aborta la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function nombreSinExtension(nombre, extension) {
  const base = String(nombre || 'factura').replace(/\.[^.]+$/, '');
  return `${base}.${extension}`;
}

// Carga una imagen respetando la orientación EXIF (fotos de celular).
async function cargarBitmap(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      /* algunos navegadores lo rechazan: caemos al <img> */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo abrir la imagen.'));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

function dibujarEnCanvas(fuente, maxLado) {
  const ancho = fuente.width;
  const alto = fuente.height;
  const escala = Math.min(1, maxLado / Math.max(ancho, alto));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(ancho * escala));
  canvas.height = Math.max(1, Math.round(alto * escala));
  const ctx = canvas.getContext('2d');
  // Fondo blanco: los PNG con transparencia salen con fondo negro al aplanar.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas, tipo, calidad) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))),
      tipo,
      calidad
    );
  });
}

// Reduce la imagen antes de subirla: una foto de celular de 4 MB pasa a ~200 KB.
export async function comprimirImagen(file, { maxLado = 1600, calidad = 0.82 } = {}) {
  const fuente = await cargarBitmap(file);
  const canvas = dibujarEnCanvas(fuente, maxLado);
  const blob = await canvasToBlob(canvas, 'image/jpeg', calidad);
  return { blob, nombre: nombreSinExtension(file.name, 'jpg'), mime: 'image/jpeg' };
}

// Rasteriza la primera página del PDF a un JPEG para poder aplicar OCR.
export async function rasterizarPdf(file, { pagina = 1, maxLado = 2200 } = {}) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({
    data,
    // Necesario para PDFs de POS que no embeben las 14 fuentes estándar.
    standardFontDataUrl: '/pdf-standard-fonts/'
  }).promise;

  try {
    const total = doc.numPages;
    const numero = Math.min(Math.max(1, pagina), total);
    const page = await doc.getPage(numero);
    const base = page.getViewport({ scale: 1 });
    const escala = Math.min(3, maxLado / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale: escala });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
    return { blob, nombre: nombreSinExtension(file.name, 'pag1.jpg'), mime: 'image/jpeg', paginas: total };
  } finally {
    await doc.destroy();
  }
}

// Deja el archivo listo: `subir` es lo que va al servidor y `ocr` es lo que se
// lee con Tesseract. Para imágenes son el mismo objeto; para PDF, `subir` es el
// original y `ocr` es la página rasterizada.
export async function prepararArchivo(file) {
  if (esPdf(file.type)) {
    let ocr = null;
    try {
      ocr = await rasterizarPdf(file);
    } catch (err) {
      // El PDF se sube igual aunque no se pueda rasterizar.
      console.warn('No se pudo rasterizar el PDF:', err);
    }
    return {
      subir: { blob: file, nombre: file.name, mime: file.type },
      ocr,
      nota: ocr ? null : 'No se pudo leer este PDF para aplicar OCR.'
    };
  }

  if (esImagen(file.type)) {
    const comprimida = await comprimirImagen(file);
    return {
      subir: comprimida,
      ocr: comprimida,
      nota: null
    };
  }

  throw new Error('Solo se admiten facturas en JPG, PNG, WEBP o PDF.');
}

// Vista previa local (sin backend) para el archivo recién elegido.
// Devuelve un object URL: hay que revocarlo cuando se sustituya o quite.
export function vistaPrevia(entrada) {
  if (!entrada?.blob) return Promise.resolve(null);
  return Promise.resolve(URL.createObjectURL(entrada.blob));
}
