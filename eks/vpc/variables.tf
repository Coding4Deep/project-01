
variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  description = "List of public subnet CIDRs (one per AZ)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "List of private subnet CIDRs (one per AZ)"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

variable "enable_nat" {
  description = "Create NAT Gateways (one per public subnet / AZ)"
  type        = bool
  default     = true
}

# variable "create_vpc_endpoints" {
#   description = "Create common VPC endpoints (S3 gateway + ECR interface endpoints)"
#   type        = bool
#   default     = true
# }

variable "tags" {
  type = map(string)
  default = {
    Owner   = "deepak"
    Project = "eks-vpc"
  }
}
