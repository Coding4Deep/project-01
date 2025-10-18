pipeline {
    agent {
        label 'wsl-local' 
    }

    parameters {
       string(name: 'TF_WORKSPACE', defaultValue: 'dev', description: 'Terraform workspace to use')
    }
 
    triggers {
       githubPush()
    }

    stages {
        stage('checkout') {
            steps {
                git branch: 'terraform', url: 'git@github.com:Coding4Deep/project-01.git'
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
                    def existingWorkspaces = sh(script: "terraform workspace list", returnStdout: true).trim()
        
                    if (existingWorkspaces.contains(workspaceName)) {
                        echo "Workspace '${workspaceName}' exists. Selecting..."
                        sh "terraform workspace select ${workspaceName}"
                    } else {
                        echo "Workspace '${workspaceName}' not found. Creating..."
                        sh "terraform workspace new ${workspaceName}"
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying...'
            }
        }
    }
}