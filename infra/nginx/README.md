# Nginx TLS Proxy

This proxy terminates TLS and forwards traffic to `api-gateway:3000`.

## Generate a self-signed cert (dev)
```bash
./infra/nginx/generate-self-signed.sh
```

## Production
Replace `infra/nginx/certs/tls.crt` and `infra/nginx/certs/tls.key` with your real certificates.
