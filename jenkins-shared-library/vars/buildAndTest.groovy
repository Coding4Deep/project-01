def call(Map config) {
    switch(config.techStack) {
        case 'java':
            sh 'mvn clean test jacoco:report'
            publishTestResults testResultsPattern: 'target/surefire-reports/*.xml'
            publishCoverage adapters: [jacocoAdapter('target/site/jacoco/jacoco.xml')], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
            break
            
        case 'nodejs':
            sh 'npm install'
            if (config.runTests) {
                sh 'npm test -- --coverage --watchAll=false'
                publishTestResults testResultsPattern: 'test-results.xml'
                publishCoverage adapters: [istanbulCoberturaAdapter('coverage/cobertura-coverage.xml')], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
            }
            if (config.buildApp) {
                sh 'npm run build'
            }
            break
            
        case 'go':
            sh 'go mod download'
            sh 'go test -v -coverprofile=coverage.out ./...'
            sh 'go tool cover -html=coverage.out -o coverage.html'
            sh 'go build -o main .'
            archiveArtifacts artifacts: 'coverage.html', allowEmptyArchive: true
            break
            
        case 'python':
            sh '''
                python3 -m venv venv
                . venv/bin/activate
                pip install -r requirements.txt
            '''
            if (config.runTests) {
                sh '''
                    . venv/bin/activate
                    pip install pytest-cov
                    python -m pytest test_main.py -v --cov=. --cov-report=xml --cov-report=html
                '''
                publishCoverage adapters: [coberturaAdapter('coverage.xml')], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
            }
            break
            
        default:
            error "Unsupported tech stack: ${config.techStack}"
    }
}
