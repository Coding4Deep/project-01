ui = true
disable_mlock = true

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/home/sagar/project-01/vault/tls/vault.crt"
  tls_key_file  = "/home/sagar/project-01/vault/tls/vault.key"
}

storage "file" {
  path = "/home/sagar/project-01/vault/data"
}

api_addr = "https://0.0.0.0:8200"
cluster_addr = "https://0.0.0.0:8201"
