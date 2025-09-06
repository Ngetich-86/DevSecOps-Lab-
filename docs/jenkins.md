# Jenkins CI/CD Setup Guide

This guide provides comprehensive documentation for Jenkins CI/CD setup in the DevSecOps TaskManager project.

## Table of Contents
- [Overview](#overview)
- [Jenkins Configuration](#jenkins-configuration)
- [Pipeline Overview](#pipeline-overview)
- [Environment Setup](#environment-setup)
- [Usage](#usage)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

This project uses Jenkins for continuous integration and continuous deployment (CI/CD) with Docker containerization. The setup includes:

- **Jenkins LTS**: Latest stable version with essential plugins
- **Docker Integration**: Full Docker support for building and deploying
- **Multi-stage Pipeline**: Comprehensive CI/CD pipeline with testing, security scanning, and deployment
- **Environment Management**: Separate configurations for staging and production
- **Monitoring Integration**: Works with Prometheus and Grafana

### Key Features
- Automated testing and linting
- Security vulnerability scanning
- Docker image building and scanning
- Multi-environment deployment
- Integration with monitoring stack
- Slack notifications

## Jenkins Configuration

### Docker Compose Setup

Jenkins is configured in `docker-compose.yml`:

```yaml
jenkins:
  image: jenkins/jenkins:2.463.3-lts
  container_name: taskmanager-jenkins
  ports:
    - "8080:8080"
    - "50000:50000"
  environment:
    JENKINS_OPTS: "--httpPort=8080"
    JAVA_OPTS: "-Djenkins.install.runSetupWizard=false"
    JENKINS_ADMIN_ID: admin
    JENKINS_ADMIN_PASSWORD: admin
  volumes:
    - jenkins_data:/var/jenkins_home
    - /var/run/docker.sock:/var/run/docker.sock
    - /usr/bin/docker:/usr/bin/docker
    - ./jenkins/plugins.txt:/usr/share/jenkins/ref/plugins.txt
    - ./jenkins/jenkins.yaml:/var/jenkins_home/casc_configs/jenkins.yaml
  user: root
  networks:
    - app-network
  restart: unless-stopped
```

### Configuration as Code

Jenkins is configured using Configuration as Code (CASC) via `jenkins/jenkins.yaml`:

- **Security**: Local authentication with admin user
- **Global Libraries**: Shared pipeline libraries
- **Job Configuration**: Pre-configured pipeline job
- **Environment Variables**: Docker and Node.js configuration

### Plugins

Essential plugins are defined in `jenkins/plugins.txt`:

- **Blue Ocean**: Modern UI for Jenkins
- **Docker**: Docker integration
- **Git**: Git integration
- **GitHub**: GitHub integration
- **Pipeline**: Pipeline support
- **Configuration as Code**: CASC support
- **Build Timeout**: Build timeout management
- **Credentials Binding**: Secure credential management

## Pipeline Overview

The CI/CD pipeline is defined in `Jenkinsfile` and includes the following stages:

### 1. Checkout
- Checks out source code from Git
- Sets environment variables for Git commit and branch

### 2. Environment Setup
- Cleans workspace
- Sets up Node.js and pnpm
- Verifies environment

### 3. Install Dependencies
- Installs project dependencies using pnpm
- Uses frozen lockfile for reproducible builds

### 4. Code Quality (Parallel)
- **Linting**: Runs ESLint for code quality
- **Type Checking**: Runs TypeScript compiler for type checking

### 5. Testing
- Runs unit tests with coverage
- Publishes test results and coverage reports

### 6. Security Scan
- Runs npm audit for dependency vulnerabilities
- Runs Snyk security scan (if available)

### 7. Build Application
- Builds the TypeScript application
- Archives build artifacts

### 8. Docker Build
- Builds Docker image with build number tag
- Pushes image to registry

### 9. Docker Security Scan
- Scans Docker image for vulnerabilities using Trivy

### 10. Deploy to Staging (develop branch)
- Deploys to staging environment
- Runs integration tests

### 11. Deploy to Production (main branch)
- Requires manual approval
- Deploys to production environment

## Environment Setup

### Prerequisites

1. **Docker and Docker Compose**: Required for containerization
2. **Git**: For source code management
3. **Node.js 20+**: For application development
4. **pnpm**: Package manager

### Starting Jenkins

```bash
# Start all services including Jenkins
docker-compose up -d

# Check Jenkins status
docker-compose ps jenkins

# View Jenkins logs
docker-compose logs -f jenkins
```

### Accessing Jenkins

1. **URL**: http://localhost:8080
2. **Username**: `admin`
3. **Password**: `admin`

### Initial Setup

1. **Login**: Use admin credentials
2. **Install Plugins**: Plugins are auto-installed from `plugins.txt`
3. **Configure Pipeline**: Pipeline job is auto-created from CASC
4. **Setup Credentials**: Configure Docker registry and Slack webhook credentials

## Usage

### Running the Pipeline

#### Manual Trigger
1. Go to Jenkins dashboard
2. Click on "taskmanager-pipeline"
3. Click "Build Now"

#### Git Trigger
- Pipeline automatically triggers on:
  - Push to `main` branch (production deployment)
  - Push to `develop` branch (staging deployment)
  - Pull request creation

#### Blue Ocean
1. Click "Open Blue Ocean" in Jenkins
2. Select "taskmanager-pipeline"
3. Click "Run" to start pipeline

### Pipeline Parameters

The pipeline uses the following environment variables:

```bash
DOCKER_IMAGE=devsecops-taskmanager-app
DOCKER_TAG=${BUILD_NUMBER}
REGISTRY=your-registry.com
APP_NAME=taskmanager-api
NODE_VERSION=20
PNPM_VERSION=10.8.0
```

### Environment-Specific Deployment

#### Staging Environment
- **Trigger**: Push to `develop` branch
- **Configuration**: `docker-compose.staging.yml`
- **Database**: `taskdb_staging`
- **Features**: Integration tests

#### Production Environment
- **Trigger**: Push to `main` branch
- **Configuration**: `docker-compose.prod.yml`
- **Database**: `taskdb_prod`
- **Features**: Manual approval, resource limits, high availability

## Monitoring

### Jenkins Metrics

Jenkins metrics are available for Prometheus monitoring:

- **Build Success/Failure Rates**
- **Build Duration**
- **Queue Length**
- **Agent Status**

### Integration with Monitoring Stack

Jenkins integrates with the existing monitoring stack:

- **Prometheus**: Collects Jenkins metrics
- **Grafana**: Visualizes Jenkins dashboards
- **Application**: Monitors deployed applications

### Notifications

Pipeline sends notifications to:

- **Slack**: Success/failure notifications
- **Email**: Build status updates (configurable)
- **Webhooks**: Custom integrations

## Troubleshooting

### Common Issues

#### 1. Jenkins Won't Start
**Problem**: Jenkins container fails to start
**Solutions**:
```bash
# Check logs
docker-compose logs jenkins

# Check port conflicts
netstat -tulpn | grep 8080

# Restart Jenkins
docker-compose restart jenkins
```

#### 2. Docker Permission Issues
**Problem**: Jenkins can't access Docker daemon
**Solutions**:
```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock

# Restart with proper permissions
docker-compose down
docker-compose up -d
```

#### 3. Pipeline Fails at Docker Build
**Problem**: Docker build fails
**Solutions**:
- Check Dockerfile syntax
- Verify build context
- Check available disk space
- Review Docker logs

#### 4. Plugin Installation Issues
**Problem**: Plugins fail to install
**Solutions**:
- Check internet connectivity
- Verify plugin versions in `plugins.txt`
- Restart Jenkins after plugin installation

### Useful Commands

```bash
# View Jenkins logs
docker-compose logs -f jenkins

# Access Jenkins container
docker-compose exec jenkins bash

# Restart Jenkins
docker-compose restart jenkins

# Update Jenkins plugins
docker-compose exec jenkins jenkins-plugin-cli --list

# Backup Jenkins data
docker run --rm -v taskmanager_jenkins_data:/data -v $(pwd):/backup alpine tar czf /backup/jenkins-backup.tar.gz -C /data .

# Restore Jenkins data
docker run --rm -v taskmanager_jenkins_data:/data -v $(pwd):/backup alpine tar xzf /backup/jenkins-backup.tar.gz -C /data
```

## Best Practices

### 1. Security
- **Change Default Credentials**: Update admin password
- **Use Secrets**: Store sensitive data in Jenkins credentials
- **Limit Permissions**: Use role-based access control
- **Regular Updates**: Keep Jenkins and plugins updated

### 2. Performance
- **Resource Limits**: Set appropriate memory and CPU limits
- **Build Optimization**: Use Docker layer caching
- **Parallel Execution**: Run independent stages in parallel
- **Cleanup**: Regular cleanup of old builds and artifacts

### 3. Monitoring
- **Health Checks**: Monitor Jenkins health
- **Metrics Collection**: Collect build metrics
- **Alerting**: Set up alerts for failures
- **Logging**: Centralized logging

### 4. Maintenance
- **Regular Backups**: Backup Jenkins configuration and data
- **Plugin Updates**: Keep plugins updated
- **Security Scans**: Regular security vulnerability scans
- **Documentation**: Keep documentation updated

### 5. Pipeline Design
- **Fail Fast**: Stop pipeline on critical failures
- **Parallel Stages**: Run independent stages in parallel
- **Artifact Management**: Proper artifact storage and cleanup
- **Environment Parity**: Consistent environments across stages

## Environment Variables

### Required Environment Variables

```bash
# Production
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional
DOCKER_REGISTRY=your-registry.com
DOCKER_REGISTRY_USERNAME=your-username
DOCKER_REGISTRY_PASSWORD=your-password
```

### Setting Environment Variables

#### For Docker Compose
```bash
# Create .env file
echo "POSTGRES_PASSWORD=secure-password" >> .env
echo "JWT_SECRET=jwt-secret-key" >> .env
```

#### For Jenkins
1. Go to Jenkins → Manage Jenkins → Configure System
2. Add environment variables in "Global properties"
3. Or use "Environment variables" in pipeline

## Resources

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)
- [Configuration as Code](https://github.com/jenkinsci/configuration-as-code-plugin)
- [Blue Ocean](https://www.jenkins.io/projects/blueocean/)
- [Docker Plugin](https://plugins.jenkins.io/docker-plugin/)

## Current Status

**Last Updated**: September 2025
**Jenkins Version**: 2.463.3 LTS
**Pipeline Status**: Active
**Environments**: Staging, Production
**Monitoring**: Integrated with Prometheus/Grafana
