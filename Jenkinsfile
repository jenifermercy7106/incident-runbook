pipeline {
    agent any

    environment {
        DOCKERHUB = credentials('dockerhub-creds')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                dir('app') {
                    bat 'npm install'
                    bat 'npm test'
                }
            }
        }

        stage('Docker Build') {
            steps {
                bat 'docker build -t %DOCKERHUB_USR%/incident-runbook:%BUILD_NUMBER% .'
            }
        }

        stage('Docker Push') {
            steps {
                bat 'echo %DOCKERHUB_PSW%| docker login -u %DOCKERHUB_USR% --password-stdin'
                bat 'docker push %DOCKERHUB_USR%/incident-runbook:%BUILD_NUMBER%'
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    bat 'kubectl apply -f k8s/deployment.yaml'
                    bat 'kubectl apply -f k8s/service.yaml'
                    bat 'kubectl set image deployment/runbook-deployment runbook=%DOCKERHUB_USR%/incident-runbook:%BUILD_NUMBER%'
                    bat 'kubectl rollout status deployment/runbook-deployment'
                }
            }
        }
    }
}
