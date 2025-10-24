def call(Map config) {
    echo "Building Docker image for ${config.serviceName}..."
    sh "docker build -t ${config.serviceName}:${config.imageTag} ."
}
