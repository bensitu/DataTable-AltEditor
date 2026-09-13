# Server persistence and files

[Example guide](../../docs/examples.md) · [Client](example16.js) · [Server](server.mjs)

This example uses a small Node.js HTTP server and browser FormData. No additional packages, database, or multipart parsing library are needed. Use the repository's supported Node.js version, preferably Node.js 24.

From the repository root:

```sh
npm ci
npm run build
node example/16_server_files/server.mjs
```

Open [the local example](http://127.0.0.1:8090/example/16_server_files/example16.html). The server serves the page and its API from the same origin. The ordinary `npm run dev` server and GitHub Pages cannot run this API. Internet access is needed for CDN dependencies.

## What to try

1. Add a person with spaces around the name and attach a small file. The server trims the name, assigns the record ID, and returns a complete row.
2. Reload the page. The new record and its download link remain available. Download the attachment to verify its contents.
3. Edit the name without choosing another file. The existing attachment is preserved. Selecting a replacement removes the previous attachment from server memory.
4. Try adding a duplicate name, including a different letter case. The server rejects it; the dialog remains available for correction and retry.
5. Delete a record. Its attachment is removed too. Restart the server to reset all data to the initial Alice record.

## Request flow

| Request                   | Behavior                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `GET /api/records`        | Return the current row array.                                                             |
| `POST /api/records`       | Accept multipart name and optional attachment; assign an ID and return the persisted row. |
| `PATCH /api/records/:id`  | Update the name and optionally replace the attachment.                                    |
| `DELETE /api/records/:id` | Remove the record and its attachment.                                                     |
| `GET /api/files/:id`      | Download attachment bytes.                                                                |

`encodeFiles: false` passes a File to the callback instead of a data URL. The client appends it to FormData and lets the browser set the multipart Content-Type boundary. Only after a successful HTTP response does it call `success(row)`. Failed responses call `error(error)` so the editor retains the form. The server enforces unique names and a 2 MiB attachment limit independently of client-side checks.

The server listens only on `127.0.0.1` and stores all data in memory. It is a local integration reference, not a deployment configuration. A deployed service needs authentication, authorization, durable storage, and application-specific file controls. This is client-side DataTables loading; it does not demonstrate `serverSide: true` pagination.
