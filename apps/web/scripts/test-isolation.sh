#!/usr/bin/env bash
# Proves tenant isolation is enforced by the database, not by application code.
#
# Run after every migration. If any check fails, one agency can read or write
# another agency's data — stop and fix before shipping anything.
#
#   ./scripts/test-isolation.sh
set -uo pipefail

ADMIN_URL="${ADMIN_DATABASE_URL:-postgresql://$(whoami)@localhost:5432/avonix_dev}"
APP_URL="${DATABASE_URL:-postgresql://avonix_app:devpassword@localhost:5432/avonix_dev}"

A=11111111-1111-1111-1111-111111111111
B=22222222-2222-2222-2222-222222222222
SET_A="select set_config('app.agency_id','$A',false);"

pass=0; fail=0
check() { # check <name> <expected> <actual>
  if [[ "$3" == *"$2"* ]]; then
    printf '  ok   %s\n' "$1"; pass=$((pass+1))
  else
    printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$2" "$3"; fail=$((fail+1))
  fi
}

echo "Seeding two agencies as the owner..."
psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
DELETE FROM agencies WHERE id IN ('$A','$B');
INSERT INTO agencies (id, name, slug) VALUES
  ('$A','Isolation Test A','iso-test-a'),
  ('$B','Isolation Test B','iso-test-b');
INSERT INTO clients (agency_id, name) VALUES
  ('$A','A client one'), ('$A','A client two'), ('$B','B client one');
SQL

echo "Checking isolation as avonix_app..."

# The role must not be able to bypass RLS in the first place.
check "app role is not a superuser and cannot bypass RLS" "false|false" \
  "$(psql "$ADMIN_URL" -tAc "select rolsuper||'|'||rolbypassrls from pg_roles where rolname='avonix_app'")"

check "no tenant set reads nothing" "0" \
  "$(psql "$APP_URL" -tAc 'select count(*) from clients')"

check "tenant A sees exactly its own two clients" "2" \
  "$(psql "$APP_URL" -tAc "$SET_A select count(*) from clients" | tail -1)"

check "tenant A cannot read tenant B by direct id" "0" \
  "$(psql "$APP_URL" -tAc "$SET_A select count(*) from clients where agency_id='$B'" | tail -1)"

check "tenant A cannot INSERT a row tagged tenant B" "violates row-level security" \
  "$(psql "$APP_URL" -tAc "$SET_A insert into clients (agency_id,name) values ('$B','stolen')" 2>&1)"

check "tenant A cannot UPDATE its row over to tenant B" "violates row-level security" \
  "$(psql "$APP_URL" -tAc "$SET_A update clients set agency_id='$B' where name='A client one'" 2>&1)"

check "tenant A deleting tenant B's row affects no rows" "DELETE 0" \
  "$(psql "$APP_URL" -tAc "$SET_A delete from clients where name='B client one'" 2>&1 | tail -1)"

check "app role cannot disable row level security" "must be owner of table" \
  "$(psql "$APP_URL" -tAc 'alter table clients disable row level security' 2>&1)"

check "app role cannot create tables" "permission denied" \
  "$(psql "$APP_URL" -tAc 'create table sneaky (id int)' 2>&1)"

# Every tenant table must actually carry the policy — a new table added without
# one is the realistic way this protection gets lost later.
missing=$(psql "$ADMIN_URL" -tAc "
  select string_agg(c.relname, ', ')
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname not in ('users','memberships')
    and not exists (select 1 from pg_policies p
                    where p.tablename = c.relname and p.policyname = 'tenant_isolation')")
check "every tenant table has a tenant_isolation policy" "" "${missing:-}"

psql "$ADMIN_URL" -q -c "DELETE FROM agencies WHERE id IN ('$A','$B');" >/dev/null 2>&1

echo
if (( fail > 0 )); then
  echo "ISOLATION BROKEN — $fail failed, $pass passed"
  exit 1
fi
echo "isolation holds — $pass checks passed"
