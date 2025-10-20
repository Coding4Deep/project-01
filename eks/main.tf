module "vpc" {
  source = "./vpc"
}

# EKS cluster
resource "aws_eks_cluster" "eks_cluster" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster_role.arn

  vpc_config {
    subnet_ids              = concat(module.vpc.private_subnet_ids, module.vpc.public_subnet_ids)
    endpoint_public_access  = true
    endpoint_private_access = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  version = var.k8s_version
}

# EKS Managed Node Group (EC2)
resource "aws_eks_node_group" "eks_nodes" {
  cluster_name    = aws_eks_cluster.eks_cluster.name
  node_group_name = "ec2-workers"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = concat(module.vpc.private_subnet_ids, module.vpc.public_subnet_ids)

  scaling_config {
    desired_size = var.node_desired_capacity
    max_size     = var.node_desired_capacity + 1
    min_size     = 1
  }

  instance_types = [var.node_instance_type]
  ami_type       = "AL2_x86_64"
  capacity_type  = "ON_DEMAND"
}

# EKS Fargate Profile
resource "aws_eks_fargate_profile" "fargate_profile" {
  cluster_name           = aws_eks_cluster.eks_cluster.name
  fargate_profile_name   = "fargate-profile"
  pod_execution_role_arn = aws_iam_role.fargate_pod_role.arn
  subnet_ids             = module.vpc.private_subnet_ids

  selector {
    namespace = var.fargate_namespace
  }
}








