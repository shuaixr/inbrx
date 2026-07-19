---
title: FAQ
description: Common questions about inbrx.
---

## Does inbrx send email?

No. inbrx captures email locally so you can inspect it during development and testing.

## Does SMTP authentication matter?

Authentication is optional. If your application requires credentials to be configured, use any username and password.

## Where is the Web UI?

The Web UI is served at `http://127.0.0.1:3000` by default.

## Can I keep messages after restarting?

Yes. Use the default `file` storage mode.

## Can I run inbrx without persistence?

Yes. Start it with memory storage:

```bash
npx @inbrx/cli --storage memory
```
