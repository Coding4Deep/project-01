
## 🧩 Step 1 — Install Vault on Linux

```bash
# Add HashiCorp repo
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"

# Install Vault
sudo apt update && sudo apt install vault -y
```

Check:

```bash
vault -v
```

---

## 🧩 Step 2 — Generate self-signed TLS cert using OpenSSL

Vault **requires HTTPS** for production (never run it without TLS).

```bash
sudo mkdir -p /opt/vault/tls
cd /opt/vault/tls

# Generate private key
openssl genrsa -out vault.key 2048

# Generate CSR
openssl req -new -key vault.key -out vault.csr \
  -subj "/C=IN/ST=Delhi/L=Delhi/O=DevOps/CN=vault.local"

# Generate self-signed cert
openssl x509 -req -days 365 -in vault.csr -signkey vault.key -out vault.crt
```

Now you have:

```
vault.key → private key
vault.crt → self-signed cert
```

---

## 🧩 Step 3 — Create Vault Configuration File

Create: `/etc/vault.d/vault.hcl`

```hcl
ui = true
disable_mlock = true

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/opt/vault/tls/vault.crt"
  tls_key_file  = "/opt/vault/tls/vault.key"
}

storage "file" {
  path = "/opt/vault/data"
}

api_addr = "https://<YOUR_SERVER_IP>:8200"
cluster_addr = "https://<YOUR_SERVER_IP>:8201"
```

**Permissions**

```bash
sudo mkdir -p /opt/vault/data
sudo chown -R vault:vault /opt/vault
```

---

## 🧩 Step 4 — Start Vault server

Run in dev first to test config:

```bash
sudo vault server -config=/etc/vault.d/vault.hcl
```

If you see no errors, open a new terminal and export the environment variable:

```bash
export VAULT_ADDR="https://<YOUR_SERVER_IP>:8200"
export VAULT_SKIP_VERIFY=true   # only for self-signed cert testing
```

---

## 🧩 Step 5 — Initialize & Unseal Vault

In another terminal:

```bash
vault operator init
# vault operator init -key-shares=5 -key-threshold=3

```

Output looks like:

```
Unseal Key 1: xxxxx
Unseal Key 2: xxxxx
Unseal Key 3: xxxxx
Initial Root Token: hvs.xxxxxx
```

Unseal with 3 keys (use any 3 out of 5):

```bash
vault operator unseal
```

Then login:

```bash
vault login hvs.xxxxxx
```

✅ Vault is now unsealed and ready.

---

## 🧩 Step 6 — Enable KV Secrets Engine and Store Secrets

Enable KV v2 (key-value store):

```bash
vault secrets enable -path=secret kv-v2
```

Store a secret:

```bash
vault kv put secret/aws access_key="AKIAxxxxx" secret_key="xxxxxxx"
vault kv put secret/database username="admin" password="SuperPass123"
```

Read it back:

```bash
vault kv get secret/aws
```

---

## 🧩 Step 7 — Create Vault Token for Terraform

Terraform needs a token to authenticate with Vault. You can create a limited token for that.

Create a policy file `terraform-policy.hcl`:

```hcl
path "secret/data/*" {
  capabilities = ["read"]
}
```

Write the policy:

```bash
vault policy write terraform terraform-policy.hcl
```

Create token attached to that policy:

```bash
vault token create -policy=terraform -ttl=1h
```

Copy the token value — you’ll use it in Terraform.

---

## 🧩 Step 8 — Terraform code to access Vault secrets

Now create a Terraform project.

**`main.tf`**

```hcl
terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.24.0"
    }
  }
}

provider "vault" {
  address = "https://<YOUR_SERVER_IP>:8200"
  token   = "<YOUR_VAULT_TOKEN>"
  skip_tls_verify = true
}

# Read AWS secret
data "vault_kv_secret_v2" "aws_creds" {
  mount = "secret"
  name  = "aws"
}

# Read DB secret
data "vault_kv_secret_v2" "db_creds" {
  mount = "secret"
  name  = "database"
}

output "aws_access_key" {
  value = data.vault_kv_secret_v2.aws_creds.data["access_key"]
}

output "db_password" {
  value     = data.vault_kv_secret_v2.db_creds.data["password"]
  sensitive = true
}
```

Initialize and run:

```bash
terraform init
terraform apply
```

✅ You’ll see the secrets fetched from Vault dynamically.

---

## 🧩 Step 9 — Use AWS Auth Type (for EC2 or EKS)

Now let’s move from static tokens to **AWS IAM-based authentication** (more secure).

Vault can verify an EC2 instance or IAM role identity and issue a Vault token automatically.

### Enable AWS Auth

```bash
vault auth enable aws
```

### Configure Vault’s AWS Auth with IAM creds

Vault must call AWS STS to verify identities. Use limited IAM user/role for that:

```bash
vault write auth/aws/config/client \
    access_key=<VAULT_AWS_ACCESS_KEY_ID> \
    secret_key=<VAULT_AWS_SECRET_ACCESS_KEY> \
    region=us-east-1
```

### Create a Vault role mapped to an IAM role

Let’s say your EC2 instance or EKS pod runs as IAM role `arn:aws:iam::123456789012:role/devops-role`.

Create a Vault role:

```bash
vault write auth/aws/role/devops-role \
    auth_type=iam \
    bound_iam_principal_arn=arn:aws:iam::123456789012:role/devops-role \
    policies=terraform \
    ttl=1h
```

Now, any EC2 instance or pod assuming that IAM role can login to Vault without a static token.

---

## 🧩 Step 10 — Login via AWS Auth (EC2 example)

On EC2 instance running with `devops-role`, install Vault CLI and run:

```bash
vault login -method=aws role=devops-role
```

Vault verifies the instance’s IAM identity via STS, and returns a temporary Vault token with your `terraform` policy.

You can now run your Terraform commands using that token:

```bash
export VAULT_TOKEN=$(vault login -method=aws role=devops-role -format=json | jq -r '.auth.client_token')
terraform apply
```

---

## 🧩 Step 11 — (Optional) Terraform + AWS Auth Integration

If you want Terraform to automatically authenticate via AWS Auth:

```hcl
provider "vault" {
  address = "https://<YOUR_SERVER_IP>:8200"

  auth_login {
    path = "auth/aws/login"
    parameters = {
      role = "devops-role"
    }
  }
}
```

Terraform will automatically use the EC2 instance IAM role to get a Vault token.

---

## 🧠 Recap of What You Built

✅ Installed Vault with custom config + TLS
✅ Created KV secrets and policies
✅ Accessed them dynamically from Terraform
✅ Secured Terraform access via AWS IAM Auth (no hardcoded tokens!)
✅ Fully production-like flow 🔥

---

