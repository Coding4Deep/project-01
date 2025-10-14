module "vpc" {
  source = "./vpc"
}

module "pem_key" {
  source = "./pem-key"
}

resource "aws_instance" "servers" {
  for_each      = local.ec2_configs
  depends_on    = [module.vpc, module.pem_key]
  ami           = each.value.ami
  instance_type = each.value.instance_type
  subnet_id     = each.value.subnet_id

  tags = {
    Name = each.key
    Role = each.key
  }
}
