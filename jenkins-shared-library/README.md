# Jenkins Shared Library for WebChat Microservices

## Correct Shared Library Approach

### Common Functions in `vars/`
- `buildService.groovy` - Main pipeline orchestrator
- `buildAndTest.groovy` - Technology-specific build & test logic
- `runSonarAnalysis.groovy` - SonarQube analysis
- `buildDockerImage.groovy` - Docker image building
- `pushToDockerHub.groovy` - Docker Hub publishing
- `pushToECR.groovy` - AWS ECR publishing
- `cleanup.groovy` - Post-build cleanup

### Individual Jenkinsfiles per Service
Each service has its own `Jenkinsfile` that calls the shared functions with service-specific configuration.

## Technology Stack Support

- **Java/Maven**: `techStack: 'java'`
- **Node.js**: `techStack: 'nodejs'`
- **Go**: `techStack: 'go'`
- **Python**: `techStack: 'python'`

## Usage Example

```groovy
@Library('webchat-shared-library') _

buildService([
    serviceName: 'user-service',
    servicePath: 'microservice-web-chat/user-service',
    techStack: 'java',
    imageTag: 'user-v1.0.0',
    dockerRepo: 'deepaksag/webchat-app',
    ecrRepoName: 'webchat-app/user-service',
    ecrAccountId: '286549082566',
    awsRegion: 'us-east-1',
    gitUrl: 'https://github.com/Coding4Deep/project-01.git',
    gitBranch: 'spring',
    enableSonar: true,
    pushToDockerHub: true,
    pushToECR: true
])
```

## Configuration Parameters

### Required
- `serviceName` - Name of the service
- `servicePath` - Path to service directory
- `techStack` - Technology stack (java/nodejs/go/python)
- `imageTag` - Docker image tag
- `dockerRepo` - Docker Hub repository
- `ecrRepoName` - ECR repository name
- `ecrAccountId` - AWS account ID
- `awsRegion` - AWS region
- `gitUrl` - Git repository URL
- `gitBranch` - Git branch

### Optional
- `nodeVersion` - Node.js version (for nodejs stack)
- `goVersion` - Go version (for go stack)
- `runTests` - Enable test execution (default: false)
- `buildApp` - Enable app building (for nodejs)
- `enableSonar` - Enable SonarQube analysis (default: false)
- `pushToDockerHub` - Enable Docker Hub push (default: false)
- `pushToECR` - Enable ECR push (default: false)

## Benefits

✅ **Reusable**: Common functions shared across all services
✅ **Maintainable**: Single place to update pipeline logic
✅ **Flexible**: Each service can customize its configuration
✅ **Technology Agnostic**: Supports multiple tech stacks
✅ **Scalable**: Easy to add new services or modify existing ones
