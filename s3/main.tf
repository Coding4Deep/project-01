# resource "aws_s3_bucket" "terraform-state-bucket" {
#   bucket = "terraform-state-bucket-unique-123456"
#   tags = {
#     Name        = "terraform-state-bucket"
#     Environment = "Dev"
#   }
# }

# resource "aws_s3_bucket_ownership_controls" "terraform_state_bucket_ownership" {
#   bucket = aws_s3_bucket.terraform-state-bucket.id

#   rule {
#     object_ownership = "BucketOwnerEnforced"
#   }
# }

# resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state_bucket_sse" {
#   bucket = aws_s3_bucket.terraform-state-bucket.id

#   rule {
#     apply_server_side_encryption_by_default {
#       sse_algorithm = "AES256"
#     }
#   }
# }

# resource "aws_s3_bucket_versioning" "terraform_state_bucket_versioning" {
#   bucket = aws_s3_bucket.terraform-state-bucket.id

#   versioning_configuration {
#     status = "Enabled"
#   }
# }



# resource "aws_dynamodb_table" "terraform-lock-table" {
#   name         = "terraform-lock-table"
#   billing_mode = "PAY_PER_REQUEST"
#   hash_key     = "LockID"

#   attribute {
#     name = "LockID"
#     type = "S"
#   }

#   tags = {
#     Name        = "terraform-lock-table"
#     Environment = "Dev"
#   }
# }

