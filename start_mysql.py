import os
import sys
import time
import socket
import subprocess
import pymysql

WORKSPACE_DIR = os.path.abspath(os.path.dirname(__file__))
MARIADB_BIN = os.path.join(WORKSPACE_DIR, "tools", "mariadb", "bin")
DATA_DIR = os.path.join(WORKSPACE_DIR, "tools", "mariadb_data")

def is_port_open(host="127.0.0.1", port=3306):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex((host, port)) == 0

def init_db():
    if not os.path.exists(DATA_DIR) or not os.path.exists(os.path.join(DATA_DIR, "mysql")):
        print(f"Initializing MariaDB/MySQL data directory at {DATA_DIR}...")
        os.makedirs(DATA_DIR, exist_ok=True)
        cmd = [
            os.path.join(MARIADB_BIN, "mariadb-install-db.exe"),
            f"--datadir={DATA_DIR}"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        print("Install-db output:", res.stdout)
        if res.returncode != 0:
            print("Install-db error:", res.stderr)
        print("Data directory initialized!")
    else:
        print("Data directory already initialized.")

def start_server():
    if is_port_open():
        print("MySQL / MariaDB is ALREADY running on port 3306!")
    else:
        print("Starting MariaDB server on port 3306...")
        cmd = [
            os.path.join(MARIADB_BIN, "mariadbd.exe"),
            f"--datadir={DATA_DIR}",
            "--port=3306",
            "--bind-address=127.0.0.1",
            "--console"
        ]
        # Start server as independent process
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
        )
        print(f"Started mariadbd PID: {proc.pid}")

        # Wait for port to open
        for _ in range(30):
            if is_port_open():
                print("MariaDB port 3306 is open and listening!")
                break
            time.sleep(1)
        else:
            raise RuntimeError("Timed out waiting for MariaDB to listen on port 3306")

def create_database():
    print("Connecting to MySQL/MariaDB to create 'tax_invoice_db'...")
    conn = pymysql.connect(
        host="127.0.0.1",
        user="root",
        password="",
        port=3306,
        charset="utf8mb4"
    )
    with conn.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS tax_invoice_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        cursor.execute("SHOW DATABASES;")
        dbs = [row[0] for row in cursor.fetchall()]
        print("Active Databases:", dbs)
        assert "tax_invoice_db" in dbs, "'tax_invoice_db' not found in database list!"
    conn.close()
    print("Database 'tax_invoice_db' is ready for SQLAlchemy!")

if __name__ == "__main__":
    init_db()
    start_server()
    create_database()
