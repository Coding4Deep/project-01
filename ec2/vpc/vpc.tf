
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  tags = {
    env = var.vpc_env
    Name = var.vpc_name
  }
}

resource "aws_subnet" "public_subnet" {

    vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs
  map_public_ip_on_launch = true
  availability_zone       = var.availability_zones

  tags = {
    Name = "${var.vpc_name}-public-subnet"
    env  = var.vpc_env
  }
}

resource "aws_internet_gateway" "igw" {
    vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.vpc_name}-igw"
    env  = var.vpc_env
  }
}

resource "aws_route_table" "public_rt" {
    vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = {
    Name = "${var.vpc_name}-public-rt"
    env  = var.vpc_env
  }
}

resource "aws_route_table_association" "public_rt_assoc" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

