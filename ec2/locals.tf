locals {
  ec2_configs = {
    jenkins-master-01 = {
      ami           = "ami-0360c520857e3138f"
      instance_type = "t2.medium"
      subnet_id     = module.vpc.public_subnet_id
    }  

    jenkins-master-02 = {
      ami           = "ami-0360c520857e3138f"
      instance_type = "t2.medium"
      subnet_id     = module.vpc.public_subnet_id
    }
    sonar-slave = {
      ami           = "ami-0360c520857e3138f"
      instance_type = "t2.medium"
      subnet_id     = module.vpc.public_subnet_id
    }
  }
}
