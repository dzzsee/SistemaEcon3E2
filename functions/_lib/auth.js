// Autenticación ligera para los 3 administradores (Tutor, Presidente, Tesorero)
// Usa tokens con firma HMAC-SHA256 (Web Crypto, disponible en Workers).
// Token expira en 8 horas por defecto.

const SECRET_KEY = 'SESSION_SECRET';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

async function hmac(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64urlEncode(String.fromCharCode(...new Uint8Array(sig)));
}

export async function signToken(payload, secret, ttlMs = TOKEN_TTL_MS) {
  const now = Date.now();
  const exp = now + ttlMs;
  const body = b64urlEncode(JSON.stringify({ ...payload, iat: now, exp }));
  const signature = await hmac(body, secret);
  return `${body}.${signature}`;
}

export async function verifyToken(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = await hmac(body, secret);
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body));
    // Verificar expiración
    if (payload.exp && payload.exp < Date.now()) {
      return null; // Token expirado
    }
    return payload;
  } catch {
    return null;
  }
}

// Middleware de autenticación: extrae el admin desde el header Authorization
export function getAdminFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  return verifyToken(token, env[SECRET_KEY] || 'econ-3e2-session-secret');
}