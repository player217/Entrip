#!/bin/sh
# wait-for-postgres.sh

set -e

host="postgres"
port="5432"
user="entrip"
shift 0

until PGPASSWORD=entrip psql -h "$host" -p "$port" -U "$user" -c '\q' 2>/dev/null; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
exec "$@"