output "public_ec2_ips" {
  value = { for k, v in aws_instance.servers : k => v.public_ip }
}
