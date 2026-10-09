#!/bin/bash
# Install the instance updater on a git + systemd LuminaScreen (the prod / studiolab shape), so
# Platform → System → "Update Now" can upgrade this server. Run as root from the checkout:
#
#   sudo scripts/updater/install-systemd.sh                 # service "luminascreen"
#   sudo SERVICE_NAME=remotedisplay scripts/updater/install-systemd.sh
#
# Everything is read from the RUNNING service's unit (User, WorkingDirectory, ExecStart's node,
# Environment / EnvironmentFile for DATA_DIR, DB_PATH and PORT) rather than assumed, because the
# installs we run differ: prod keeps the DB inside the checkout, studiolab has DATA_DIR in
# /var/lib/luminascreen. Review /etc/luminascreen-updater.env after it runs.
#
# It installs, and the app CANNOT modify:
#   /usr/local/lib/luminascreen-updater/st-updater.sh   (root 755, a COPY — not the repo file the
#                                                       app user can edit, which root would run)
#   /etc/luminascreen-updater.env                       (root 600)
#   /etc/systemd/system/luminascreen-updater.{path,service}
#   /var/lib/luminascreen-updater/                      (root 755: status + log the app reads)
# and one directory the app CAN write: $DATA_DIR/updater/requests (owned by the service user).
#
# Nothing upgrades on its own: the path unit fires only when the app writes a request, and the
# app writes one only when a platform admin presses the button.
#
# Uninstall: systemctl disable --now luminascreen-updater.path; rm the files above.
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)." >&2; exit 1; }
SERVICE_NAME="${SERVICE_NAME:-luminascreen}"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

systemctl cat "$SERVICE_NAME" >/dev/null 2>&1 || { echo "No systemd unit '$SERVICE_NAME'. Set SERVICE_NAME=." >&2; exit 1; }
prop() { systemctl show -p "$1" --value "$SERVICE_NAME"; }

SVC_USER="$(prop User)"; SVC_USER="${SVC_USER:-root}"
WORKDIR="$(prop WorkingDirectory)"
[ -n "$WORKDIR" ] || { echo "The unit has no WorkingDirectory; cannot locate the checkout." >&2; exit 1; }
APP_DIR="$(cd "$WORKDIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$APP_DIR" ] && [ -f "$APP_DIR/scripts/upgrade.sh" ] || { echo "$WORKDIR is not inside a LuminaScreen git checkout." >&2; exit 1; }

# The node the service runs, so npm ci builds native modules against the same one.
NODE_BIN="$(prop ExecStart | sed -n 's/.*path=\([^ ;]*\).*/\1/p')"
case "$NODE_BIN" in */node) NODE_BIN_DIR="$(dirname "$NODE_BIN")" ;; *) NODE_BIN_DIR="$(dirname "$(command -v node || echo /usr/bin/node)")" ;; esac

# Environment= first, then EnvironmentFile= (later wins, as in systemd).
envval() {
  local key="$1" v=""
  v="$(prop Environment | tr ' ' '\n' | sed -n "s/^$key=//p" | tail -1)"
  for f in $(prop EnvironmentFiles | sed 's/ (ignore_errors=[a-z]*)//g'); do
    if [ -r "$f" ]; then
      local fv
      fv="$(sed -n "s/^[[:space:]]*$key=//p" "$f" | tail -1 | tr -d "\"'")"
      [ -n "$fv" ] && v="$fv"
    fi
  done
  printf '%s' "$v"
}
DATA_DIR="$(envval DATA_DIR)"; DATA_DIR="${DATA_DIR:-$APP_DIR/server}"
DB="$(envval DB_PATH)"; DB="${DB:-$DATA_DIR/db/remote_display.db}"
PORT="$(envval PORT)"; PORT="${PORT:-3001}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
[ -d "$(dirname "$BACKUP_DIR")" ] && [ -w "$(dirname "$BACKUP_DIR")" ] || BACKUP_DIR="/var/backups/luminascreen"
APP_USER="$(stat -c %U "$APP_DIR")"   # the checkout's owner runs git + npm, never root
REQ_DIR="$DATA_DIR/updater/requests"
OUT_DIR=/var/lib/luminascreen-updater
LIB=/usr/local/lib/luminascreen-updater

[ -f "$DB" ] || { echo "WARNING: no database at $DB - fix DB in /etc/luminascreen-updater.env before using the button." >&2; }
command -v sqlite3 >/dev/null || echo "WARNING: sqlite3 is not installed; the updater refuses to upgrade without a backup (apt install sqlite3)." >&2
command -v runuser >/dev/null || { echo "runuser (util-linux) is required." >&2; exit 1; }

install -d -m 755 "$LIB" "$OUT_DIR"
install -m 755 "$SRC_DIR/st-updater.sh" "$LIB/st-updater.sh"
# The parent is ROOT's: only the requests directory inside it belongs to the app. An app-owned
# parent would let the app swap requests/ for a symlink to any directory root then acts in.
install -d -m 755 -o root -g root "$DATA_DIR/updater"
install -d -m 770 -o "$SVC_USER" "$REQ_DIR"
REQ_DIR="$(cd "$REQ_DIR" && pwd -P)"   # st-updater.sh refuses a spool path with a symlink in it
if [ "$APP_USER" = root ]; then
  echo "WARNING: $APP_DIR is owned by root, so git and npm ci (with its install scripts) run as root." >&2
  echo "         chown the checkout to an unprivileged user to keep them out of root." >&2
fi

umask 077
cat > /etc/luminascreen-updater.env <<EOF
# Written by scripts/updater/install-systemd.sh on $(date -u +%F). Read by luminascreen-updater.service.
UPDATER_MODE=git
UPDATER_REQUEST_DIR=$REQ_DIR
UPDATER_STATUS_DIR=$OUT_DIR
APP_DIR=$APP_DIR
APP_USER=$APP_USER
SERVICE_NAME=$SERVICE_NAME
DB=$DB
BACKUP_DIR=$BACKUP_DIR
NODE_BIN_DIR=$NODE_BIN_DIR
STATUS_URL=http://localhost:$PORT/api/status
EOF
umask 022

cat > /etc/systemd/system/luminascreen-updater.service <<EOF
[Unit]
Description=LuminaScreen instance updater (runs one admin-requested upgrade)
After=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/luminascreen-updater.env
ExecStart=$LIB/st-updater.sh once
TimeoutStartSec=30min
EOF

cat > /etc/systemd/system/luminascreen-updater.path <<EOF
[Unit]
Description=Watch for LuminaScreen upgrade requests from the dashboard

[Path]
DirectoryNotEmpty=$REQ_DIR
Unit=luminascreen-updater.service

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now luminascreen-updater.path
# One empty run writes the marker the dashboard looks for.
systemctl start luminascreen-updater.service

echo "Installed. Checkout $APP_DIR (git as $APP_USER), service $SERVICE_NAME, DB $DB, backups $BACKUP_DIR."
echo "Review /etc/luminascreen-updater.env. The button appears under Platform -> System once a newer release exists."
