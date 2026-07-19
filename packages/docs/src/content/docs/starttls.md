---
title: STARTTLS
description: Enable STARTTLS for SMTP clients that require TLS.
---

STARTTLS is disabled by default.

## Temporary self-signed certificate

Enable STARTTLS with an automatically generated in-memory self-signed certificate:

```bash
inbrx start --smtp-starttls
```

Self-signed certificates usually require test clients to disable certificate verification.

## Custom certificate

Provide both a private key and certificate path:

```bash
inbrx start --smtp-tls-key ./smtp.key --smtp-tls-cert ./smtp.crt
```

Providing both paths also enables STARTTLS.

## swaks example

```bash
swaks --to recipient@example.com \
  --from sender@example.com \
  --server 127.0.0.1 \
  --port 2525 \
  --tls \
  --tls-verify false \
  --auth LOGIN \
  --auth-user sender@example.com \
  --auth-password 'your_password' \
  --header "Subject: test email" \
  --body "Hello from SMTP"
```
