import { ensureSchema, json, ARCHIVOS_PERMITIDOS, MAX_ARCHIVO_BYTES } from '../_lib/db.js';
import { getAdminFromRequest } from '../_lib/auth.js';

const CATEGORIAS = ['Papelería', 'Eventos', 'Transporte', 'Materiales', 'Otros'];

// Deja solo caracteres seguros para el nombre del objeto en R2
function sanitizeFileName(name) {
  const base = String(name || 'factura')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(-60);
  return base || 'factura';
}

// GET /api/expenses - lista de gastos registrados (requiere auth)
export async function onRequestGet(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);

  const { results } = await context.env.DB.prepare(
    `SELECT id, concepto, categoria, monto, fecha, nota, registrado_por,
            nombre_archivo, mime, tamano, fecha_registro,
            CASE WHEN r2_key IS NULL THEN 0 ELSE 1 END AS tiene_archivo
     FROM gastos ORDER BY fecha DESC, id DESC`
  ).all();

  return json(results);
}

// POST /api/expenses - registra un gasto con su factura/recibo (requiere auth)
// multipart/form-data: concepto, monto, fecha, categoria?, nota?, factura?
export async function onRequestPost(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  // OJO: getBody() de _lib/db.js hace request.json() y no sirve para multipart.
  const form = await context.request.formData();

  const concepto = String(form.get('concepto') || '').trim();
  const montoRaw = Number(form.get('monto'));
  const fecha = String(form.get('fecha') || '').trim();
  const categoria = String(form.get('categoria') || '').trim();
  const nota = String(form.get('nota') || '').trim();
  const archivo = form.get('factura');

  if (!concepto) {
    return json({ success: false, message: 'El concepto del gasto es obligatorio.' }, 400);
  }
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return json({ success: false, message: 'Indica una fecha válida (AAAA-MM-DD).' }, 400);
  }
  if (!montoRaw || Number.isNaN(montoRaw) || montoRaw <= 0) {
    return json({ success: false, message: 'El monto debe ser mayor a cero.' }, 400);
  }

  const tieneArchivo = archivo && typeof archivo === 'object' && typeof archivo.arrayBuffer === 'function';
  const nombreArchivo = tieneArchivo ? sanitizeFileName(archivo.name) : null;
  const mime = tieneArchivo ? archivo.type : null;
  const tamano = tieneArchivo ? archivo.size : 0;

  if (tieneArchivo) {
    if (!ARCHIVOS_PERMITIDOS.includes(mime)) {
      return json(
        { success: false, message: 'Solo se admiten facturas en JPG, PNG, WEBP o PDF.' },
        400
      );
    }
    if (tamano > MAX_ARCHIVO_BYTES) {
      return json(
        { success: false, message: 'El archivo supera el límite de 10 MB. Comprimilo o subilo como PDF.' },
        400
      );
    }
  }

  // Degradacion limpia: si R2 no esta configurado el gasto igual se registra,
  // solo sin archivo. Asi la app no se cae cuando falta el binding.
  let r2Key = null;
  if (tieneArchivo) {
    if (!context.env.FACTURAS) {
      return json(
        {
          success: false,
          message:
            'El almacenamiento de facturas no está habilitado en el servidor. Registra el gasto sin adjuntar el archivo.'
        },
        503
      );
    }
    r2Key = `gastos/${crypto.randomUUID()}-${nombreArchivo}`;
    try {
      await context.env.FACTURAS.put(r2Key, await archivo.arrayBuffer(), {
        httpMetadata: { contentType: mime }
      });
    } catch (err) {
      return json({ success: false, message: `No se pudo subir la factura: ${String(err)}` }, 500);
    }
  }

  await ensureSchema(context.env.DB);

  let result;
  try {
    result = await context.env.DB.prepare(
      `INSERT INTO gastos (concepto, categoria, monto, fecha, nota, registrado_por, r2_key, nombre_archivo, mime, tamano)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        concepto,
        categoria || null,
        montoRaw,
        fecha,
        nota || '',
        admin.nombre,
        r2Key,
        nombreArchivo,
        mime,
        tamano
      )
      .run();
  } catch (err) {
    // Si la fila no se pudo guardar, no dejamos el objeto huerfano en R2.
    if (r2Key) {
      await context.env.FACTURAS.delete(r2Key).catch(() => {});
    }
    return json({ success: false, message: `No se pudo registrar el gasto: ${String(err)}` }, 500);
  }

  return json({
    success: true,
    id: result.meta.last_row_id,
    concepto,
    monto: montoRaw,
    fecha,
    categoria: categoria || null,
    tiene_archivo: !!r2Key
  });
}

export { CATEGORIAS };
