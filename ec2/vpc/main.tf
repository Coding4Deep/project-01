resource "aws_vpc" {
  cidr_block = var.cidr_block
  tags = {
    Name = var.vpc_name
  }
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.id
  cidr_block              = var.public_subnet_cidrs
  map_public_ip_on_launch = true
  availability_zone       = var.availability_zones

  tags = {
    Name = "${var.vpc_name}-public-${count.index + 1}"
  }
}