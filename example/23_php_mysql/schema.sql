CREATE TABLE departments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE people (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
    department_id INT UNSIGNED NOT NULL,
    CONSTRAINT people_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT people_salary CHECK (salary >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO departments (name) VALUES ('Engineering'), ('Operations'), ('Sales');

INSERT INTO people (name, email, salary, department_id) VALUES
('Alice Adams', 'alice@example.com', 60000, 1),
('Bob Brown', 'bob@example.com', 55000, 2),
('Carol Clark', 'carol@example.com', 65000, 3),
('Daniel Davis', 'daniel@example.com', 58000, 1),
('Emma Evans', 'emma@example.com', 62000, 2),
('Frank Fisher', 'frank@example.com', 54000, 3),
('Grace Green', 'grace@example.com', 71000, 1),
('Henry Hall', 'henry@example.com', 59000, 2),
('Irene Irwin', 'irene@example.com', 63000, 3),
('Jack James', 'jack@example.com', 57000, 1),
('Karen King', 'karen@example.com', 68000, 2),
('Leo Lewis', 'leo@example.com', 61000, 3),
('Maria Miller', 'maria@example.com', 66000, 1),
('Noah Nelson', 'noah@example.com', 56000, 2),
('Olivia Owen', 'olivia@example.com', 69000, 3),
('Paul Parker', 'paul@example.com', 64000, 1),
('Quinn Quinn', 'quinn@example.com', 53000, 2),
('Rose Reed', 'rose@example.com', 72000, 3),
('Sam Smith', 'sam@example.com', 67000, 1),
('Tara Turner', 'tara@example.com', 60000, 2),
('Uma Underwood', 'uma@example.com', 70000, 3),
('Victor Vale', 'victor@example.com', 59000, 1),
('Wendy White', 'wendy@example.com', 62000, 2),
('Xavier Young', 'xavier@example.com', 65000, 3),
('Zoe Zimmer', 'zoe@example.com', 73000, 1);
