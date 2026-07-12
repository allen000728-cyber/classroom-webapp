-- 班級網頁 資料庫結構 (PostgreSQL / Neon)

CREATE TABLE students (
  id      serial PRIMARY KEY,
  seat_no integer NOT NULL UNIQUE,
  active  boolean NOT NULL DEFAULT true
);

CREATE TABLE daily_notes (
  id   serial PRIMARY KEY,
  date date NOT NULL,
  text text NOT NULL,
  seq  integer NOT NULL
);
CREATE INDEX idx_daily_notes_date ON daily_notes(date);

CREATE TABLE attendance_records (
  date       date NOT NULL,
  student_id integer NOT NULL REFERENCES students(id),
  status     smallint NOT NULL DEFAULT 0 CHECK (status BETWEEN 0 AND 3), -- 0=未 1=到 2=缺 3=假
  PRIMARY KEY (date, student_id)
);

CREATE TABLE assignments (
  id   serial PRIMARY KEY,
  date date NOT NULL,
  name text NOT NULL,
  seq  integer NOT NULL
);
CREATE INDEX idx_assignments_date ON assignments(date);

CREATE TABLE homework_submissions (
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    integer NOT NULL REFERENCES students(id),
  missing       boolean NOT NULL DEFAULT false, -- true = 缺交
  PRIMARY KEY (assignment_id, student_id)
);

CREATE TABLE teachers (
  id            serial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL
);

CREATE TABLE parents (
  id            serial PRIMARY KEY,
  student_id    integer NOT NULL UNIQUE REFERENCES students(id),
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL
);
