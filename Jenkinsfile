pipeline {
    agent any

    parameters {
       string(name: 'TF_WORKSPACE', defaultValue: 'dev', description: 'Terraform workspace to use')
    }

    environment {
        AWS_ACCESS_KEY_ID = credentials('awscreds')
        AWS_SECRET_ACCESS_KEY = credentials('awscreds')
    }

    triggers {
       githubPush()
    }

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
                    sh """
                        unset TF_WORKSPACE
                        if terraform workspace list | grep -q ${workspaceName}; then
                            echo " Workspace '${workspaceName}' exists. Selecting..."
                            terraform workspace select ${workspaceName}
                        else
                            echo " Workspace '${workspaceName}' not found. Creating..."
                            terraform workspace new ${workspaceName}
                        fi
                    """
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
