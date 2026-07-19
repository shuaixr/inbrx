---
title: Connect Your App
description: Configure your application to send email to inbrx.
---

Use these SMTP settings in your application:

| Setting | Value |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `2525` |
| TLS | Disabled by default |
| Authentication | Optional |

Then open `http://127.0.0.1:3000` to inspect captured messages.

## Nodemailer

```ts
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: '127.0.0.1',
  port: 2525,
  secure: false
});

await transport.sendMail({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Hello from inbrx',
  text: 'This email was captured locally.'
});
```

## Generic SMTP

Most frameworks expose the same core settings:

```text
SMTP_HOST=127.0.0.1
SMTP_PORT=2525
SMTP_TLS=false
```

If your framework requires SMTP credentials, use any username and password. inbrx accepts authentication but does not require it.
