# Cloudflare Tunnel Setup

This directory contains environment-specific configuration for publishing the stack through Cloudflare.

## Usage
1. Create a tunnel in Cloudflare for each environment (development and production).
2. Download the credentials JSON for each tunnel and place it under config/<env>/ with the filename that matches the tunnel ID.
3. Update config/<env>/config.yml to reference the tunnel ID and credentials file name you generated.
4. Set ENV_SUFFIX in the project .env file to dev or prod so Docker Compose mounts the correct configuration.
5. Start the stack with docker compose up -d to expose it through the Cloudflare tunnel.

The tunnel forwards requests to the local nginx service, which serves both the frontend and backend through the same hostname.