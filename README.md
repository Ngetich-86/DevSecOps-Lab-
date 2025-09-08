# DevSecOps-TaskManager: Secure CI/CD Pipeline with Jenkins + GitHub + SonarQube + Prometheus + Grafana (Azure)

## Overview
**DevSecOps-TaskManager** is a learning project that demonstrates a secure, automated CI/CD pipeline for a **Node.js (Express) Task Manager API**.  
The pipeline integrates **Jenkins**, **GitHub**, **SonarQube**, **Prometheus**, and **Grafana** to enforce **security**, **quality**, and **observability** in every code delivery process, deployed on **Azure**.

---

## What This Setup Achieves
- **Secure CI/CD pipeline** with GitHub + Jenkins
- **Static Application Security Testing (SAST)** using SonarQube
- **Quality Gate enforcement** to block low-quality code
- **Container vulnerability scanning** with Trivy
- **GitHub secrets** and **Jenkins credential management**
- **Prometheus & Grafana monitoring** for Jenkins and the application
- **Docker-based builds** for consistent, isolated environments
- **Deployment to Azure** Virtual Machines or Container Instances

---

## Architecture Diagram
This setup includes:
- **Jenkins master** with Docker agents
- **SonarQube** connected to Jenkins for code analysis
- **GitHub** as the source code repository
- **Prometheus** scraping Jenkins and app metrics
- **Grafana** visualizing CI/CD and application performance metrics
- **Azure** hosting the deployed Task Manager API

---

## ⚙ Step-by-Step Setup

### 1. Prerequisites
- Docker & Docker Compose installed
- GitHub repository with Task Manager source code
- Jenkins, SonarQube, Prometheus, and Grafana Docker images
- Azure VM or Azure Container Instance

---

### 2. Clone Repo & Configure Credentials
```bash
git clone https://github.com/your-username/DevSecOps-TaskManager.git
cd DevSecOps-TaskManager
# Configure Jenkins credentials for GitHub, SonarQube, and Azure

##### GitHub webhook for Jenkins test:
http://<jenkins-server>/github-webhook/
