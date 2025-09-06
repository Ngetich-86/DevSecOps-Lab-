pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'devsecops-taskmanager-app'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        REGISTRY = 'your-registry.com'
        APP_NAME = 'taskmanager-api'
        NODE_VERSION = '20'
        PNPM_VERSION = '10.8.0'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '🔄 Checking out source code...'
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.GIT_BRANCH = sh(
                        script: 'git rev-parse --abbrev-ref HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Environment Setup') {
            steps {
                echo '🔧 Setting up environment...'
                script {
                    // Clean workspace
                    sh 'rm -rf node_modules dist build'
                    
                    // Setup Node.js and pnpm
                    sh '''
                        curl -fsSL https://get.pnpm.io/install.sh | sh -
                        export PNPM_HOME="$HOME/.local/share/pnpm"
                        export PATH="$PNPM_HOME:$PATH"
                        pnpm --version
                        node --version
                    '''
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo '📦 Installing dependencies...'
                sh '''
                    export PNPM_HOME="$HOME/.local/share/pnpm"
                    export PATH="$PNPM_HOME:$PATH"
                    pnpm install --frozen-lockfile
                '''
            }
        }
        
        stage('Code Quality') {
            parallel {
                stage('Linting') {
                    steps {
                        echo '🔍 Running ESLint...'
                        sh '''
                            export PNPM_HOME="$HOME/.local/share/pnpm"
                            export PATH="$PNPM_HOME:$PATH"
                            pnpm run lint
                        '''
                    }
                    post {
                        always {
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'eslint-report',
                                reportFiles: 'index.html',
                                reportName: 'ESLint Report'
                            ])
                        }
                    }
                }
                
                stage('Type Checking') {
                    steps {
                        echo '🔍 Running TypeScript type checking...'
                        sh '''
                            export PNPM_HOME="$HOME/.local/share/pnpm"
                            export PATH="$PNPM_HOME:$PATH"
                            npx tsc --noEmit
                        '''
                    }
                }
            }
        }
        
        stage('Testing') {
            steps {
                echo '🧪 Running tests...'
                sh '''
                    export PNPM_HOME="$HOME/.local/share/pnpm"
                    export PATH="$PNPM_HOME:$PATH"
                    pnpm run test --coverage
                '''
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                    publishCoverage adapters: [
                        jacocoAdapter('coverage/lcov.info')
                    ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                echo '🔒 Running security scans...'
                script {
                    // Run npm audit
                    sh '''
                        export PNPM_HOME="$HOME/.local/share/pnpm"
                        export PATH="$PNPM_HOME:$PATH"
                        pnpm audit --audit-level moderate
                    '''
                    
                    // Run Snyk security scan (if available)
                    sh '''
                        if command -v snyk &> /dev/null; then
                            snyk test --severity-threshold=high
                        else
                            echo "Snyk not available, skipping security scan"
                        fi
                    '''
                }
            }
        }
        
        stage('Build Application') {
            steps {
                echo '🏗️ Building application...'
                sh '''
                    export PNPM_HOME="$HOME/.local/share/pnpm"
                    export PATH="$PNPM_HOME:$PATH"
                    pnpm run build
                '''
            }
            post {
                success {
                    archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                echo '🐳 Building Docker image...'
                script {
                    def image = docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                    docker.withRegistry("https://${REGISTRY}", 'docker-registry-credentials') {
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }
        
        stage('Docker Security Scan') {
            steps {
                echo '🔒 Scanning Docker image for vulnerabilities...'
                script {
                    sh '''
                        if command -v trivy &> /dev/null; then
                            trivy image --severity HIGH,CRITICAL ${DOCKER_IMAGE}:${DOCKER_TAG}
                        else
                            echo "Trivy not available, skipping Docker security scan"
                        fi
                    '''
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                echo '🚀 Deploying to staging environment...'
                script {
                    sh '''
                        # Update docker-compose for staging
                        export DOCKER_IMAGE_TAG=${DOCKER_IMAGE}:${DOCKER_TAG}
                        envsubst < docker-compose.staging.yml > docker-compose.staging.override.yml
                        
                        # Deploy to staging
                        docker-compose -f docker-compose.yml -f docker-compose.staging.override.yml up -d
                    '''
                }
            }
        }
        
        stage('Integration Tests') {
            when {
                branch 'develop'
            }
            steps {
                echo '🧪 Running integration tests...'
                sh '''
                    # Wait for services to be ready
                    sleep 30
                    
                    # Run integration tests
                    export PNPM_HOME="$HOME/.local/share/pnpm"
                    export PATH="$PNPM_HOME:$PATH"
                    pnpm run test:integration
                '''
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying to production environment...'
                script {
                    // Manual approval for production deployment
                    input message: 'Deploy to production?', ok: 'Deploy'
                    
                    sh '''
                        # Update docker-compose for production
                        export DOCKER_IMAGE_TAG=${DOCKER_IMAGE}:${DOCKER_TAG}
                        envsubst < docker-compose.prod.yml > docker-compose.prod.override.yml
                        
                        # Deploy to production
                        docker-compose -f docker-compose.yml -f docker-compose.prod.override.yml up -d
                    '''
                }
            }
        }
    }
    
    post {
        always {
            echo '🧹 Cleaning up workspace...'
            cleanWs()
        }
        
        success {
            echo '✅ Pipeline completed successfully!'
            script {
                // Send success notification
                sh '''
                    curl -X POST -H 'Content-type: application/json' \
                    --data '{"text":"✅ TaskManager Pipeline #'${BUILD_NUMBER}' completed successfully!"}' \
                    ${SLACK_WEBHOOK_URL}
                '''
            }
        }
        
        failure {
            echo '❌ Pipeline failed!'
            script {
                // Send failure notification
                sh '''
                    curl -X POST -H 'Content-type: application/json' \
                    --data '{"text":"❌ TaskManager Pipeline #'${BUILD_NUMBER}' failed! Check: '${BUILD_URL}'"}' \
                    ${SLACK_WEBHOOK_URL}
                '''
            }
        }
        
        unstable {
            echo '⚠️ Pipeline completed with warnings!'
        }
    }
}
