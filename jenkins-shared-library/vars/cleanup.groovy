def call(Map config) {
    dir("${config.servicePath}") {
        echo "Cleaning up Docker images for ${config.serviceName}..."
        sh "docker image prune -af || true"
        
        // Tech stack specific cleanup
        switch(config.techStack) {
            case 'python':
                sh "rm -rf venv || true"
                break
            case 'nodejs':
                sh "rm -rf node_modules/.cache || true"
                break
        }
    }
}
