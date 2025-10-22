terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    # vault = {
    #   source  = "hashicorp/vault"
    #   version = "~> 3.0"
    # }
  }
  # backend "s3" {
  #   bucket         = "terraform-state-bucket-unique-123456"
  #   key            = "global/s3/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-lock-table"
  #   encrypt        = true
  # }
}

# provider "vault" {
#   address = "https://127.0.1.0:8200"
#   token   = var.vault_token
#   #skip_tls_verify = true
# }

# data "vault_kv_secret_v2" "aws_creds" {
#   mount = "awscreds"
#   name  = "aws"
# }

provider "aws" {
  region = "us-east-1"
  # access_key = data.vault_kv_secret_v2.aws_creds.data["access_key"]
  # secret_key = data.vault_kv_secret_v2.aws_creds.data["secret_key"]
}


# module "s3-backend" {
#   source = "./s3"
# }

module "ec2" {
  source = "./ec2"
}

# module "eks" {
#   source = "./eks"
# }

