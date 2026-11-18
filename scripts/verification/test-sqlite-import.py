"""Run against a PostgreSQL test role allowed to create disposable databases (standard PG* environment)."""
import contextlib
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
import uuid

import psycopg2
from psycopg2 import sql

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('import_pg', ROOT / 'deploy/lan/sqlite/import_pg.py')
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class PostgresImport(unittest.TestCase):
    def test_published_data_and_failure_paths(self):
        database = 'entrip_conversion_test_' + uuid.uuid4().hex
        admin_db = os.environ.get('PGDATABASE')
        with contextlib.closing(psycopg2.connect('')) as admin, tempfile.TemporaryDirectory() as tmp:
            admin.autocommit = True
            with admin.cursor() as cur:
                cur.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(database)))
            try:
                os.environ['PGDATABASE'] = database
                with contextlib.closing(psycopg2.connect('')) as source:
                    source.autocommit = True
                    with source.cursor() as cursor:
                        cursor.execute('CREATE TABLE public._prisma_migrations (migration_name text,finished_at timestamptz, rolled_back_at timestamptz)')
                        migrations = sorted((ROOT / 'packages/api/prisma/migrations').glob('*/migration.sql'))
                        for script in migrations:
                            if script.parent.name == migration.BASELINE:
                                cursor.execute("""CREATE TABLE "ExtraOldLedger" (note text, units integer);
                                    INSERT INTO "ExtraOldLedger" VALUES ('보존할 이전 행',3);
                                    CREATE SEQUENCE retained_counter START 17;
                                    SELECT nextval('retained_counter');""")
                            cursor.execute(script.read_text())
                            cursor.execute('INSERT INTO public._prisma_migrations VALUES (%s,now(),null)', (script.parent.name,))
                        cursor.execute("""
                            INSERT INTO "User" (id,email,name,password,role,"updatedAt")
                              VALUES ('u-old','conversion@example.test','검증 직원','existing-hash','ADMIN',now());
                            INSERT INTO "Booking" (id,"bookingNumber","teamName",type,origin,destination,"startDate","endDate",
                                coordinator,revenue,"hotelInfo","flightInfo","insuranceInfo","userId","updatedAt","legacyType")
                              VALUES ('b-old','LAN-OLD','복구팀','GROUP','부산','오사카','2026-10-25 01:02:03.456',
                                '2026-10-27','검증 직원',1234567.89,'{"contact":"가","unknown":["O''''Brien",null]}',
                                'null',null,'u-old',now(),'원본-유형');
                            INSERT INTO "Settlement" (id,"bookingId",type,currency,amount,"exchangeRate","updatedAt")
                              VALUES ('s-old','b-old','INCOME','JPY',1000.5,9.175,now());
                            INSERT INTO "Flight" (id,"bookingId","flightNumber",airline,origin,destination,"departureTime",
                                "arrivalTime","seatNumbers","updatedAt")
                              VALUES ('f-old','b-old','A1','검증항공','PUS','KIX',now(),now(),array['12A','10,B'],now()),
                                     ('f-null','b-old','A2','검증항공','KIX','PUS',now(),now(),null,now());
                        """)
                    target = Path(tmp)/'entrip.sqlite'
                    report = migration.migrate(target)
                    self.assertEqual(report['businessTables'],35)
                    with contextlib.closing(sqlite3.connect(target)) as db:
                        self.assertEqual(db.execute('select id,password,role from "User"').fetchone(),('u-old','existing-hash','ADMIN'))
                        row = db.execute('select bookingNumber,startDate,revenue,flightInfo,insuranceInfo,hotelInfo from Booking').fetchone()
                        expected_date = int(dt.datetime(2026,10,25,1,2,3,456000,tzinfo=dt.timezone.utc).timestamp()*1000)
                        self.assertEqual(row[:5],('LAN-OLD',expected_date,1234567.89,'null',None))
                        self.assertEqual(json.loads(row[5])['contact'],'가')
                        self.assertEqual(db.execute('select bookingId,exchangeRate from Settlement').fetchone(),('b-old',9.175))
                        self.assertEqual(json.loads(db.execute("select seatNumbers from Flight where id='f-old'").fetchone()[0]),['12A','10,B'])
                        self.assertEqual(db.execute("select seatNumbers from Flight where id='f-null'").fetchone()[0],'[]')
                        self.assertEqual(db.execute("select last_value,is_called from _entrip_pg_sequences where name='retained_counter'").fetchone(),('17',1))
                        extra = db.execute("select values_json from _entrip_pg_extra where namespace='public' and table_name='Booking'").fetchone()[0]
                        self.assertEqual(json.loads(extra)['legacyType'],'원본-유형')
                        old = db.execute("select values_json from _entrip_pg_extra where namespace='entrip_legacy_20261117' and table_name='ExtraOldLedger'").fetchone()[0]
                        self.assertEqual(json.loads(old),{'note':'보존할 이전 행','units':'3'})
                        self.assertEqual(db.execute('pragma foreign_key_check').fetchall(),[])
                        self.assertEqual(db.execute('select checksum from _prisma_migrations').fetchone()[0],
                                         hashlib.sha256(migration.SCHEMA.read_bytes()).hexdigest())
                    self.assertEqual(migration.read_existing(target)['status'],'already-imported')
                    before = target.read_bytes()
                    with self.assertRaises(migration.MigrationError):
                        migration.migrate(target)
                    self.assertEqual(target.read_bytes(),before)
                    # Old DB remains intact and high precision values are never silently rounded.
                    with source.cursor() as cur:
                        cur.execute('select "legacyType",revenue::text from "Booking" where id=%s',('b-old',))
                        stored_type, value = cur.fetchone()
                        self.assertEqual(stored_type,'원본-유형')
                        self.assertEqual(value.rstrip('0'),'1234567.89')
                        cur.execute("""UPDATE "Booking" SET revenue=12345678901234567890.1234567 WHERE id='b-old'""")
                    other = Path(tmp)/'invalid.sqlite'
                    with self.assertRaisesRegex(migration.MigrationError,'Booking.revenue'):
                        migration.migrate(other)
                    self.assertFalse(other.exists())
                    self.assertEqual(list(Path(tmp).glob('.entrip-pg-import*')),[])
            finally:
                if admin_db is None:
                    os.environ.pop('PGDATABASE',None)
                else:
                    os.environ['PGDATABASE'] = admin_db
                with admin.cursor() as cur:
                    cur.execute(sql.SQL('DROP DATABASE {}').format(sql.Identifier(database)))


if __name__ == '__main__':
    unittest.main()
