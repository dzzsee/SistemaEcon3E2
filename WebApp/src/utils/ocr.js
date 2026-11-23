// OCR opcional de la factura, 100 % en el navegador con Tesseract.js.
// Tesseract se carga con import() diferido: son varios MB y solo hacen falta
// cuando el administrador pulsa "Verificar con OCR".
//
// La idea NO es que la maquina decida el total (el OCR se equivoca), sino
// devolver los importes que leyó para que el administrador los contraste con
// lo que escribio. Nunca bloquea el registro.

const PALABRAS_TOTAL = /\b(total|importe|a\s*pagar|monto|valor)\b/i;
const PALABRAS_NO_TOTAL = /\b(sub\s?total|iva|impuestos?|descuento|anticipo)\b/i;

// OCR confunde estos caracteres con digitos. Solo se "arreglan" dentro del
// numero que acompaña a un simbolo de moneda, nunca en el texto normal.
const CONFUSIONES = { O: '0', o: '0', Q: '0', D: '0', l: '1', I: '1', i: '1', S: '5', s: '5', B: '8', Z: '2', z: '2', G: '6', T: '7' };

function limpiarNumero(texto, haySimbolo) {
  if (!haySimbolo) return texto;
  return texto.replace(/[A-Za-z]/g, (c) => CONFUSIONES[c] || c);
}

// Convierte "1.250,00", "1,250.00", "1,250" o "20,50" en Number.
export function parsearImporte(bruto) {
  const s = String(bruto).replace(/\s+/g, '');
  if (!s) return null;

  const ultimo = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  let entero;
  let decimal = '';

  if (ultimo > -1) {
    const cola = s.slice(ultimo + 1);
    if (/^\d{3}$/.test(cola)) {
      // "1,250" -> el ultimo separador es de miles, NO decimal.
      entero = s;
    } else if (/^\d{1,2}$/.test(cola)) {
      // "20,50" / "1.250,00" -> decimal.
      entero = s.slice(0, ultimo);
      decimal = cola;
    } else {
      entero = s;
    }
  } else {
    entero = s;
  }

  entero = entero.replace(/[.,]/g, '');
  if (!/^\d*$/.test(entero)) return null;

  const valor = Number(`${entero || '0'}.${decimal || '0'}`);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return valor;
}

// Numero pegado a un simbolo de moneda. Acepta letras porque un "O" leido
// donde iba un "0" (1,3O5) rompe cualquier regex que exija solo digitos.
const RE_MONEDA = /(\$)\s?([\d.,OoQDlIiSsBbZzGT]{1,24})/g;
// Numero suelto, sin simbolo: aqui si exigimos digitos de verdad.
const RE_NUMERO =
  /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{1,3}[.,]\d{1,2}|\d+)/g;

// Devuelve los importes detectados, mejor puntuados primero.
export function extraerImportes(texto) {
  if (!texto) return [];

  const lineas = String(texto).split(/\r?\n/);
  const encontrados = [];

  lineas.forEach((linea) => {
    const tienePalabraTotal = PALABRAS_TOTAL.test(linea);
    const esParcial = PALABRAS_NO_TOTAL.test(linea);

    // Pasada 1: importes con simbolo de moneda. Se anotan los rangos ocupados
    // para no volver a contarlos en la pasada 2.
    const ocupados = [];
    RE_MONEDA.lastIndex = 0;
    let m;
    while ((m = RE_MONEDA.exec(linea)) !== null) {
      const desde = m.index;
      const hasta = m.index + m[0].length;
      ocupados.push([desde, hasta]);
      const valor = parsearImporte(limpiarNumero(m[2], true));
      if (valor === null) continue;
      encontrados.push({
        valor,
        simbolo: m[1],
        puntos: base({ tienePalabraTotal, esParcial, simbolo: m[1], token: m[2] }),
        total: tienePalabraTotal && !esParcial,
        texto: linea.trim().slice(0, 120)
      });
    }

    // Pasada 2: numeros sueltos que no caen ya dentro de un importe con moneda.
    RE_NUMERO.lastIndex = 0;
    while ((m = RE_NUMERO.exec(linea)) !== null) {
      const dentro = ocupados.some(([a, b]) => m.index >= a && m.index < b);
      if (dentro) continue;
      const valor = parsearImporte(m[1]);
      if (valor === null) continue;
      encontrados.push({
        valor,
        simbolo: '',
        puntos: base({ tienePalabraTotal, esParcial, simbolo: '', token: m[1] }),
        total: tienePalabraTotal && !esParcial,
        texto: linea.trim().slice(0, 120)
      });
    }
  });

  // El total de verdad es el importe mas alto *de las lineas que dicen TOTAL*.
  // Comparar contra el maximo global no sirve: un RFC o un telefono de 6
  // digitos le ganaria a un total de 3.
  const conPalabraTotal = encontrados.filter((e) => e.total);
  const referencia = conPalabraTotal.length
    ? Math.max(...conPalabraTotal.map((e) => e.valor))
    : null;
  const maximoGlobal = encontrados.reduce((acc, e) => Math.max(acc, e.valor), 0);

  for (const e of encontrados) {
    if (referencia !== null && e.valor === referencia) e.puntos += 20;
    else if (referencia === null && e.valor === maximoGlobal) e.puntos += 10;
  }

  // Deduplicar por valor conservando el mejor puntaje.
  const porValor = new Map();
  for (const e of encontrados) {
    const previo = porValor.get(e.valor);
    if (!previo || e.puntos > previo.puntos) porValor.set(e.valor, e);
  }

  return [...porValor.values()].sort((a, b) => b.puntos - a.puntos || b.valor - a.valor).slice(0, 6);
}

function base({ tienePalabraTotal, esParcial, simbolo, token }) {
  let puntos = 0;
  if (tienePalabraTotal && !esParcial) puntos += 40;
  if (esParcial) puntos -= 20;
  if (simbolo) puntos += 8;
  if (/[.,]\d{2}$/.test(String(token).trim())) puntos += 5;
  if (!/[.,]/.test(String(token))) puntos -= 10;
  return puntos;
}

// Contrasta el monto capturado con lo que el OCR leyo.
export function compararConOCR(monto, texto) {
  const importes = extraerImportes(texto);
  const capturado = Number(monto);

  if (!importes.length) {
    return { estado: 'sin-importes', importes: [], mejor: null };
  }
  if (!Number.isFinite(capturado) || capturado <= 0) {
    return { estado: 'sin-monto', importes, mejor: importes[0] };
  }

  const exacta = importes.find((i) => Math.abs(i.valor - capturado) < 0.01);
  if (exacta) {
    return { estado: 'coincide', importes, mejor: exacta, candidato: exacta.valor };
  }

  const mejor = importes[0];
  return {
    estado: 'difiere',
    importes,
    mejor,
    diferencia: Number((capturado - mejor.valor).toFixed(2))
  };
}

const ETIQUETAS = {
  'loading tesseract core': 'Cargando el motor OCR',
  'initializing tesseract': 'Iniciando Tesseract',
  'loading language traineddata': 'Descargando el diccionario español',
  'loaded language traineddata': 'Diccionario listo',
  'initializing api': 'Preparando el reconocedor',
  'initialized api': 'Reconocedor listo',
  'recognizing text': 'Leyendo la factura'
};

function mensajeProgreso(m) {
  const etiqueta = ETIQUETAS[m.status] || m.status || 'Procesando';
  const pct = typeof m.progress === 'number' ? Math.round(m.progress * 100) : null;
  return { etiqueta, pct, status: m.status };
}

// Corre el OCR sobre una imagen (o la pagina rasterizada de un PDF).
// Devuelve { texto, ms }. Lanza si falla, para que la UI lo muestre sin romper.
export async function reconocerTexto(entrada, onProgress) {
  if (!entrada?.blob) throw new Error('No hay imagen para leer.');

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  // Importamos el build ESM precompilado de tesseract, no el entry "tesseract.js".
  // Motivo: el entry es CommonJS y hace `module.exports = { ..., ...Tesseract }`; ese
  // spread impide que Rollup deduzca los exports con nombre, y Vite lo envuelve en
  // una capa extra de namespace (queda en mod.default.default). El build ESM exporta
  // un `default` limpio y ya viene compilado para navegador, sin needing de polyfills.
  const mod = await import('tesseract.js/dist/tesseract.esm.min.js');
  const { createWorker, OEM } = mod.default || mod;

  onProgress?.({ etiqueta: 'Descargando el motor OCR', pct: null, status: 'init' });

  // Sin corePath/workerPath: tesseract los resuelve desde jsdelivr y elige solo
  // la variante de WASM segun soporte SIMD del dispositivo.
  // OEM.LSTM_ONLY usa el core y el diccionario mas pequenos (buena opcion para
  // solo numeros y palabras de receipts).
  const worker = await createWorker('spa', OEM.LSTM_ONLY, {
    logger: (m) => onProgress?.(mensajeProgreso(m))
  });

  try {
    const { data } = await worker.recognize(entrada.blob);
    return { texto: data?.text || '', ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0) };
  } finally {
    // El worker ocupa ~160 MB: lo soltamos siempre, el WASM y el diccionario
    // quedan cacheados por el navegador para la siguiente factura.
    await worker.terminate();
  }
}
