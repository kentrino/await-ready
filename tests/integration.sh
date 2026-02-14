#!/usr/bin/env bash
set -euo pipefail

# CI-friendly integration test
# docker-compose up -d is not available in some CI environments,
# so we background the process with & and use trap for cleanup.
#
# Usage:
#   bash tests/integration.sh --service mysql
#   bash tests/integration.sh --service mysql --service redis
#   bash tests/integration.sh --service mysql --output dots

cd "$(dirname "$0")/.."

services=()
output="silent"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --service)
      services+=("$2")
      shift 2
      ;;
    --output)
      output="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: $0 --service <mysql|postgresql|redis|http> [--output <silent|dots|spinner|sl>]" >&2
      exit 1
      ;;
  esac
done

if [[ ${#services[@]} -eq 0 ]]; then
  echo "Error: at least one --service is required" >&2
  echo "Usage: $0 --service <mysql|postgresql|redis|http> [--output <silent|dots|spinner|sl>]" >&2
  exit 1
fi

# CI: use built await-ready binary, local: use bun run dev
if [[ "${CI:-}" == "true" ]]; then
  await_ready=(await-ready)
else
  await_ready=(bun run dev)
fi

# Map service name to docker compose service, port, and protocol
service_config() {
  case "$1" in
    mysql)      echo "mysql 33306 mysql" ;;
    postgresql) echo "postgresql 54432 pg" ;;
    redis)      echo "redis 63379 redis" ;;
    http)       echo "nginx 8080 http" ;;
    *)
      echo "Unknown service: $1" >&2
      echo "Available: mysql, postgresql, redis, http" >&2
      exit 1
      ;;
  esac
}

# Collect docker compose service names to start
compose_services=()
for svc in "${services[@]}"; do
  read -r compose_name _ _ <<< "$(service_config "$svc")"
  compose_services+=("$compose_name")
done

cleanup() {
  echo "--- Cleaning up ---"
  docker compose down --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

echo "--- Starting services: ${compose_services[*]} ---"
docker compose up --force-recreate --renew-anon-volumes "${compose_services[@]}" > /dev/null 2>&1 &

pass=0
fail=0

run_test() {
  local name="$1"
  shift
  echo ""
  echo "=== TEST: $name ==="
  if "$@"; then
    echo "  -> PASS"
    pass=$((pass + 1))
  else
    echo "  -> FAIL"
    fail=$((fail + 1))
  fi
}

# --- Success cases ---
for svc in "${services[@]}"; do
  read -r _ port protocol <<< "$(service_config "$svc")"
  run_test "$svc" "${await_ready[@]}" ":$port" --protocol "$protocol" --output "$output" --timeout 30000
done

echo ""
echo "=== Results: $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
