
variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "my-eks-cluster"
}

variable "node_instance_type" {
  description = "EC2 instance type for node group"
  type        = string
  default     = "t3.medium"
}

variable "node_desired_capacity" {
  description = "Desired number of EC2 worker nodes"
  type        = number
  default     = 2
}

variable "fargate_namespace" {
  description = "Kubernetes namespace for Fargate pods"
  type        = string
  default     = "fargate-apps"
}

variable "tags" {
  type = map(string)
  default = {
    Owner   = "deepak"
    Project = "eks-vpc"
  }
}

# variable "version" {
#   description = "EKS Kubernetes version"
#   type        = string
#   default     = "1.30"
# }
