#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Configuración automática de Cloudflare para el Sistema de Cuotas 3E2
#
# Crea (si no existen) la base de datos D1 y el proyecto de Pages, inyecta
# el database_id real en wrangler.toml y despliega el sitio estático puro
# (index.html + css/ + js/ + functions/) sin ningún paso de compilación.
#
# Requisitos:
#   - Node.js 18+  (para wrangler)
#   - wrangler autenticado:  npx wrangler login
#   - En Windows usa "Git Bash" o WSL para ejecutar este script
#
# Uso:
#   bash scripts/setup-cloudflare.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT_NAME="sistema-econ-3e2"
DB_NAME="sistema-econ-3e2-db"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> 1/5 Verificando autenticación de Wrangler"
if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "No estás autenticado. Ejecuta: npx wrangler login"
  exit 1
fi

echo "==> 2/5 Creando/verificando base de datos D1: $DB_NAME"
DB_ID="$(npx wrangler d1 list --json 2>/dev/null | node -e "
  let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
    try{
      const list=JSON.parse(d);
      const found=list.find(x=>x.name==='$DB_NAME');
      if(found){console.log(found.uuid||found.id);}else{console.log('');}
    }catch(e){console.log('');}
  });
")"

if [ -z "$DB_ID" ]; then
  echo "    Creando nueva base de datos..."
  CREATE_OUT="$(npx wrangler d1 create "$DB_NAME" 2>&1)"
  echo "$CREATE_OUT"
  DB_ID="$(echo "$CREATE_OUT" | grep -oE '"?database_id"?[^a-f0-9]*([a-f0-9-]{32,36})' | grep -oE '[a-f0-9-]{32,36}' | head -1)"
fi

if [ -z "$DB_ID" ]; then
  echo "No se pudo determinar el database_id. Revisa la salida anterior."
  exit 1
fi
echo "    database_id = $DB_ID"

echo "==> 3/5 Actualizando wrangler.toml"
node -e "
  const fs=require('fs');
  let s=fs.readFileSync('wrangler.toml','utf8');
  s=s.replace(/database_id\\s*=\\s*\".*?\"/, 'database_id = \"$DB_ID\"');
  fs.writeFileSync('wrangler.toml',s);
"
echo "    wrangler.toml actualizado."

echo "==> 4/5 Aplicando esquema a D1 (remoto) y sembrando datos"
npx wrangler d1 execute "$DB_NAME" --remote --yes --file=./schema.sql

echo "==> 5/5 Instalando wrangler y desplegando en Cloudflare Pages"
npm install
npx wrangler pages project create "$PROJECT_NAME" --production-branch main 2>/dev/null || true
echo ""
echo "IMPORTANTE: configura el secreto de sesión (una sola vez):"
echo "  npx wrangler pages secret put SESSION_SECRET --project-name $PROJECT_NAME"
echo ""
npx wrangler pages deploy . --project-name "$PROJECT_NAME" --branch main

echo ""
echo "Listo. Tu aplicación está desplegada en Cloudflare Pages con D1."
echo "URL: https://$PROJECT_NAME.pages.dev"