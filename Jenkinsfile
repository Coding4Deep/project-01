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
        stage('installing jenkins server') {
            steps {
                sh 'ansible-playbook  playbooks/nexus_sonar.yaml --tags hostname'
            }
        }

          stage('Check & Install SonarQube') {
            steps {
                script {
                    // Fetch public IP (ansible_host) from dynamic inventory
                    def public_ip = sh(
                        script: "ansible-inventory -i inventory/aws_ec2.yaml --host ec2-52-54-212-61.compute-1.amazonaws.com | jq -r .ansible_host",
                        returnStdout: true
                    ).trim()
                
                    echo "Detected SonarQube public IP: ${public_ip}"
                
                    def SONAR_HOST_URL = "http://${public_ip}:9000"
                    echo "Checking SonarQube at: ${SONAR_HOST_URL}"
                
                    // def statusCode = sh(
                    //     script: "curl -o /dev/null -s -w '%{http_code}' ${SONAR_HOST_URL}",
                    //     returnStdout: true
                    // ).trim()
                
                    // if (statusCode != "200") {
                    //     echo "SonarQube not available. Installing..."
                    //     sh 'ansible-playbook playbooks/nexus_sonar.yaml --tags sonar_nexus_install --skip-tags nexus_install'
                    // } else {
                    //     echo "SonarQube is already up and reachable."
                    // }
                }
            }
        }
        
        
        // stage('changing jenkins server hostname') {
        //     steps {
        //         sh 'ansible-playbook  playbooks/nexus_sonar.yaml --tags sonar_nexus_install --skip-tags sonar_install'
        //     }
        // }

    }
}






