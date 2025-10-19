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
                git branch: 'ansible', url: 'https://github.com/Coding4Deep/project-01.git'
            }
        }
        stage('Check dynamic inventory') { 
            steps {
                sh '''
                   ansible-inventory --graph
                   ansible all -m ping
                ''' 
            }
        }
    }
}
