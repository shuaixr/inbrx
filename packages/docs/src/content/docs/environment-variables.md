---
title: Environment Variables
description: Configure inbrx with environment variables.
---

CLI options take precedence over environment variables.

| Variable | Description |
| --- | --- |
| `SMTP_TEST_SMTP_HOST` | SMTP bind host. |
| `SMTP_TEST_SMTP_PORT` | SMTP port. |
| `INBRX_SMTP_STARTTLS` | Enable STARTTLS with `true`, `1`, `yes`, or `on`. |
| `INBRX_SMTP_TLS_KEY` | TLS private key path for STARTTLS. |
| `INBRX_SMTP_TLS_CERT` | TLS certificate path for STARTTLS. |
| `SMTP_TEST_HTTP_HOST` | HTTP API and Web UI bind host. |
| `SMTP_TEST_HTTP_PORT` | HTTP API and Web UI port. |
| `SMTP_TEST_MAX_MESSAGES` | Maximum retained messages. |
| `INBRX_STORAGE` | Storage mode: `file` or `memory`. |

## Example

```bash
INBRX_STORAGE=memory SMTP_TEST_MAX_MESSAGES=100 npx @inbrx/cli
```
