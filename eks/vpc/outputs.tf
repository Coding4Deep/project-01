
output "vpc_id" {
  value = aws_vpc.eks-vpc.id
}

output "public_subnet_ids" {
  value = [for s in values(aws_subnet.public) : s.id]
}

output "private_subnet_ids" {
  value = [for s in values(aws_subnet.private) : s.id]
}

# output "internet_gateway_id" {
#   value = aws_internet_gateway.igw.id
# }

# output "nat_gateway_ids" {
#   value = var.enable_nat ? [for n in aws_nat_gateway.nat : n.id] : []
# }

# output "route_table_public_id" {
#   value = aws_route_table.public.id
# }

# output "route_table_private_ids" {
#   value = [for rt in values(aws_route_table.private) : rt.id]
# }

# output "alb_security_group_id" {
#   value = aws_security_group.alb_sg.id
# }

# output "vpc_endpoints" {
#   value = var.create_vpc_endpoints ? {
#     s3      = aws_vpc_endpoint.s3[0].id
#     ecr_api = aws_vpc_endpoint.ecr_api[0].id
#     ecr_dkr = aws_vpc_endpoint.ecr_dkr[0].id
#   } : {}
# }
