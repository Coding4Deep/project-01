def call(Map config) {
    pipeline {
        agent any

        environment {
            ECR_REPO = "${config.ecrAccountId}.dkr.ecr.${config.awsRegion}.amazonaws.com/${config.ecrRepoName}"
            DOCKER_REPO = config.dockerRepo
            IMAGE_NAME = config.serviceName
            IMAGE_TAG = config.imageTag
            AWS_ACCESS_KEY_ID = credentials('awscreds')
            AWS_SECRET_ACCESS_KEY = credentials('awscreds')
            AWS_REGION = config.awsRegion
            SERVICE_PATH = config.servicePath
        }

        stages {
            stage('Check Python') {
                steps {
                    sh 'python3 --version'
                    sh 'pip3 --version'
                }
            }

            stage('Checkout') {
                steps {
                    git branch: config.gitBranch, url: config.gitUrl
                }
            }

            stage('Install Dependencies') {
                steps {
                    dir("${SERVICE_PATH}") {
                        sh '''
                            python3 -m venv venv
                            . venv/bin/activate
                            pip install -r requirements.txt
                        '''
                    }
                }
            }

            stage('Run Tests') {
                when {
                    expression { config.runTests == true }
                }
                steps {
                    dir("${SERVICE_PATH}") {
                        sh '''
                            . venv/bin/activate
                            pip install pytest-cov
                            python -m pytest test_main.py -v --cov=. --cov-report=xml --cov-report=html
                        '''
                    }
                }
                post {
                    always {
                        dir("${SERVICE_PATH}") {
                            publishTestResults testResultsPattern: 'test-results.xml'
                            publishCoverage adapters: [coberturaAdapter('coverage.xml')], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                            archiveArtifacts artifacts: 'htmlcov/*', allowEmptyArchive: true
                        }
                    }
                }
            }

            stage('SonarQube Analysis') {
                when {
                    expression { config.enableSonar == true }
                }
                steps {
                    dir("${SERVICE_PATH}") {
                        withSonarQubeEnv('MySonarQube') {
                            sh "sonar-scanner"
                        }
                    }
                }
            }

            stage('Build Docker Image') {
                steps {
                    dir("${SERVICE_PATH}") {
                        echo "Building Docker image..."
                        sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
                    }
                }
            }

            stage('Push to Docker Hub') {
                when {
                    expression { config.pushToDockerHub == true }
                }
                steps {
                    dir("${SERVICE_PATH}") {
                        withCredentials([
                            usernamePassword(
                                credentialsId: 'docker-hub-credentials', 
                                usernameVariable: 'DOCKERHUB_USERNAME', 
                                passwordVariable: 'DOCKERHUB_PASSWORD'
                            )
                        ]) {
                            sh """
                                echo \$DOCKERHUB_PASSWORD | docker login -u \$DOCKERHUB_USERNAME --password-stdin
                                docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${DOCKER_REPO}:${IMAGE_TAG}
                                docker push ${DOCKER_REPO}:${IMAGE_TAG}
                            """
                        }
                    }
                }
            }

            stage('Push to AWS ECR') {
                when {
                    expression { config.pushToECR == true }
                }
                steps {
                    dir("${SERVICE_PATH}") {
                        withAWS(credentials: 'awscreds', region: "${AWS_REGION}") {
                            sh """
                                aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${config.ecrAccountId}.dkr.ecr.${AWS_REGION}.amazonaws.com
                                docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ECR_REPO}:${IMAGE_TAG}
                                docker push ${ECR_REPO}:${IMAGE_TAG}
                            """
                        }
                    }
                }
            }
        }

        post {
            always {
                dir("${SERVICE_PATH}") {
                    echo "Cleaning up Docker images..."
                    sh "docker image prune -af || true"
                }
            }
        }
    }
}
