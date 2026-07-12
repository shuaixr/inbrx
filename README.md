# inbrx

A local SMTP testing environment for developers. Start it, point your application at the local SMTP endpoint, and inspect captured emails in the browser.

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
  --http-host 127.0.0.1 \
  --http-port 3000 \
  --max-messages 500 \
  --storage file
```

Environment variables:

- `SMTP_TEST_SMTP_HOST`
- `SMTP_TEST_SMTP_PORT`
- `SMTP_TEST_HTTP_HOST`
- `SMTP_TEST_HTTP_PORT`
- `SMTP_TEST_MAX_MESSAGES`
- `INBRX_STORAGE=file|memory`

## Attachments

inbrx stores attachment content separately from message metadata. In file storage mode, messages and attachments are persisted under the operating system's standard user data directory. In memory mode, messages and attachments are removed when the process exits.

Captured attachments appear in the message detail view and can be downloaded from the Web UI.
