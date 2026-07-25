---
title: Docker
description: Run inbrx from a Docker image.
---

The Docker image runs the SMTP server and Web UI in one container.

## Pull the image

Published images are available from GitHub Container Registry:

```bash
docker pull ghcr.io/shuaixr/inbrx:latest
```

## Run inbrx

Run inbrx with file-backed storage mounted at `/data`:

```bash
docker run --rm \
  -p 2525:2525 \
  -p 3000:3000 \
  -v inbrx-data:/data \
  ghcr.io/shuaixr/inbrx:latest
```

Then open `http://127.0.0.1:3000` and configure your application to send SMTP mail to `127.0.0.1:2525`.

## Storage

The image sets these defaults:

| Setting                | Value     |
| ---------------------- | --------- |
| SMTP bind host         | `0.0.0.0` |
| Web UI bind host       | `0.0.0.0` |
| File storage directory | `/data`   |

Mount a Docker volume or host directory to `/data` to keep captured messages across container restarts:

```bash
docker run --rm \
  -p 2525:2525 \
  -p 3000:3000 \
  -v "$PWD/inbrx-data:/data" \
  ghcr.io/shuaixr/inbrx:latest
```

Use memory storage for disposable runs:

```bash
docker run --rm \
  -p 2525:2525 \
  -p 3000:3000 \
  ghcr.io/shuaixr/inbrx:latest \
  --storage memory
```

## Build locally

Build the image from this repository:

```bash
docker build -t inbrx .
```

Run the local image:

```bash
docker run --rm \
  -p 2525:2525 \
  -p 3000:3000 \
  -v inbrx-data:/data \
  inbrx
```

## Docker Compose

Use Compose when you want inbrx to run with the rest of your development stack.

For a standalone inbrx service that accepts SMTP from your host machine, expose both ports:

```yaml
services:
  inbrx:
    image: ghcr.io/shuaixr/inbrx:latest
    ports:
      - "2525:2525"
      - "3000:3000"
    volumes:
      - inbrx-data:/data
    restart: unless-stopped

volumes:
  inbrx-data:
```

This example is also available at `examples/docker-compose.yml`.

When your application is in the same Compose project, the application can connect to inbrx by service name. In that case, expose only the Web UI port to your host:

```yaml
services:
  app:
    image: your-app
    environment:
      SMTP_HOST: inbrx
      SMTP_PORT: "2525"
    depends_on:
      - inbrx

  inbrx:
    image: ghcr.io/shuaixr/inbrx:latest
    ports:
      - "3000:3000"
    volumes:
      - inbrx-data:/data

volumes:
  inbrx-data:
```

Inside a Compose network, use `inbrx:2525` as the SMTP server address. Use `127.0.0.1:2525` only for applications running on the host machine.
