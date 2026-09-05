#!/usr/bin/env bash
# scripts/dev.sh — khởi động toàn bộ stack local (Docker Compose + Next.js)
#
# Cách dùng:
#   ./scripts/dev.sh                # khởi động tất cả
#   ./scripts/dev.sh --no-migrate   # bỏ qua bước migrate (DB đã có data)
#   ./scripts/dev.sh --down         # tắt Docker stack

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ─── Flags ────────────────────────────────────────────────────────────────────
NO_MIGRATE=0
DOWN=0
for arg in "$@"; do
  [[ "$arg" == "--no-migrate" ]] && NO_MIGRATE=1
  [[ "$arg" == "--down"       ]] && DOWN=1
done

if [[ $DOWN -eq 1 ]]; then
  echo "⏹️  Dừng Docker stack..."
  docker compose down
  exit 0
fi

# ─── .env cho Docker Compose ──────────────────────────────────────────────────
if [[ ! -f ".env" ]]; then
  echo "📋 Tạo .env từ .env.example..."
  cp .env.example .env
fi

# ─── .env.local cho Next.js (trỏ vào Docker Compose) ─────────────────────────
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7W9oaKFqYedj9TkX2Z4e7ePHOE_Y6jBg0lQ"

if ! grep -q "localhost:8000" .env.local 2>/dev/null; then
  echo "📝 Cập nhật .env.local → Docker Compose endpoints..."
  cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
VNPAY_MOCK=1
VNPAY_TMN_CODE=TESTCODE
VNPAY_HASH_SECRET=test-secret-key-for-local-development
EOF
fi

# ─── Docker Compose ───────────────────────────────────────────────────────────
echo "🐳 Khởi động Docker stack..."
docker compose up -d

echo "⏳ Chờ database healthy..."
until docker compose exec -T db pg_isready -U postgres -q 2>/dev/null; do
  sleep 1
done
echo "✅ Database ready"

# ─── Migrations ───────────────────────────────────────────────────────────────
if [[ $NO_MIGRATE -eq 0 ]]; then
  echo ""
  echo "🗄️  Chạy migrations..."
  DB_PORT=5432 bash scripts/migrate.sh
fi

# ─── Next.js ──────────────────────────────────────────────────────────────────
echo ""
echo "🚀 Khởi động Next.js..."
echo "   → App:    http://localhost:3000"
echo "   → Studio: http://localhost:3001"
echo "   → Email:  http://localhost:9000  (xem OTP)"
echo ""
npm run dev
