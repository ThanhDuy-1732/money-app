#!/usr/bin/env bash
# scripts/migrate.sh — chạy tất cả migrations theo thứ tự
#
# Cách dùng:
#   ./scripts/migrate.sh              # kết nối qua psql local (cần psql cài sẵn)
#   ./scripts/migrate.sh --docker     # kết nối qua docker exec (không cần psql local)
#
# Yêu cầu: docker compose đang chạy (docker compose up -d)

set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-54322}"        # Supabase CLI port (npx supabase start)
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
DB_CONTAINER="${DB_CONTAINER:-supabase_db_money-app}"  # Supabase CLI container name

USE_DOCKER=0
if [[ "${1:-}" == "--docker" ]]; then
  USE_DOCKER=1
fi

run_sql() {
  local file="$1"
  echo "▶ Running: $file"
  if [[ $USE_DOCKER -eq 1 ]]; then
    docker exec -i "$DB_CONTAINER" \
      psql -U "$DB_USER" -d "$DB_NAME" < "$file"
  else
    PGPASSWORD="$DB_PASS" psql \
      -h "$DB_HOST" -p "$DB_PORT" \
      -U "$DB_USER" -d "$DB_NAME" \
      -f "$file"
  fi
}

# Schema cơ bản (chạy lại an toàn — dùng IF NOT EXISTS trong schema.sql)
# run_sql "docs/requirement/schema.sql"  # Chỉ bỏ comment nếu cần reset từ đầu

# Triggers gamification
run_sql "sql/triggers/01-signup-bonus.sql"
run_sql "sql/triggers/02-profile-complete.sql"
run_sql "sql/triggers/03-post-bonus.sql"
run_sql "sql/triggers/04-login-streak.sql"

# Storage policies
run_sql "sql/storage/05-storage-policies.sql"

# Migrations
run_sql "sql/migrations/06-payments-table.sql"
run_sql "sql/migrations/07-complete-payment-rpc.sql"

# Phase 2 migrations (bỏ comment khi đã tạo file)
run_sql "sql/migrations/08a-fix-count-triggers.sql"
run_sql "sql/migrations/08b-phase2-core.sql"
run_sql "sql/migrations/08c-phase2-budgets.sql"
# run_sql "sql/migrations/08d-phase2-savings.sql"
# run_sql "sql/migrations/08e-phase2-productivity.sql"
run_sql "sql/migrations/08f-phase2-billing.sql"
# run_sql "sql/migrations/09-extend-complete-payment.sql"

echo ""
echo "✅ Migrations hoàn tất."
