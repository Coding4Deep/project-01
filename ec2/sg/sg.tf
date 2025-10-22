
resource "aws_security_group" "ec2_sg" {
  name        = var.sg_name
  description = "EC2 Security Group with dynamic ingress"
  vpc_id      = var.vpc_id

  #  Dynamic ingress rules
  dynamic "ingress" {
    for_each = var.allowed_ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow TCP port ${ingress.value}"
    }
  }
  ingress = [
    {
      from_port   = -1
      to_port     = -1
      protocol    = "icmp"
      cidr_blocks = ["0.0.0.0/0"]
      ipv6_cidr_blocks = []
      prefix_list_ids  = []
      security_groups  = []
      description      = "Allow ping from anywhere"
    }
  ]

  # Allow all egress traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.sg_name
    Env  = "dev"
  }
}

output "sg_id" {
  value = aws_security_group.ec2_sg.id
}
