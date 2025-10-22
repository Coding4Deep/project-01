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
                    // 🔹 Fetch EC2 Public IP dynamically using Ansible metadata
                    def sonar_ip = sh(
                        script: "ansible  all -m shell -a 'curl -s http://169.254.169.254/latest/meta-data/public-ipv4' | grep -oE '\\b([0-9]{1,3}\\.){3}[0-9]{1,3}\\b' | head -n1",
                        returnStdout: true
                    ).trim()
        
                    echo "Detected SonarQube public IP: ${sonar_ip}"
        
                    // // 🔹 Construct the Sonar URL
                    // def SONAR_HOST_URL = "http://${sonar_ip}:9000"
        
                    // // 🔹 Check if SonarQube is reachable
                    // def statusCode = sh(
                    //     script: "curl -o /dev/null -s -w '%{http_code}' ${SONAR_HOST_URL}",
                    //     returnStdout: true
                    // ).trim()
        
                    // echo "SonarQube HTTP Status: ${statusCode}"
        
                    // // 🔹 Conditional logic
                    // if (statusCode != "200") {
                    //     echo "SonarQube not available. Installing..."
                    //     sh "ansible-playbook playbooks/nexus_sonar.yaml --tags sonar_nexus_install --skip-tags nexus_install"
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

