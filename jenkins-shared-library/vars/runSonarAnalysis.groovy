def call(Map config) {
    withSonarQubeEnv('MySonarQube') {
        switch(config.techStack) {
            case 'java':
                sh "mvn sonar:sonar"
                break
            case 'nodejs':
                sh "npm run sonar || sonar-scanner"
                break
            case 'go':
            case 'python':
                sh "sonar-scanner"
                break
            default:
                sh "sonar-scanner"
        }
    }
}
