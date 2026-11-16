<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0');
session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Strict', 'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
$csrf = $_SESSION['csrf'];
session_write_close();

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    exit;
}

function integer(mixed $value, int $minimum, int $maximum): int
{
    if ((!is_int($value) && !is_string($value)) || filter_var($value, FILTER_VALIDATE_INT) === false) {
        respond(['message' => 'Expected an integer.'], 400);
    }
    $number = (int) $value;
    if ($number < $minimum || $number > $maximum) {
        respond(['message' => 'Integer is outside the supported range.'], 400);
    }
    return $number;
}

function text(mixed $value, int $limit): string
{
    if (!is_string($value) || !mb_check_encoding($value, 'UTF-8') || mb_strlen($value, 'UTF-8') > $limit) {
        respond(['message' => 'Invalid text parameter.'], 400);
    }
    return $value;
}

function query(PDO $db, string $sql, array $parameters = []): PDOStatement
{
    $statement = $db->prepare($sql);
    foreach ($parameters as $key => $value) {
        $statement->bindValue(is_int($key) ? $key + 1 : $key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $statement->execute();
    return $statement;
}

const ROW_SELECT = 'SELECT p.id, p.name, p.email, p.salary, d.id AS department_id, d.name AS department_name FROM people p JOIN departments d ON d.id = p.department_id';

function rowData(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'row_id' => 'person_' . $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'salary' => (float) $row['salary'],
        'department' => ['id' => (int) $row['department_id'], 'name' => $row['department_name']],
    ];
}

function findRow(PDO $db, int $id): array
{
    $row = query($db, ROW_SELECT . ' WHERE p.id = ?', [$id])->fetch();
    if (!$row) {
        respond(['message' => 'The record no longer exists.'], 404);
    }
    return rowData($row);
}

function listRows(PDO $db): never
{
    $draw = integer($_GET['draw'] ?? 0, 0, 2147483647);
    $start = integer($_GET['start'] ?? 0, 0, 2147483647);
    $length = integer($_GET['length'] ?? 10, 1, 100);
    $columns = ['p.name', 'p.email', 'd.name', 'p.salary'];
    $where = [];
    $parameters = [];
    $contains = static fn(string $value): string => '%' . strtr($value, ['!' => '!!', '%' => '!%', '_' => '!_']) . '%';
    $search = text($_GET['search']['value'] ?? '', 200);
    if ($search !== '') {
        $where[] = '(' . implode(' OR ', array_map(static fn(string $column): string => "$column LIKE ? ESCAPE '!'", $columns)) . ')';
        foreach ($columns as $_column) {
            $parameters[] = $contains($search);
        }
    }
    foreach ($columns as $index => $column) {
        $value = text($_GET['columns'][$index]['search']['value'] ?? '', 200);
        if ($value !== '') {
            $where[] = "$column LIKE ? ESCAPE '!'";
            $parameters[] = $contains($value);
        }
    }
    $filter = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $order = [];
    $requested = $_GET['order'] ?? [];
    if (!is_array($requested) || count($requested) > count($columns)) {
        respond(['message' => 'Invalid ordering.'], 400);
    }
    foreach ($requested as $item) {
        $index = integer($item['column'] ?? null, 0, count($columns) - 1);
        $direction = $item['dir'] ?? '';
        if (!in_array($direction, ['asc', 'desc'], true)) {
            respond(['message' => 'Invalid ordering direction.'], 400);
        }
        $order[] = $columns[$index] . ' ' . strtoupper($direction);
    }
    $order[] = 'p.id ASC';
    $total = (int) query($db, 'SELECT COUNT(*) FROM people')->fetchColumn();
    $filtered = (int) query($db, 'SELECT COUNT(*) FROM people p JOIN departments d ON d.id = p.department_id' . $filter, $parameters)->fetchColumn();
    $rows = query($db, ROW_SELECT . $filter . ' ORDER BY ' . implode(', ', $order) . ' LIMIT ? OFFSET ?', [...$parameters, $length, $start])->fetchAll();
    respond(['draw' => $draw, 'recordsTotal' => $total, 'recordsFiltered' => $filtered, 'data' => array_map('rowData', $rows)]);
}

function validatedValues(PDO $db, array $body): array
{
    $errors = [];
    $name = is_string($body['name'] ?? null) ? trim($body['name']) : '';
    $email = is_string($body['email'] ?? null) ? trim($body['email']) : '';
    if ($name === '' || mb_strlen($name, 'UTF-8') > 120) {
        $errors['name'] = 'Enter a name of up to 120 characters.';
    }
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Enter a valid email address.';
    }
    $salary = $body['salary'] ?? null;
    if ((!is_int($salary) && !is_float($salary)) || !is_finite((float) $salary) || $salary < 0 || $salary > 99999999.99 || abs($salary * 100 - round($salary * 100)) > 0.00001) {
        $errors['salary'] = 'Enter a salary from 0 to 99999999.99 with at most two decimal places.';
    }
    $department = $body['department']['id'] ?? null;
    if (!is_int($department) || $department < 1 || !query($db, 'SELECT id FROM departments WHERE id = ?', [$department])->fetchColumn()) {
        $errors['department'] = 'Choose an available department.';
    }
    if ($errors) {
        respond(['fieldErrors' => $errors], 422);
    }
    return [$name, $email, $salary, $department];
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? 'list';
    if ($method === 'GET' && in_array($action, ['bootstrap', 'list'], true)) {
        $db = database();
        if ($action === 'bootstrap') {
            $departments = query($db, 'SELECT id, name FROM departments ORDER BY name')->fetchAll();
            respond(['csrfToken' => $csrf, 'departments' => array_map(static fn(array $row): array => ['id' => (int) $row['id'], 'text' => $row['name']], $departments)]);
        }
        listRows($db);
    }
    if ($method !== 'POST' || !in_array($action, ['create', 'update', 'delete'], true)) {
        header('Allow: GET, POST');
        respond(['message' => 'Unsupported method or action.'], 405);
    }
    if (!hash_equals($csrf, $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        respond(['message' => 'Reload the page before saving.'], 403);
    }
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
        respond(['message' => 'Send an application/json body.'], 415);
    }
    $input = file_get_contents('php://input', false, null, 0, 16385);
    if ($input === false || strlen($input) > 16384) {
        respond(['message' => 'Request body exceeds 16 KiB.'], 413);
    }
    $decoded = json_decode($input, false, 32, JSON_THROW_ON_ERROR);
    if (!$decoded instanceof stdClass) {
        respond(['message' => 'Expected a JSON object.'], 400);
    }
    $body = json_decode($input, true, 32, JSON_THROW_ON_ERROR);
    $db = database();
    if ($action === 'delete') {
        $ids = $body['ids'] ?? [];
        if (!is_array($ids) || !array_is_list($ids) || count($ids) < 1 || count($ids) > 100) {
            respond(['message' => 'Select between 1 and 100 records.'], 400);
        }
        $ids = array_values(array_unique(array_map(static fn(mixed $id): int => integer($id, 1, 4294967295), $ids)));
        sort($ids);
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $db->beginTransaction();
        $existing = query($db, "SELECT id FROM people WHERE id IN ($placeholders) ORDER BY id FOR UPDATE", $ids)->fetchAll();
        if (count($existing) !== count($ids)) {
            $db->rollBack();
            respond(['message' => 'A selected record no longer exists. Reload the table.'], 404);
        }
        query($db, "DELETE FROM people WHERE id IN ($placeholders)", $ids);
        $db->commit();
        respond(['deleted' => count($ids)]);
    }
    $values = validatedValues($db, $body);
    $db->beginTransaction();
    if ($action === 'create') {
        query($db, 'INSERT INTO people (name, email, salary, department_id) VALUES (?, ?, ?, ?)', $values);
        $id = (int) $db->lastInsertId();
    } else {
        $id = integer($body['id'] ?? null, 1, 4294967295);
        if (!query($db, 'SELECT id FROM people WHERE id = ? FOR UPDATE', [$id])->fetchColumn()) {
            $db->rollBack();
            respond(['message' => 'The record no longer exists.'], 404);
        }
        query($db, 'UPDATE people SET name = ?, email = ?, salary = ?, department_id = ? WHERE id = ?', [...$values, $id]);
    }
    $row = findRow($db, $id);
    $db->commit();
    respond($row, $action === 'create' ? 201 : 200);
} catch (JsonException $error) {
    respond(['message' => 'Invalid JSON body.'], 400);
} catch (PDOException $error) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    if (($error->errorInfo[1] ?? null) === 1062) {
        respond(['fieldErrors' => ['email' => 'This email address is already registered.']], 409);
    }
    error_log((string) $error);
    respond(['message' => 'Database operation failed. Check the local database configuration and server log.'], 500);
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log((string) $error);
    respond(['message' => 'The request could not be processed.'], 500);
}
