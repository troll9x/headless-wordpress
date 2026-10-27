#!/usr/bin/env bash
# Runs on the preconfigured frontend host. Does not change DNS, Nginx, CMS or MySQL.
set -Eeuo pipefail

sha="${1:?release SHA required}"
base="${2:?application directory required}"
service="${3:?systemd service required}"
health_url="${4:?loopback health URL required}"

[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
[[ "$base" =~ ^/[A-Za-z0-9/_-]+$ ]]
[[ "$service" =~ ^[A-Za-z0-9@_.-]+$ ]]
[[ "$health_url" =~ ^http://127\.0\.0\.1:[0-9]{1,5}(/[A-Za-z0-9/_-]*)?$ ]]

release="$base/releases/$sha"
current="$base/current"
environment="$base/shared/.env.production.local"
[[ -d "$base/releases" && -L "$current" && -f "$environment" ]]
[[ ! -e "$release" ]]

previous="$(readlink -f "$current")"
case "$previous" in
  "$base"/releases/*/university-next) ;;
  *) echo 'Current frontend is outside the configured release directory.' >&2; exit 1 ;;
esac

working_directory="$(sudo -n systemctl show "$service" --property=WorkingDirectory --value)"
[[ "$working_directory" == "$current" ]]
sudo -n systemctl is-active --quiet "$service"
command -v git >/dev/null
command -v npm >/dev/null
command -v curl >/dev/null

switched=false
rollback_on_error() {
  status=$?
  trap - EXIT
  if (( status != 0 )) && [[ "$switched" == true ]]; then
    echo 'Health check failed; restoring previous frontend release.' >&2
    ln -s "$previous" "$base/.current-rollback-$sha"
    mv -Tf "$base/.current-rollback-$sha" "$current"
    sudo -n systemctl restart "$service" || true
  fi
  exit "$status"
}
trap rollback_on_error EXIT

git clone --quiet --no-checkout https://github.com/troll9x/headless-wordpress.git "$release"
git -C "$release" checkout --quiet --detach "$sha"
[[ "$(git -C "$release" rev-parse HEAD)" == "$sha" ]]
install -m 600 "$environment" "$release/university-next/.env.production.local"
npm ci --prefix "$release/university-next"
TLU_RELEASE_ID="${sha:0:12}" npm --prefix "$release/university-next" run build

ln -s "$release/university-next" "$base/.current-next-$sha"
mv -Tf "$base/.current-next-$sha" "$current"
switched=true
sudo -n systemctl restart "$service"

healthy=false
for attempt in {1..8}; do
  headers="$(curl --silent --show-error --fail --head --max-time 10 "$health_url" || true)"
  release_id="$(printf '%s\n' "$headers" | tr -d '\r' | awk 'tolower($1)=="x-tlu-release:" {print tolower($2)}' | tail -n 1)"
  if [[ "$release_id" == "${sha:0:12}" ]]; then
    healthy=true
    break
  fi
  sleep 3
done
[[ "$healthy" == true ]]
echo "Frontend service healthy at release ${sha:0:12}; previous release retained at $previous"
