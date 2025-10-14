#!/bin/bash
set -euo pipefail

# Usage: ./generate-vault-cert.sh /abs/path/to/output_dir
OUT_DIR="${1:-/home/sagar/project-01/vault/tls}"
mkdir -p "$OUT_DIR"

CN="vault.local"
KEY="$OUT_DIR/vault.key"
CRT="$OUT_DIR/vault.crt"

# Generate key
openssl genrsa -out "$KEY" 2048

# Generate CSR and self-signed cert with SANs from config
openssl req -new -key "$KEY" -out "$OUT_DIR/vault.csr" -config "$(dirname "$0")/openssl-san.cnf"
openssl x509 -req -in "$OUT_DIR/vault.csr" -signkey "$KEY" -out "$CRT" -days 365 -extensions req_ext -extfile "$(dirname "$0")/openssl-san.cnf"

chmod 644 "$CRT"
chmod 600 "$KEY"

echo "Generated cert: $CRT"
echo "Generated key: $KEY"
