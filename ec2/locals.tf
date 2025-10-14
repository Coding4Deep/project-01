locals {
  ec2_configs = {
    jenkins-master = {
      ami           = "ami-0360c520857e3138f" # Example Amazon Linux 2
      instance_type = "t2.micro"
      subnet_id     = "module.vpc.public_subnet_id.id"
    }

    #   jenkins-slave = {
    #     ami           = "ami-0c02fb55956c7d316"
    #     instance_type = "t2.micro"
    #     subnet_id     = "subnet-1234567890abcdef0"
    #   }
    #   nexus-sonar = {
    #     ami           = "ami-0c02fb55956c7d316"
    #     instance_type = "t2.micro"
    #     subnet_id     = "subnet-1234567890abcdef0"
    #   }
  }
}
