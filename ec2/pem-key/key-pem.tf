variable "pem_file_name" {
  description = "The name of the PEM file to create"
  type        = string
  default     = "deepak-key"
}


# Generate RSA key pair
resource "tls_private_key" "ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Save private key locally
resource "local_file" "private_key" {
  content         = tls_private_key.ssh_key.private_key_pem
  filename        = "${pathexpand("~")}/${var.pem_file_name}.pem"
  file_permission = "0400"
}

# Save public key locally
resource "local_file" "public_key" {
  content         = tls_private_key.ssh_key.public_key_openssh
  filename        = "${pathexpand("~")}/${var.pem_file_name}.pub"
  file_permission = "0644"
}

# Register public key with AWS
resource "aws_key_pair" "aws_key" {
  key_name   = var.pem_file_name
  public_key = tls_private_key.ssh_key.public_key_openssh
}

output "key_name" {
  value = aws_key_pair.aws_key.key_name  
}

output "pem_file_path" {
  value = abspath(local_file.private_key.filename)
}
