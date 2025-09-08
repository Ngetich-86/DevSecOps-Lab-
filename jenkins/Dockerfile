FROM jenkins/jenkins:lts

USER root

# Install required tools (git) in the image for Jenkins jobs and Git plugin helpers
RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl \
    && rm -rf /var/lib/apt/lists/*

# Copy plugins list and install them
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Enable Configuration as Code and point to the casc directory
ENV CASC_JENKINS_CONFIG=/var/jenkins_home/casc_configs/jenkins.yaml

# Copy default JCasC on first run
COPY jenkins.yaml /usr/share/jenkins/ref/casc_configs/jenkins.yaml

# Pre-create admin user via environment on first run; still enforce auth via JCasC
ENV JENKINS_OPTS="--httpPort=8080"

USER jenkins


