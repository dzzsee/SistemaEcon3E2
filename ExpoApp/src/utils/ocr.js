const PALABRAS_TOTAL = /\b(total|importe|a\s*pagar|monto|valor)\b/i;
const PALABRAS_NO_TOTAL = /\b(sub\s?total|iva|impuestos?|descuento|anticipo)\b/i;
const CONFUSIONES = { O: '0', o: '0', Q: '0', D: '0', l: '1', I: '1', i: '1', S: '5', s: '5', B: '8', Z: '2', z: '2', G: '6', T: '7' };
const RE_MONEDA = /(\$)\s?([\d.,OoQDlIiSsBbZzGT]{1,24})/g;
const RE_NUMERO = /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{1,3}[.,]\d{1,2}|\d+)/g;

function limpiarNumero(texto, haySimbolo) {
  if (!haySimbolo) return texto;
  return texto.replace(/[A-Za-z]/g, (c) => CONFUSIONES[c] || c);
}

export function parsearImporte(bruto) {
  const s = String(bruto).replace(/\s+/g, '');
  if (!s) return null;

  const ultimo = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  let entero;
  let decimal = '';

  if (ultimo > -1) {
    const cola = s.slice(ultimo + 1);
    if (/^\d{3}$/.test(cola)) {
      entero = s;
    } else if (/^\d{1,2}$/.test(cola)) {
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

function base({ tienePalabraTotal, esParcial, simbolo, token }) {
  let puntos = 0;
  if (tienePalabraTotal && !esParcial) puntos += 40;
  if (esParcial) puntos -= 20;
  if (simbolo) puntos += 8;
  if (/[.,]\d{2}$/.test(String(token).trim())) puntos += 5;
  if (!/[.,]/.test(String(token))) puntos -= 10;
  return puntos;
}

export function extraerImportes(texto) {
  if (!texto) return [];

  const lineas = String(texto).split(/\r?\n/);
  const encontrados = [];

  lineas.forEach((linea) => {
    const tienePalabraTotal = PALABRAS_TOTAL.test(linea);
    const esParcial = PALABRAS_NO_TOTAL.test(linea);
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

  const conPalabraTotal = encontrados.filter((e) => e.total);
  const referencia = conPalabraTotal.length
    ? Math.max(...conPalabraTotal.map((e) => e.valor))
    : null;
  const maximoGlobal = encontrados.reduce((acc, e) => Math.max(acc, e.valor), 0);

  for (const e of encontrados) {
    if (referencia !== null && e.valor === referencia) e.puntos += 20;
    else if (referencia === null && e.valor === maximoGlobal) e.puntos += 10;
  }

  const porValor = new Map();
  for (const e of encontrados) {
    const previo = porValor.get(e.valor);
    if (!previo || e.puntos > previo.puntos) porValor.set(e.valor, e);
  }

  return [...porValor.values()]
    .sort((a, b) => b.puntos - a.puntos || b.valor - a.valor)
    .slice(0, 6);
}

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

export async function reconocerTexto() {
  throw new Error('OCR no disponible en Expo Go. Escribe el monto manualmente.');
}
