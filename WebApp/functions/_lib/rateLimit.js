// Rate limiting usando D1 para persistencia distribuida
// Límite por defecto: 60 req/min por IP por endpoint (ajustable)

const RATE_LIMITS = {
  // Endpoints de autenticación - más estrictos
  '/api/login': { max: 5, windowMs: 60 * 1000 },      // 5 req/min
  '/api/health': { max: 120, windowMs: 60 * 1000 },   // 120 req/min
  
  // Endpoints de escritura - moderados
  '/api/payments': { max: 30, windowMs: 60 * 1000 },  // 30 req/min
  '/api/expenses': { max: 30, windowMs: 60 * 1000 },  // 30 req/min
  '/api/weeks': { max: 10, windowMs: 60 * 1000 },     // 10 req/min
  '/api/expenses/:id': { max: 20, windowMs: 60 * 1000 }, // 20 req/min (DELETE)
  
  // Endpoints de lectura - más permisivos
  '/api/members': { max: 60, windowMs: 60 * 1000 },
  '/api/status': { max: 60, windowMs: 60 * 1000 },
  '/api/balance': { max: 60, windowMs: 60 * 1000 },
  '/api/report': { max: 30, windowMs: 60 * 1000 },
  
  // Default para endpoints no listados
  'default': { max: 60, windowMs: 60 * 1000 }
};

function getClientIp(request) {
  // Cloudflare añade CF-Connecting-IP
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown';
}

function matchRoute(pathname) {
  // Coincidencia exacta primero
  if (RATE_LIMITS[pathname]) return RATE_LIMITS[pathname];
  
  // Coincidencia con parámetros (ej: /api/expenses/123)
  for (const [route, config] of Object.entries(RATE_LIMITS)) {
    if (route.includes(':')) {
      const regex = new RegExp('^' + route.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(pathname)) return config;
    }
  }
  
  return RATE_LIMITS['default'];
}

export async function checkRateLimit(request, env) {
  const ip = getClientIp(request);
  const url = new URL(request.url);
  const pathname = url.pathname;
  const config = matchRoute(pathname);
  const key = `ratelimit:${ip}:${pathname}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Limpiar entradas antiguas y contar
  const cleanupStmt = env.DB.prepare(
    `DELETE FROM rate_limits WHERE key = ? AND timestamp < ?`
  ).bind(key, windowStart);
  
  const countStmt = env.DB.prepare(
    `SELECT COUNT(*) as count FROM rate_limits WHERE key = ?`
  ).bind(key);

  await cleanupStmt.run();
  const { count } = await countStmt.first();

  if (count >= config.max) {
    // Obtener tiempo hasta reset
    const oldestStmt = env.DB.prepare(
      `SELECT timestamp FROM rate_limits WHERE key = ? ORDER BY timestamp ASC LIMIT 1`
    ).bind(key);
    const oldest = await oldestStmt.first();
    const retryAfter = oldest ? Math.ceil((oldest.timestamp + config.windowMs - now) / 1000) : Math.ceil(config.windowMs / 1000);

    return {
      allowed: false,
      retryAfter,
      limit: config.max,
      remaining: 0,
      reset: oldest ? oldest.timestamp + config.windowMs : now + config.windowMs
    };
  }

  // Registrar esta request
  await env.DB.prepare(
    `INSERT INTO rate_limits (key, timestamp) VALUES (?, ?)`
  ).bind(key, now).run();

  return {
    allowed: true,
    retryAfter: 0,
    limit: config.max,
    remaining: config.max - count - 1,
    reset: now + config.windowMs
  };
}

export function rateLimitHeaders(result) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
    ...(result.retryAfter > 0 && { 'Retry-After': String(result.retryAfter) })
  };
}

// Middleware wrapper
export function withRateLimit(handler) {
  return async (context) => {
    const result = await checkRateLimit(context.request, context.env);
    
    if (!result.allowed) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
        retryAfter: result.retryAfter
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...rateLimitHeaders(result)
        }
      });
    }

    const response = await handler(context);
    
    // Añadir headers de rate limit a la respuesta
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(rateLimitHeaders(result))) {
      headers.set(key, value);
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };
}