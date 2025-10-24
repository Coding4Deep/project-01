def call(Map config) {
    withCredentials([
        usernamePassword(
            credentialsId: 'docker-hub-credentials', 
            usernameVariable: 'DOCKERHUB_USERNAME', 
            passwordVariable: 'DOCKERHUB_PASSWORD'
        )
    ]) {
        sh """
            echo \$DOCKERHUB_PASSWORD | docker login -u \$DOCKERHUB_USERNAME --password-stdin
            docker tag ${config.serviceName}:${config.imageTag} ${config.dockerRepo}:${config.imageTag}
            docker push ${config.dockerRepo}:${config.imageTag}
        """
    }
}
