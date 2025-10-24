def call(Map config) {
    withAWS(credentials: 'awscreds', region: "${config.awsRegion}") {
        sh """
            aws ecr get-login-password --region ${config.awsRegion} | docker login --username AWS --password-stdin ${config.ecrAccountId}.dkr.ecr.${config.awsRegion}.amazonaws.com
            docker tag ${config.serviceName}:${config.imageTag} ${config.ecrAccountId}.dkr.ecr.${config.awsRegion}.amazonaws.com/${config.ecrRepoName}:${config.imageTag}
            docker push ${config.ecrAccountId}.dkr.ecr.${config.awsRegion}.amazonaws.com/${config.ecrRepoName}:${config.imageTag}
        """
    }
}
