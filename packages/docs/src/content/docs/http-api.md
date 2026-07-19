---
title: HTTP API
description: HTTP endpoints exposed by the inbrx server.
---

The HTTP server hosts both the Web UI and JSON API on the configured HTTP host and port.

## Health

```http
GET /api/health
```

Returns:

```json
{ "status": "ok" }
```

## Connection settings

```http
GET /api/connection
```

Returns the SMTP connection settings currently used by the server.

## Message events

```http
GET /api/events
```

Opens a Server-Sent Events stream for mailbox updates.

## List messages

```http
GET /api/messages
```

Supported query parameters:

| Parameter | Description |
| --- | --- |
| `q` | Search text. |
| `hasAttachments` | Filter by attachment presence. |
| `receivedAfter` | Filter messages received after a timestamp. |
| `receivedBefore` | Filter messages received before a timestamp. |

## Clear messages

```http
DELETE /api/messages
```

Deletes all retained messages.

## Get a message

```http
GET /api/messages/:id
```

Returns message details for a captured message.

## Delete a message

```http
DELETE /api/messages/:id
```

Deletes a captured message.

## Download an attachment

```http
GET /api/messages/:id/attachments/:attachmentId
```

Returns the stored attachment content with attachment headers.
