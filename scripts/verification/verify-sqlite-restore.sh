#!/usr/bin/env bash
# Exercise a hot snapshot and cold restore through the normal LAN API and backup service.
set -euo pipefail
: "${LAN_SMOKE_DISPOSABLE:?}" "${BASE_URL:?}" "${ENTRIP_ADMIN_PASSWORD:?}" "${ENTRIP_ADMIN_EMAIL:?}" "${ENTRIP_COMPANY_CODE:?}"
[[ "$LAN_SMOKE_DISPOSABLE" == 1 ]]
umask 077
cookie_file="$(mktemp)"
trap 'rm -f "$cookie_file"' EXIT
api="$BASE_URL/api/v2"
http() { curl --noproxy '*' --fail-with-body --silent --show-error -H "Origin: $BASE_URL" --cookie "$cookie_file" "$@"; }
login() {
  jq -n '{email:env.ENTRIP_ADMIN_EMAIL,password:env.ENTRIP_ADMIN_PASSWORD,companyCode:env.ENTRIP_COMPANY_CODE}' |
    http --cookie-jar "$cookie_file" -H 'Content-Type: application/json' --data-binary @- "$api/auth/login" >/dev/null
}
profile() { http "$api/users/profile" | jq -ce '[.id,.name] | select(all(.[]; type=="string" and length>0))'; }
backup() { docker compose run -T --rm --no-deps backup python3 deploy/lan/sqlite/backup.py "$@"; }
login
before="$(profile)"
id="$(jq -r '.[0]' <<<"$before")"
snapshot="$(backup backup | jq -er 'select(.status=="ok") | .name')"
backup list | jq -e --arg n "$snapshot" '.backups | any(.name==$n)' >/dev/null
http -X PUT -H 'Content-Type: application/json' --data '{"name":"CI after snapshot"}' "$api/users/$id" |
  jq -e '.name=="CI after snapshot"' >/dev/null
[[ "$(profile)" != "$before" ]]

# A running API holds the database guard. Refusing this restore must leave the mutation intact.
if backup restore --name "$snapshot" >/dev/null 2>&1; then
  echo 'The active host accepted an offline restore' >&2
  exit 1
fi
[[ "$(profile | jq -r '.[1]')" == 'CI after snapshot' ]]
docker compose stop api backup
backup restore --name "$snapshot" | jq -e --arg n "$snapshot" '.status=="ok" and .name==$n and (.previous | length>0)' >/dev/null
docker compose up -d
curl --noproxy '*' -fsS --retry-all-errors --retry 90 --retry-delay 2 "$BASE_URL/health" >/dev/null
login
[[ "$(profile)" == "$before" ]]
echo 'The original administrator identity and name were restored through the LAN API.'
