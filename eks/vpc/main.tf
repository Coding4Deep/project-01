
# This Terraform project creates a VPC and all networking resources commonly needed for an EKS cluster:
# - VPC with DNS hostnames enabled
# - 2 Public subnets (one per AZ)
# - 2 Private subnets (one per AZ)
# - Internet Gateway
# - Public route table and associations
# - NAT Gateways (one per AZ) + EIPs
# - Private route tables and associations (each private subnet routes 0.0.0.0/0 to NAT in same AZ)
# - Security groups for LB and VPC endpoints
# - VPC endpoints: S3 (gateway) + ECR API/DKR (interface)

data "aws_availability_zones" "available" {
state = "available"
}

locals {
  az_count = length(var.public_subnets)
  azs      = slice(data.aws_availability_zones.available.names, 0, local.az_count)
}

resource "aws_vpc" "eks-vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = merge(var.tags, { Name = "eks-vpc" })
}

# Public subnets (for ALB, NAT gateways)
resource "aws_subnet" "public" {
  for_each = { for idx, cidr in var.public_subnets : tostring(idx) => cidr }

  vpc_id                  = aws_vpc.eks-vpc.id
  cidr_block              = each.value
  availability_zone       = local.azs[tonumber(each.key)]
  map_public_ip_on_launch = true
  tags = merge(var.tags, { Name = "eks-public-${each.key}" })
}

# Private subnets (for nodes / fargate)
resource "aws_subnet" "private" {
  for_each = { for idx, cidr in var.private_subnets : tostring(idx) => cidr }

  vpc_id            = aws_vpc.eks-vpc.id
  cidr_block        = each.value
  availability_zone = local.azs[tonumber(each.key)]
  tags = merge(var.tags, { Name = "eks-private-${each.key}" })
}


resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.eks-vpc.id
  tags   = merge(var.tags, { Name = "eks-igw" })
}


# Public route table -> IGW
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.eks-vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = merge(var.tags, { Name = "eks-public-rt" })
}

resource "aws_route_table_association" "public_assoc" {
  for_each      = aws_subnet.public
  subnet_id     = each.value.id
  route_table_id = aws_route_table.public.id
}

# Elastic IPs for NAT Gateways (one per AZ/public subnet)
resource "aws_eip" "nat" {
  count = var.enable_nat ? local.az_count : 0
  vpc   = true
  tags  = merge(var.tags, { Name = "eks-nat-eip-${count.index}" })
}

# NAT Gateways (put in public subnets)
resource "aws_nat_gateway" "nat" {
  count         = var.enable_nat ? local.az_count : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[tostring(count.index)].id
  tags          = merge(var.tags, { Name = "eks-nat-${count.index}" })
  depends_on    = [aws_internet_gateway.igw]
}

# Private route tables (one per private subnet) -> route to NAT in same AZ
resource "aws_route_table" "private" {
  for_each = aws_subnet.private
  vpc_id   = aws_vpc.eks-vpc.id

  route {
    cidr_block   = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[tonumber(each.key)].id
  }

  tags = merge(var.tags, { Name = "eks-private-rt-${each.key}" })
}

resource "aws_route_table_association" "private_assoc" {
  for_each       = aws_subnet.private
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private[each.key].id
}

# Security group for LoadBalancer (ALB/NLB)
resource "aws_security_group" "alb_sg" {
  name   = "eks-alb-sg"
  vpc_id = aws_vpc.eks-vpc.id
  description = "Allow HTTP/HTTPS from the world to ALB"

  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "eks-alb-sg" })
}

