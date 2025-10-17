# output "aws_access_key" {
#   value = data.vault_kv_secret_v2.aws_creds.data["access_key"]
# }

output "ec2_public_ips" {
    value = module.ec2.public_ec2_ips
}