pipeline {
    agent any

    parameters {
       string(name: 'TF_WORKSPACE', defaultValue: 'dev', description: 'Terraform workspace to use')
    }

    environment {
        AWS_ACCESS_KEY_ID = credentials('awscreds')
        AWS_SECRET_ACCESS_KEY = credentials('awscreds')
    }

    // triggers {
    //    githubPush()
    // }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'terraform', url: 'https://github.com/Coding4Deep/project-01.git'
            }
        }

        stage('Terraform Init') {
            steps {
                sh 'terraform init'
            }
        }

        stage('Check or Create Terraform Workspace') { 
            steps {
                script {
                    def workspaceName = params.TF_WORKSPACE
        
                    // List existing workspaces
                    def output = sh(
                        script: "unset TF_WORKSPACE && terraform workspace list -no-color",
                        returnStdout: true
                    ).trim().split("\n") // Split output into lines
        
                    // Remove any '*' from current workspace and trim spaces
                    def workspaces = output.collect { it.replace('*', '').trim() }
        
                    if (workspaces.contains(workspaceName)) {
                        echo "Workspace '${workspaceName}' exists. Selecting..."
                        sh "unset TF_WORKSPACE && terraform workspace select ${workspaceName}"
                    } else {
                        echo "Workspace '${workspaceName}' not found. Creating..."
                        sh "unset TF_WORKSPACE && terraform workspace new ${workspaceName}"
                    }
                }
            }
        }

        stage('plan'){
            steps{
                sh '''

                   terraform apply --auto-approve
                '''
            }
        }
    }
}
