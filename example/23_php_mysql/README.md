# PHP and MySQL server processing

[Example guide](../../docs/examples.md) · [Page](example23.html) · [Client configuration](example23.js)

This example runs DataTables with `serverSide: true` and stores changes in MySQL. PHP handles paging, global and per-column search, multiple-column ordering, creation, editing, and transactional deletion of selected records. Forms use independent fields and convert a department object to an option ID and back. Successful writes return complete database rows. The editor's normal server-side redraw reloads the current page after each accepted operation.

## Requirements

- PHP 8.2 or later with `pdo_mysql` and `mbstring` enabled.
- MySQL 8.0.16 or later, with InnoDB support.
- A built checkout of this repository and a browser with access to the example CDN dependencies.

GitHub Pages and `npm run dev` serve static files and cannot execute this backend. Use the PHP server below. The SQL file creates new tables and sample rows, so import it into a dedicated empty database.

## Create the database

Connect with a database administrator and create the sample database and a restricted local account. Replace the example password with a local password.

```sql
CREATE DATABASE alteditor_example CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'alteditor_example'@'127.0.0.1' IDENTIFIED BY 'replace-with-a-local-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON alteditor_example.* TO 'alteditor_example'@'127.0.0.1';
```

Import the schema with an account allowed to create tables. From the repository root, connect to the new database and run the source command in the MySQL client.

```text
mysql --host=127.0.0.1 --user=root --password alteditor_example
SOURCE example/23_php_mysql/schema.sql;
```

The dataset includes three departments and 25 people so that paging is visible immediately. Email addresses have a database uniqueness constraint. Department IDs use a foreign key, and salaries have a nonnegative check constraint.

## Run locally

Build the distribution from the repository root with `npm ci` and `npm run build`. Set database configuration in the shell that will run PHP.

PowerShell

```powershell
$env:ALTEDITOR_DB_DSN = 'mysql:host=127.0.0.1;port=3306;dbname=alteditor_example;charset=utf8mb4'
$env:ALTEDITOR_DB_USER = 'alteditor_example'
$env:ALTEDITOR_DB_PASSWORD = 'replace-with-a-local-password'
php -S 127.0.0.1:8081 -t .
```

POSIX shell

```sh
export ALTEDITOR_DB_DSN='mysql:host=127.0.0.1;port=3306;dbname=alteditor_example;charset=utf8mb4'
export ALTEDITOR_DB_USER='alteditor_example'
export ALTEDITOR_DB_PASSWORD='replace-with-a-local-password'
php -S 127.0.0.1:8081 -t .
```

Open [the local example](http://127.0.0.1:8081/example/23_php_mysql/example23.html). If PHP reports a missing driver or function, enable `pdo_mysql` and `mbstring` in the active `php.ini` and restart the server. Database errors are recorded in the PHP server log without exposing connection details in responses.

## Try the behavior

1. Change pages, click column headings, and search for a name or department. Shift-click additional headings for multiple-column ordering. Each draw requests only the current page from PHP.
2. Add a person with a new email address. Clear a search filter if the new record does not match it, and sort or search to locate the record. Reload the page to verify that MySQL retains the change.
3. Select a person and edit the department and salary. Display labels come from the joined database row, and salaries are stored as decimal values.
4. Submit an email already used by another person. A server field error appears beside Email, including when the other record is on an unloaded page. Correct it and retry.
5. Select several rows on the current page and delete them together. The transaction rejects the entire operation if a selected record has already disappeared. Selection and uniqueness checks on the client only cover loaded rows.

## Request contract

All endpoints use `api.php` on the same origin. GET `action=bootstrap` returns department options and a session CSRF token. GET `action=list` (the default) accepts DataTables parameters and returns integer `draw`, `recordsTotal`, `recordsFiltered`, and `data`.

The fixed column order is name, email, department name, and salary. SQL identifiers and ordering directions are selected from server-defined lists. Values are bound through PDO prepared statements with native prepares enabled. Searches perform literal substring matching under the database collation, escaping SQL LIKE wildcards. Regex flags are not interpreted. Page lengths are limited to 1–100, and each search string to 200 characters. The client does not offer an unlimited page length. Applications with a different column layout must update the server's column list as well.

POST `action=create` accepts `{ name, email, department: { id }, salary }`. POST `action=update` also requires the original numeric `id`. Both return a complete persisted row, including `row_id`, department labels, and numeric salary. POST `action=delete` accepts `{ ids: [1, 2] }` with up to 100 IDs. Write requests require JSON and the `X-CSRF-Token` header from bootstrap. Bodies are limited to 16 KiB. Validation failures use `fieldErrors`, missing rows return 404, and duplicate email addresses return 409 with a field error.

The client has a 15-second transport timeout. A timeout does not cancel a database write already accepted by PHP. Refresh the table before retrying an uncertain result. Concurrent edits use the latest accepted write, without optimistic locking.

This is a local development example. The PHP development server must stay bound to the loopback address. For application deployment, serve only intended public assets and endpoints, add authentication and record-level authorization, use HTTPS and protected environment configuration, and apply the application's concurrency policy. Session CSRF protection does not authorize a user to access records.
