locals {
  ec2_configs = {
    # jen-master-02 = {
    #   ami           = "ami-0360c520857e3138f"
    #   instance_type = "t2.medium"
    #   subnet_id     = module.vpc.public_subnet_id
    # }  

    # jenkins-master-02 = {
    #   ami           = "ami-0360c520857e3138f"
    #   instance_type = "t2.medium"
    #   subnet_id     = module.vpc.public_subnet_id
    # }
    sonar-nexus = {
      ami           = "ami-02d26659fd82cf299"
      instance_type = "t2.large"
      subnet_id     = module.vpc.public_subnet_id
    }
  }
}
