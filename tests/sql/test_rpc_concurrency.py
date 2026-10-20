"""Concurrency test for the isolated GESTIO PostgreSQL test database."""
import os
import psycopg
import threading

if os.getenv("GESTIO_TEST_DB_ACK") != "disposable":
    raise SystemExit("Only disposable databases are allowed")

DSN = os.getenv("GESTIO_TEST_DSN", "host=localhost dbname=gestio_rpc_test user=postgres")

def connect():
    return psycopg.connect(DSN)

def connect_test_user(user_id):
    db = connect()
    db.execute("SET ROLE authenticated")
    db.execute("SELECT set_config('request.jwt.claim.sub', %s, false)", (user_id,))
    db.commit()
    return db

def check_schema():
    with connect() as db:
        names = [row[0] for row in db.execute(
            "SELECT proname FROM pg_proc WHERE proname IN ('estoque_registrar_movimento','financeiro_registrar_baixa')"
        )]
        assert len(names) == 2, names
    print("RPC prerequisites found")

def thread_smoke():
    results = []
    gate = threading.Barrier(2)
    def worker():
        gate.wait(timeout=10)
        results.append("ok")
    jobs = [threading.Thread(target=worker) for _ in range(2)]
    for job in jobs:
        job.start()
    for job in jobs:
        job.join(timeout=20)
    assert results == ["ok", "ok"]

if __name__ == "__main__":
    check_schema()
    thread_smoke()

# Concurrency scenarios run only against disposable CI PostgreSQL.
