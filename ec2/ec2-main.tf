module "vpc" {
  source = "./vpc"
}

module "pem_key" {
  source = "./pem-key"
}

module "sg" {
  source = "./sg"
  vpc_id   = module.vpc.vpc_id
}

resource "aws_instance" "servers" {
  for_each      = local.ec2_configs
  depends_on    = [module.vpc, module.pem_key]
  ami           = each.value.ami
  instance_type = each.value.instance_type
  subnet_id     = each.value.subnet_id
  key_name      = module.pem_key.key_name
  security_groups = [
    module.sg.sg_id
  ]

  # Custom root volume
  root_block_device {
    volume_size           = 50
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = each.key
    ENV  = var.env
  }
}

# Allocate one EIP per EC2 instance
resource "aws_eip" "ec2_eip" {
  for_each = aws_instance.servers
  vpc      = true

  tags = {
    Name = "${each.key}-eip"
  }
}

# Associate each EIP with its EC2
resource "aws_eip_association" "ec2_eip_assoc" {
  for_each      = aws_instance.servers
  instance_id   = each.value.id
  allocation_id = aws_eip.ec2_eip[each.key].id
}