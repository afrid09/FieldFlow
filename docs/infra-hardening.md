# Infrastructure Hardening

This section covers TLS, ingress, resource limits, probes, autoscaling, and network policies.

## TLS & Certificates
Use cert-manager with Let’s Encrypt:
- `infra/k8s/cert-manager.yaml` defines a `ClusterIssuer`.
- `infra/k8s/ingress.yaml` includes TLS with `fieldflow-tls`.

Update the email in `cert-manager.yaml` before applying.

## Ingress & Networking
- Ingress class: `nginx`
- Host: `fieldflow.local`
- TLS secret: `fieldflow-tls`

## Resource Limits & Probes
Kubernetes manifests include:
- CPU/memory requests + limits
- Liveness and readiness probes
- Non-root filesystem restrictions

## Autoscaling (HPA)
`infra/k8s/hpa.yaml` configures CPU-based scaling for:
- `api-gateway`
- `command-service`
- `read-service`

## Pod Disruption Budgets
`infra/k8s/pdb.yaml` ensures minimum availability for core services.

## Network Policies
`infra/k8s/network-policy.yaml` applies:
- Default deny
- Explicit API gateway ingress
- DB ingress only from services

## Helm
Helm ingress template includes TLS annotations and a `fieldflow-tls` secret reference.
