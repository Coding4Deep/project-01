variable "ec2_instances" {
  description = "Map of EC2 instance configurations"
  type = map(object({
    ami           = string
    instance_type = string
    subnet_id     = string
  }))
}
