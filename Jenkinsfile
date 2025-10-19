pipeline {
    agent any
    environment {
        AWS_ACCESS_KEY_ID = credentials('awscreds')
        AWS_SECRET_ACCESS_KEY = credentials('awscreds')
        SONAR_HOST_URL = 'http://34.207.227.231:9000/'
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
        stage('installing jenkins server') {
            steps {
                sh 'ansible-playbook  playbooks/nexus_sonar.yaml --tags hostname'
            }
        }
        stage('Check & Install SonarQube') {
            steps {
                script {
                    try {
                        def statusCode = sh(
                            script: 'curl -o /dev/null -s -w "%{http_code}\\n" ${SONAR_HOST_URL}',
                            returnStdout: true
                        ).trim()
        
                        if (statusCode != "200") {
                            echo "SonarQube not available. Installing..."
                            sh 'ansible-playbook playbooks/nexus_sonar.yaml --tags sonar_nexus_install --skip-tags nexus_install'
                        } else {
                            echo "SonarQube is already up."
                        }
                    } catch (err) {
                        echo "Error reaching SonarQube. Proceeding with installation..."
                        sh 'ansible-playbook playbooks/nexus_sonar.yaml --tags sonar_nexus_install --skip-tags nexus_install'
                    }
                }
            }
        }
        
        stage('changing jenkins server hostname') {
            steps {
                sh 'ansible-playbook  playbooks/nexus_sonar.yaml --tags sonar_nexus_install --skip-tags sonar_install'
            }
        }

    }
}

