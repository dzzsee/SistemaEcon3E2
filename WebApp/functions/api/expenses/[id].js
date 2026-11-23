import { json } from '../../_lib/db.js';
import { getAdminFromRequest } from '../../_lib/auth.js';
import { withProtection, validateUUID } from '../../_lib/security.js';

async function cargarGasto(context, id) {
  // Validar que el ID sea numérico
  const numId = Number(id);
  if (isNaN(numId) || numId <= 0) return null;
  
  const row = await context.env.DB.prepare(
    `SELECT id, concepto, monto, r2_key, nombre_archivo, mime
     FROM gastos WHERE id = ?`
  )
    .bind(numId)
    .first();
  return row || null;
}

// GET /api/expenses/:id - descarga o previsualiza la factura (requiere auth)
// ?download=1 fuerza la descarga en vez de mostrarlo inline.
async function getHandler(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  const gasto = await cargarGasto(context, context.params.id);
  if (!gasto) {
    return json({ success: false, message: 'El gasto no existe.' }, 404);
  }
  if (!gasto.r2_key) {
    return json({ success: false, message: 'Este gasto no tiene factura adjunta.' }, 404);
  }
  if (!context.env.FACTURAS) {
    return json(
      { success: false, message: 'El almacenamiento de facturas no está habilitado en el servidor.' },
      503
    );
  }

  const objeto = await context.env.FACTURAS.get(gasto.r2_key);
  if (!objeto) {
    // La fila quedo sin su archivo: lo mas probable es un borrado manual en R2.
    return json(
      { success: false, message: 'La factura ya no está disponible en el almacenamiento.' },
      404
    );
  }

  const descargar = new URL(context.request.url).searchParams.get('download') === '1';
  const tipo = gasto.mime || objeto.httpMetadata?.contentType || 'application/octet-stream';
  const nombre = gasto.nombre_archivo || `factura-${gasto.id}`;

  return new Response(objeto.body, {
    headers: {
      'Content-Type': tipo,
      'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${nombre}"`,
      'Cache-Control': 'no-store'
    }
  });
}

// DELETE /api/expenses/:id - elimina el gasto y su factura (requiere auth)
async function deleteHandler(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  const gasto = await cargarGasto(context, context.params.id);
  if (!gasto) {
    return json({ success: false, message: 'El gasto no existe.' }, 404);
  }

  // Primero borramos el archivo y despues la fila: si el borrado del objeto
  // falla es preferible quedarse con la fila que con un gasto sin factura.
  if (gasto.r2_key && context.env.FACTURAS) {
    try {
      await context.env.FACTURAS.delete(gasto.r2_key);
    } catch (err) {
      return json(
        { success: false, message: `No se pudo eliminar la factura: ${String(err)}` },
        500
      );
    }
  }

  await context.env.DB.prepare('DELETE FROM gastos WHERE id = ?').bind(Number(gasto.id)).run();

  return json({ success: true, id: gasto.id });
}

export const onRequestGet = withProtection(getHandler);
export const onRequestDelete = withProtection(deleteHandler);