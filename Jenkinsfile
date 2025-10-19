pipeline {
    agent any
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
        stage('changing jenkins server hostname') {
            steps {
                sh 'ansible-playbook  playbooks/jenkins.yaml --tags jen-hostname'
            }
        }
        stage('installing jenkins server') {
            steps {
                sh 'ansible-playbook  playbooks/jenkins.yaml --tags jenkins_setup'
            }
        }
    }
}

