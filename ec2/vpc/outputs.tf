output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "The IDs of the public subnets"
  value       =  aws_subnet.public_subnet.id
}
