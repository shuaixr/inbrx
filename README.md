# inbrx

[![CI](https://github.com/shuaixr/inbrx/actions/workflows/ci.yml/badge.svg)](https://github.com/shuaixr/inbrx/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/shuaixr/inbrx/branch/master/graph/badge.svg)](https://codecov.io/gh/shuaixr/inbrx)
[![npm @inbrx/cli](https://img.shields.io/npm/v/%40inbrx%2Fcli?label=%40inbrx%2Fcli)](https://www.npmjs.com/package/@inbrx/cli)
[![npm @inbrx/web](https://img.shields.io/npm/v/%40inbrx%2Fweb?label=%40inbrx%2Fweb)](https://www.npmjs.com/package/@inbrx/web)

inbrx is a local SMTP testing environment for capturing and inspecting test emails.

![inbrx Web UI](https://raw.githubusercontent.com/shuaixr/inbrx/master/docs/web-ui.png)

## Quick Start

```bash
npx @inbrx/cli
```

Defaults:

- SMTP server: `127.0.0.1:2525`
- Web UI: `http://127.0.0.1:3000`
- Storage: file-backed, using the standard user data directory for your operating system

Use memory-only storage for throwaway sessions:

```bash
npx @inbrx/cli --storage memory
```

## Options

```bash
inbrx start \
  --smtp-host 127.0.0.1 \
  --smtp-port 2525 \
  --smtp-starttls \
  --smtp-tls-key ./smtp.key \
  --smtp-tls-cert ./smtp.crt \
  --http-host 127.0.0.1 \
  --http-port 3000 \
  --max-messages 500 \
  --storage file
```

Environment variables:

- `SMTP_TEST_SMTP_HOST`
- `SMTP_TEST_SMTP_PORT`
- `INBRX_SMTP_STARTTLS=true|false`
- `INBRX_SMTP_TLS_KEY`
- `INBRX_SMTP_TLS_CERT`
- `SMTP_TEST_HTTP_HOST`
- `SMTP_TEST_HTTP_PORT`
- `SMTP_TEST_MAX_MESSAGES`
- `INBRX_STORAGE=file|memory`

## STARTTLS

Enable STARTTLS with an automatically generated in-memory self-signed certificate:

```bash
inbrx start --smtp-starttls
```

Use your own certificate by providing both paths. Providing both paths also enables STARTTLS:

```bash
inbrx start --smtp-tls-key ./smtp.key --smtp-tls-cert ./smtp.crt
```

Self-signed certificates usually require test clients to disable certificate verification:

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
