---
title: CLI Reference
description: Command line options for inbrx.
---

The default command starts both the SMTP server and the HTTP API/Web UI:

```bash
inbrx start
```

The `start` command is implied when the first argument is an option:

```bash
inbrx --storage memory
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `--smtp-host <host>` | `127.0.0.1` | SMTP bind host. |
| `--smtp-port <port>` | `2525` | SMTP port. |
| `--smtp-starttls` | `false` | Advertise and support STARTTLS. |
| `--smtp-tls-key <path>` | None | TLS private key path for STARTTLS. |
| `--smtp-tls-cert <path>` | None | TLS certificate path for STARTTLS. |
| `--http-host <host>` | `127.0.0.1` | HTTP API and Web UI bind host. |
| `--http-port <port>` | `3000` | HTTP API and Web UI port. |
| `--max-messages <count>` | `500` | Maximum retained messages. |
| `--storage <mode>` | `file` | Storage mode: `file` or `memory`. |

## Example

```bash
inbrx start \
  --smtp-host 127.0.0.1 \
  --smtp-port 2525 \
  --http-host 127.0.0.1 \
  --http-port 3000 \
  --max-messages 500 \
  --storage file
```
