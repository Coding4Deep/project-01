resource "aws_security_group" "ec2_sg" {
  name        = var.sg_name
  description = "EC2 Security Group with dynamic ingress"
  vpc_id      = var.vpc_id

  # 🔹 Dynamic ingress rules for TCP ports
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

  # 🔹 Static ingress rule for ICMP (ping)
  ingress {
    from_port   = -1
    to_port     = -1
    protocol    = "icmp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow ping from anywhere"
  }

  # 🔹 Allow all outbound traffic
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
