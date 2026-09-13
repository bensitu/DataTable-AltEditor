# Security Policy

[Project overview](README.md) · [Contributing](CONTRIBUTING.md)

## Supported versions

Security fixes target the latest 4.x release. Earlier major versions are not supported; upgrade to the latest 4.x release before requesting a fix.

## Reporting a vulnerability

Please report suspected vulnerabilities privately. Do not publish exploit details, credentials, personal information, or affected production data in issues or pull requests.

1. Visit the [repository security page](https://github.com/bensitu/DataTable-AltEditor/security). If **Report a vulnerability** is available, use it to submit a private report.
2. If private reporting is unavailable, open an [issue](https://github.com/bensitu/DataTable-AltEditor/issues) requesting a private security contact. Include only the contact request, without vulnerability details. Wait for a maintainer to provide a private channel before sharing the report.

Include the following information in the private report:

- Affected AltEditor version and relevant dependency versions.
- Browser and operating system, where relevant.
- A description of the vulnerability, its potential impact, and any required configuration.
- Minimal reproduction steps or a small example using synthetic data.
- Any suggested mitigation or fix, if available.

Only investigate systems you own or have permission to test. Use local examples where possible and avoid accessing other people's data or disrupting services.

## Handling reports

Maintainers review reports, request clarification when needed, and coordinate fixes and disclosure with the reporter. Response and remediation times depend on maintainer availability and the complexity of the issue; no fixed response time is guaranteed.

Report details are shared only as needed to investigate and resolve the issue. Please coordinate public disclosure with maintainers so affected users have an opportunity to update. Reporter credit will be discussed before publication.

## Application security

AltEditor runs in the browser. Applications remain responsible for server-side authentication, authorization, validation, and safe storage. Read-only fields, disabled controls, and client-side validation are not security boundaries. Treat row data, uploaded files, and values sent by the browser as untrusted input on the server.

Use the optional `maxFileSize` column setting to avoid reading oversized files in the browser. Enforce file size, content, and type restrictions independently on the server; the client setting can be bypassed.

For ordinary bugs and feature requests, use the [issue tracker](https://github.com/bensitu/DataTable-AltEditor/issues). Report vulnerabilities in third-party dependencies through the affected project's security process; notify AltEditor maintainers privately if AltEditor is also affected.

Custom dialog templates and DOM returned for deletion details are trusted application code. Do not interpolate untrusted values into template markup. Use `textContent` for row values and sanitize external HTML before creating DOM content. String deletion summaries are inserted as text. See the [dialog guide](docs/dialogs.md#styling-and-trusted-content).
