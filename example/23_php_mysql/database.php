<?php
declare(strict_types=1);

function database(): PDO
{
    $dsn = getenv('ALTEDITOR_DB_DSN') ?: 'mysql:host=127.0.0.1;port=3306;dbname=alteditor_example;charset=utf8mb4';
    return new PDO($dsn, getenv('ALTEDITOR_DB_USER') ?: 'alteditor_example', getenv('ALTEDITOR_DB_PASSWORD') ?: '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
