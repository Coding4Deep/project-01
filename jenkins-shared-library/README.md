# Jenkins Shared Library for WebChat Microservices

## Technology Stack Mapping

- **user-service**: Java/Maven → `buildMicroservice`
- **chat-service**: Node.js → `buildNodeService`
- **posts-service**: Go → `buildGoService`
- **profile-service**: Python → `buildPythonService`
- **monitoring-service**: Java/Maven → `buildMicroservice`
- **frontend**: React/Node.js → `buildFrontend`

## Setup

1. In Jenkins, go to **Manage Jenkins** → **Configure System**
2. Under **Global Pipeline Libraries**, add:
   - **Name**: `webchat-shared-library`
   - **Default version**: `main`
   - **Retrieval method**: Modern SCM
   - **Source Code Management**: Git
   - **Repository URL**: `https://github.com/Coding4Deep/project-01.git`
   - **Library Path**: `jenkins-shared-library`

## Available Functions

### `buildMicroservice` - Java/Maven Services
```groovy
@Library('webchat-shared-library') _

buildMicroservice([
    serviceName: 'user-service',
    servicePath: 'microservice-web-chat/user-service',
    imageTag: 'user-v1.0.0',
    // ... other config
])
```

### `buildNodeService` - Node.js Services
```groovy
@Library('webchat-shared-library') _

buildNodeService([
    serviceName: 'chat-service',
    servicePath: 'microservice-web-chat/chat-service',
    nodeVersion: 'NodeJS-18',
    runTests: false,
    // ... other config
])
```

### `buildGoService` - Go Services
```groovy
@Library('webchat-shared-library') _

buildGoService([
    serviceName: 'posts-service',
    servicePath: 'microservice-web-chat/posts-service',
    goVersion: 'Go-1.21',
    // ... other config
])
```

### `buildPythonService` - Python Services
```groovy
@Library('webchat-shared-library') _

buildPythonService([
    serviceName: 'profile-service',
    servicePath: 'microservice-web-chat/profile-service',
    runTests: true,
    // ... other config
])
```

### `buildFrontend` - React/Node.js Frontend
```groovy
@Library('webchat-shared-library') _

buildFrontend([
    serviceName: 'frontend',
    servicePath: 'microservice-web-chat/frontend',
    nodeVersion: 'NodeJS-18',
    runTests: false,
    // ... other config
])
```
