## 1️⃣ What is OpenID Connect (OIDC)?

* **OIDC** is an **authentication protocol** built on **OAuth 2.0**.
* It allows **applications (clients) to verify the identity of users or services** based on authentication performed by an external **identity provider (IdP)**.
* In simpler terms:

> “OIDC tells Kubernetes ‘this AWS IAM role or identity is allowed to act as a user’ without needing static credentials.”

* Key elements:

  * **Issuer URL** → identity provider endpoint
  * **Client ID** → who is allowed to request tokens
  * **ID Token** → short-lived token proving identity

---

## 2️⃣ Why do we need OIDC in EKS?

* By default, **Kubernetes RBAC uses certificates**.
* AWS EKS integrates **IAM with Kubernetes** using **OIDC**, so IAM roles can **assume permissions in Kubernetes**.
* This allows **IAM Roles for Service Accounts (IRSA)**:

  * Each Kubernetes Service Account can **get AWS permissions** via an IAM role.
  * Pods don’t need to use EC2 instance roles or long-lived credentials.

Example:

* Pod with Service Account `myapp-sa` → can assume `IAM role: myapp-role` → can access S3, DynamoDB, etc.
* Authentication is done **via the OIDC provider**, so AWS knows the pod is allowed.

---

## 3️⃣ How AWS EKS sets it up

When you enable **OIDC for your cluster**, AWS:

1. Creates an **OIDC identity provider** for your cluster.

   * Example URL: `https://oidc.eks.us-east-1.amazonaws.com/id/<cluster-id>`
2. Associates it with your cluster in IAM.
3. You can then create **IAM roles** with a **trust policy** that allows this OIDC provider to assume the role **for specific Kubernetes service accounts**.

---

### 4️⃣ Terraform Example: Create OIDC Provider

```hcl
resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["9e99a48a9960b14926bb7f3b02e22da0afd1a8a7"]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}
```

* `url` → the OIDC issuer URL for your cluster
* `client_id_list` → who can request tokens (usually `sts.amazonaws.com`)
* `thumbprint_list` → certificate thumbprint for secure TLS connection

---

### 5️⃣ IAM Role Trust Policy for IRSA

Once OIDC is configured, you can create an IAM role like:

```hcl
resource "aws_iam_role" "myapp_role" {
  name = "myapp-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "oidc.eks.us-east-1.amazonaws.com/id/<cluster-id>:sub" = "system:serviceaccount:default:myapp-sa"
        }
      }
    }]
  })
}
```

* This says:

  > “Any pod using the service account `myapp-sa` in `default` namespace can assume this IAM role via OIDC.”

---

## 6️⃣ Why OIDC + IRSA is Important

1. **No need for static AWS credentials in pods**
2. **Fine-grained permissions per pod/service account**
3. **Secure & short-lived credentials**
4. **Kubernetes-native authentication integrated with AWS IAM**

---

✅ **Key Summary**

| Term          | Meaning                                                             |
| ------------- | ------------------------------------------------------------------- |
| OIDC          | OpenID Connect — protocol for identity/authentication               |
| OIDC Provider | AWS resource connecting EKS cluster to OIDC for IRSA                |
| IRSA          | IAM Roles for Service Accounts — pods can assume IAM roles securely |
| Benefit       | Secure, per-pod AWS access without long-lived secrets               |

---



## 1️⃣ What is a Pod Identity Association?

A **Pod Identity Association** is essentially a **link between a Kubernetes pod (via a service account) and an IAM role in AWS**.

* **Purpose:** It allows a **pod to assume an IAM role** securely using **short-lived credentials** provided by AWS.
* This avoids giving the pod static AWS credentials (like access keys).
* Works **only when your EKS cluster has an OIDC provider enabled**.

---

## 2️⃣ How it works

1. You create an **IAM role** with a trust policy pointing to the **EKS OIDC provider**.
2. You create a **Kubernetes Service Account**.
3. You associate the Service Account with the IAM Role.

Now:

* Any pod using that service account automatically **assumes the IAM role**.
* Kubernetes does not need to manage AWS credentials manually.

---

### Example Workflow

#### Step 1: Enable OIDC Provider for EKS

```hcl
resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["9e99a48a9960b14926bb7f3b02e22da0afd1a8a7"]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}
```

#### Step 2: Create IAM Role for Pod

```hcl
resource "aws_iam_role" "pod_role" {
  name = "myapp-pod-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "oidc.eks.<region>.amazonaws.com/id/<cluster-id>:sub" = "system:serviceaccount:default:myapp-sa"
        }
      }
    }]
  })
}
```

#### Step 3: Create Service Account and Associate

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/myapp-pod-role
```

✅ That annotation is the **Pod Identity Association** — it tells EKS:

> “Pods using this service account can assume this IAM role.”

---

## 3️⃣ Why Pod Identity Associations are Important

* Fine-grained access: each pod gets only the permissions it needs.
* No long-lived AWS credentials in pods.
* Secure & scalable: works for thousands of pods.
* Works seamlessly with Kubernetes RBAC and AWS IAM.

---

### 4️⃣ Diagram of Flow

```
Pod -> Service Account (myapp-sa) -> OIDC Provider -> IAM Role -> AWS Resources
```

* Pod uses the service account.
* AWS verifies the pod’s identity via OIDC.
* Pod gets temporary credentials for the IAM role.
* Pod can access S3, DynamoDB, etc., **securely**.

---

In short:

> **Pod Identity Association = the link between a pod (via a service account) and an IAM role, allowing the pod to securely access AWS resources without static credentials.**

---


## 1️⃣ What is IRSA?

**IRSA** stands for **IAM Roles for Service Accounts**.

* It’s an **AWS EKS feature** that allows **Kubernetes pods to assume AWS IAM roles** securely.
* Instead of giving pods **static AWS credentials**, IRSA provides **short-lived credentials automatically**.
* This is tightly integrated with **OIDC identity provider** in your EKS cluster.

---

## 2️⃣ Why IRSA is needed

By default, pods running on EC2 nodes can use the **instance role** attached to the node.

Problems with that approach:

1. All pods share the **same IAM permissions** — not secure.
2. Hard to enforce **least privilege** per application.

**IRSA solves this:**

* Each pod (via a service account) can assume **its own IAM role**.
* Provides **fine-grained, per-pod permissions**.
* Credentials are **short-lived and rotated automatically** by AWS.

---

## 3️⃣ How IRSA Works

1. **Enable OIDC Provider** for your EKS cluster.
2. **Create an IAM role** with a trust policy pointing to the OIDC provider.
3. **Annotate a Kubernetes Service Account** with the IAM role ARN.
4. Pods using that service account **automatically get temporary AWS credentials**.

**Flow Diagram:**

```
Pod -> Service Account -> OIDC Provider -> IAM Role -> AWS Resources
```

* Pod uses the service account.
* AWS verifies the pod via OIDC.
* Pod assumes the IAM role.
* Pod can now access S3, DynamoDB, etc.

---

## 4️⃣ Example Terraform + Kubernetes Setup

### IAM Role

```hcl
resource "aws_iam_role" "myapp_role" {
  name = "myapp-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "oidc.eks.<region>.amazonaws.com/id/<cluster-id>:sub" = "system:serviceaccount:default:myapp-sa"
        }
      }
    }]
  })
}
```

### Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/myapp-role
```

---

## 5️⃣ Benefits of IRSA

| Feature                  | Benefit                           |
| ------------------------ | --------------------------------- |
| Fine-grained permissions | Each pod only has access it needs |
| Short-lived credentials  | No static AWS keys in pods        |
| Secure                   | IAM + Kubernetes RBAC combined    |
| Scalable                 | Works for thousands of pods       |

---

✅ **Key Takeaway:**

> **IRSA = a way for Kubernetes pods to securely assume IAM roles using OIDC, giving them temporary AWS credentials without using static keys.**

---

