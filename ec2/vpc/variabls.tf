variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}
variable "vpc_name" {
  description = "The name of the VPC"
  type        = string
  default     = "my-vpc"
}

variable "vpc_env" {
  description = "The environment of the VPC (e.g., dev, prod)"
  type        = string
  default     = "dev"
}

variable "public_subnet_cidrs" {
  description = "List of CIDR blocks for public subnets"
  type        = string
  default     = "10.0.0.1/24"
}
variable "availability_zones" {
  description = "List of availability zones for subnets"
  type        = string
  default     = "us-east-1a"
}

variable "pem_file_name" {
  description = "The name of the PEM file to create"
  type        = string
  default     = "deepak-project.pem"
}


