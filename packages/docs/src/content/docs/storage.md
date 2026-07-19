---
title: Storage
description: Choose how inbrx stores captured messages.
---

inbrx supports two storage modes.

| Mode | Description |
| --- | --- |
| `file` | Stores captured messages in the standard user data directory for your operating system. |
| `memory` | Keeps captured messages in memory until the process exits. |

## File storage

File storage is the default:

```bash
npx @inbrx/cli --storage file
```

Use it when you want messages to remain available across process restarts.

## Memory storage

Memory storage is useful for short-lived test runs:

```bash
npx @inbrx/cli --storage memory
```

Use it for disposable local sessions or automated tests where persistence is not needed.

## Retention limit

Use `--max-messages` to control how many messages are retained:

```bash
npx @inbrx/cli --max-messages 500
```
