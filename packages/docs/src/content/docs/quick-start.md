---
title: Quick Start
description: Start inbrx and capture your first test email.
---

## Start inbrx

Run the CLI with `npx`:

```bash
npx @inbrx/cli
```

When the server is ready, the CLI prints the SMTP and Web UI addresses:

| Service | Default |
| --- | --- |
| SMTP | `127.0.0.1:2525` |
| Web UI | `http://127.0.0.1:3000` |
| Storage | File-backed user data directory |

Open the Web UI and configure your application to send mail to `127.0.0.1` on port `2525`.

## Use memory storage

For throwaway sessions, keep messages only in memory:

```bash
npx @inbrx/cli --storage memory
```

Messages captured with memory storage disappear when the process exits.

## Stop inbrx

Press `Ctrl+C` in the terminal running inbrx.
