# YOLO Pose Helm Chart

This Helm chart deploys the YOLO Pose Detection application on Kubernetes.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- Ingress controller (nginx, traefik, etc.)
- Container registry access

## Installation

### Quick Start

```bash
# Add the repository
helm repo add yolo-pose https://gpillon.github.io/yolo-pose/
helm repo update

# Install the chart
helm install yolo-pose yolo-pose/yolo-pose

# Or install with custom values
helm install yolo-pose yolo-pose/yolo-pose -f values-production.yaml
```

### Development Installation

```bash
# Install with development settings
helm install yolo-pose-dev yolo-pose/yolo-pose \
  --set frontend.ingress.enabled=false \
  --set backend.resources.limits.cpu=1000m \
  --set backend.resources.limits.memory=2Gi
```

### Production Installation

```bash
# Install with production settings
helm install yolo-pose-prod yolo-pose/yolo-pose \
  -f values-production.yaml \
  --namespace yolo-pose \
  --create-namespace
```

### Local Installation (from source)

```bash
# Clone the repository
git clone https://github.com/gpillon/yolo-pose.git
cd yolo-pose

# Install from local chart
helm install yolo-pose ./helm/yolo-pose
```

## Configuration

### Backend Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.enabled` | Enable backend deployment | `true` |
| `backend.replicaCount` | Number of backend replicas | `1` |
| `backend.image.repository` | Backend image repository | `ghcr.io/gpillon/museum/yolo-pose-backend` |
| `backend.image.tag` | Backend image tag | `latest` |
| `backend.resources.limits.cpu` | CPU limit | `2000m` |
| `backend.resources.limits.memory` | Memory limit | `4Gi` |
| `backend.config.modelPath` | Path to YOLO model | `/app/models/yolo11s-pose.pt` |

### Frontend Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `frontend.enabled` | Enable frontend deployment | `true` |
| `frontend.replicaCount` | Number of frontend replicas | `1` |
| `frontend.image.repository` | Frontend image repository | `ghcr.io/gpillon/museum/yolo-pose-frontend` |
| `frontend.image.tag` | Frontend image tag | `latest` |
| `frontend.ingress.enabled` | Enable ingress | `true` |
| `frontend.ingress.hosts[0].host` | Ingress hostname | `yolo-pose.local` |

### Global Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imageRegistry` | Global image registry | `""` |
| `global.storageClass` | Global storage class | `""` |

## Usage

### Accessing the Application

After installation, you can access the application:

1. **Via Ingress** (if enabled):
   ```bash
   # Add to /etc/hosts for local testing
   echo "127.0.0.1 yolo-pose.local" >> /etc/hosts
   ```

2. **Via Port Forward**:
   ```bash
   # Frontend
   kubectl port-forward svc/yolo-pose-frontend 8080:8080
   
   # Backend API
   kubectl port-forward svc/yolo-pose-backend 8000:8000
   ```

3. **Via LoadBalancer** (if configured):
   ```bash
   kubectl get svc yolo-pose-frontend -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
   ```

### Health Checks

```bash
# Check pod status
kubectl get pods -l app.kubernetes.io/name=yolo-pose

# Check backend health
kubectl exec -it deployment/yolo-pose-backend -- curl http://localhost:8000/health

# Check frontend health
kubectl exec -it deployment/yolo-pose-frontend -- curl http://localhost:8080
```

### Logs

```bash
# Backend logs
kubectl logs -l app.kubernetes.io/component=backend

# Frontend logs
kubectl logs -l app.kubernetes.io/component=frontend

# Follow logs
kubectl logs -f deployment/yolo-pose-backend
```

## Upgrading

```bash
# Update the repository
helm repo update

# Upgrade the release
helm upgrade yolo-pose yolo-pose/yolo-pose

# Upgrade with new values
helm upgrade yolo-pose yolo-pose/yolo-pose -f values-production.yaml
```

## Uninstalling

```bash
# Uninstall the release
helm uninstall yolo-pose

# Remove PVCs (if using persistent storage)
kubectl delete pvc -l app.kubernetes.io/name=yolo-pose
```

## Troubleshooting

### Common Issues

1. **Image Pull Errors**:
   ```bash
   # Check image pull secrets
   kubectl get secrets
   
   # Create image pull secret if needed
   kubectl create secret docker-registry ghcr-secret \
     --docker-server=ghcr.io \
     --docker-username=gpillon \
     --docker-password=your-token
   ```

2. **Resource Issues**:
   ```bash
   # Check resource usage
   kubectl top pods
   
   # Check events
   kubectl get events --sort-by='.lastTimestamp'
   ```

3. **Ingress Issues**:
   ```bash
   # Check ingress controller
   kubectl get pods -n ingress-nginx
   
   # Check ingress status
   kubectl describe ingress yolo-pose-frontend
   ```

### Debugging

```bash
# Get detailed pod information
kubectl describe pod -l app.kubernetes.io/name=yolo-pose

# Check pod logs
kubectl logs -l app.kubernetes.io/name=yolo-pose --all-containers

# Execute commands in pods
kubectl exec -it deployment/yolo-pose-backend -- /bin/bash
```

## Customization

### Adding Custom Environment Variables

```yaml
# values-custom.yaml
backend:
  env:
    CUSTOM_VAR: "custom-value"
    API_KEY: "your-api-key"

frontend:
  env:
    REACT_APP_CUSTOM_CONFIG: "custom-config"
```

### Configuring Persistent Storage

```yaml
# values-storage.yaml
backend:
  volumes:
    models:
      enabled: true
      type: persistentVolumeClaim
      size: 10Gi

global:
  storageClass: "fast-ssd"
```

### Setting up Monitoring

```yaml
# values-monitoring.yaml
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the chart: `helm lint ./helm/yolo-pose`
5. Submit a pull request

## License

This project is licensed under the MIT License. 