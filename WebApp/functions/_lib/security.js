// Headers de seguridad y utilidades de validación

export const SECURITY_HEADERS = {
  // Content Security Policy - restrictivo pero funcional para la app
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React necesita unsafe-eval en dev
    "style-src 'self' 'unsafe-inline'", // Tailwind usa inline styles
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.cloudflarepages.dev https://*.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Prevenir MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevenir clickjacking
  'X-Frame-Options': 'DENY',
  
  // XSS protection (legacy pero útil)
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy (feature policy)
  'Permissions-Policy': [
    'camera=()', // Solo se usa en el modal de gastos con consentimiento
    'microphone=()',
    'geolocation=()',
    'payment=()'
  ].join(', '),
  
  // HSTS - solo en producción (Cloudflare Pages maneja HTTPS)
  // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // No cache para APIs
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export function addSecurityHeaders(headers) {
  const h = new Headers(headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    h.set(key, value);
  }
  return h;
}

export function withSecurityHeaders(handler) {
  return async (context) => {
    const response = await handler(context);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: addSecurityHeaders(response.headers)
    });
  };
}

// Validación de entrada
export function sanitizeString(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLen)
    .replace(/[\x00-\x1F\x7F]/g, '') // Remover caracteres de control
    .replace(/[<>]/g, ''); // Prevención básica XSS
}

export function validateAmount(amount) {
  const num = Number(amount);
  return !isNaN(num) && isFinite(num) && num > 0 && num <= 1000000; // Max 1M
}

export function validateDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

export function validateUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

// CORS para desarrollo local y preview deployments
export function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://sistema-econ-3e2.pages.dev'
  ];
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
  
  // Permitir preview deployments (*.sistema-econ-3e2.pages.dev) y production
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.sistema-econ-3e2\.pages\.dev$/.test(origin)
  );
  
  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
}

export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request)
  });
}

// Middleware combinado: rate limit + security headers + CORS
export function withProtection(handler, options = {}) {
  const { skipRateLimit = false, skipAuth = false, maxBodySize = 1024 * 1024 } = options; // 1MB default
  
  return async (context) => {
    const { request, env } = context;
    
    // Manejar preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    
    // Validar tamaño del body para POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentLength = request.headers.get('Content-Length');
      if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
        return new Response(JSON.stringify({
          success: false,
          message: `El cuerpo de la solicitud supera el límite de ${maxBodySize} bytes.`
        }), {
          status: 413,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request)
          }
        });
      }
    }
    
    let rateLimitResult = null;
    
    // Rate limiting
    if (!skipRateLimit) {
      const { checkRateLimit, rateLimitHeaders } = await import('./rateLimit.js');
      rateLimitResult = await checkRateLimit(request, env);
      
      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
          retryAfter: rateLimitResult.retryAfter
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitHeaders(rateLimitResult),
            ...corsHeaders(request)
          }
        });
      }
    }
    
    // Ejecutar handler
    const response = await handler(context);
    
    // Aplicar headers de seguridad y CORS
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries({ ...SECURITY_HEADERS, ...corsHeaders(request) })) {
      headers.set(key, value);
    }
    
    // Rate limit headers si no se saltó
    if (!skipRateLimit && rateLimitResult) {
      const { rateLimitHeaders } = await import('./rateLimit.js');
      for (const [key, value] of Object.entries(rateLimitHeaders(rateLimitResult))) {
        headers.set(key, value);
      }
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };
}