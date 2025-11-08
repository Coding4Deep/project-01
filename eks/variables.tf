
variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "interview-eks"
}

variable "node_instance_type" {
  description = "EC2 instance type for node group"
  type        = string
  default     = "c7i-flex.large"
}

variable "node_desired_capacity" {
  description = "Desired number of EC2 worker nodes"
  type        = number
  default     = 2
}

variable "fargate_namespace" {
  description = "Kubernetes namespace for Fargate pods"
  type        = string
  default     = "fargate"
}

variable "tags" {
  type = map(string)
  default = {
    Owner   = "deepak"
    Project = "eks-vpc"
  }
}

variable "k8s_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.33"
}
