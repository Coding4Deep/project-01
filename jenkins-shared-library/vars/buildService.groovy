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

        tools {
            maven config.techStack == 'java' ? 'Maven3.9.11' : null
            nodejs config.techStack == 'nodejs' ? config.nodeVersion : null
            go config.techStack == 'go' ? config.goVersion : null
        }

        stages {
            stage('Checkout') {
                steps {
                    git branch: config.gitBranch, url: config.gitUrl
                }
            }

            stage('Build & Test') {
                steps {
                    dir("${SERVICE_PATH}") {
                        script {
                            buildAndTest(config)
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
                        script {
                            runSonarAnalysis(config)
                        }
                    }
                }
            }

            stage('Build Docker Image') {
                steps {
                    dir("${SERVICE_PATH}") {
                        script {
                            buildDockerImage(config)
                        }
                    }
                }
            }

            stage('Push to Registries') {
                parallel {
                    stage('Push to Docker Hub') {
                        when {
                            expression { config.pushToDockerHub == true }
                        }
                        steps {
                            dir("${SERVICE_PATH}") {
                                script {
                                    pushToDockerHub(config)
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
                                script {
                                    pushToECR(config)
                                }
                            }
                        }
                    }
                }
            }
        }

        post {
            always {
                script {
                    cleanup(config)
                }
            }
        }
    }
}
