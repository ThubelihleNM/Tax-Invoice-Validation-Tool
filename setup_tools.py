import os
import sys
import zipfile
import urllib.request
import shutil

TOOLS_DIR = os.path.abspath("tools")
os.makedirs(TOOLS_DIR, exist_ok=True)

MARIADB_URL = "https://archive.mariadb.org/mariadb-11.4.2/winx64-packages/mariadb-11.4.2-winx64.zip"
NODE_URL = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"

def download_file(url, dest_path):
    if os.path.exists(dest_path):
        print(f"File already exists: {dest_path}")
        return
    print(f"Downloading {url} to {dest_path}...")
    
    def reporthook(count, block_size, total_size):
        percent = int(count * block_size * 100 / total_size) if total_size > 0 else 0
        sys.stdout.write(f"\rDownloading... {percent}% ({count * block_size // 1024 // 1024}MB / {total_size // 1024 // 1024}MB)")
        sys.stdout.flush()

    opener = urllib.request.build_opener()
    opener.addheaders = [('User-agent', 'Mozilla/5.0')]
    urllib.request.install_opener(opener)
    urllib.request.urlretrieve(url, dest_path, reporthook)
    print("\nDownload complete!")

def extract_zip(zip_path, extract_to):
    print(f"Extracting {zip_path} to {extract_to}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    print("Extraction complete!")

def setup_node():
    node_zip = os.path.join(TOOLS_DIR, "node.zip")
    node_extract = os.path.join(TOOLS_DIR, "node_tmp")
    target_node = os.path.join(TOOLS_DIR, "node")
    
    if os.path.exists(os.path.join(target_node, "node.exe")):
        print("Node.js is already set up at", target_node)
        return target_node
        
    download_file(NODE_URL, node_zip)
    extract_zip(node_zip, node_extract)
    
    # Locate node-v... folder
    subdirs = [os.path.join(node_extract, d) for d in os.listdir(node_extract) if os.path.isdir(os.path.join(node_extract, d))]
    if subdirs:
        if os.path.exists(target_node):
            shutil.rmtree(target_node)
        shutil.move(subdirs[0], target_node)
    shutil.rmtree(node_extract, ignore_errors=True)
    if os.path.exists(node_zip):
        os.remove(node_zip)
    print("Node.js setup successful at", target_node)
    return target_node

def setup_mariadb():
    mariadb_zip = os.path.join(TOOLS_DIR, "mariadb.zip")
    mariadb_extract = os.path.join(TOOLS_DIR, "mariadb_tmp")
    target_mariadb = os.path.join(TOOLS_DIR, "mariadb")
    
    if os.path.exists(os.path.join(target_mariadb, "bin", "mariadbd.exe")):
        print("MariaDB is already set up at", target_mariadb)
        return target_mariadb
        
    download_file(MARIADB_URL, mariadb_zip)
    extract_zip(mariadb_zip, mariadb_extract)
    
    subdirs = [os.path.join(mariadb_extract, d) for d in os.listdir(mariadb_extract) if os.path.isdir(os.path.join(mariadb_extract, d))]
    if subdirs:
        if os.path.exists(target_mariadb):
            shutil.rmtree(target_mariadb)
        shutil.move(subdirs[0], target_mariadb)
    shutil.rmtree(mariadb_extract, ignore_errors=True)
    if os.path.exists(mariadb_zip):
        os.remove(mariadb_zip)
    print("MariaDB setup successful at", target_mariadb)
    return target_mariadb

if __name__ == "__main__":
    setup_node()
    setup_mariadb()
