-- ============================================================
-- Sri Guru Nanak Public School ERP
-- Complete Supabase PostgreSQL Schema
-- Paste this entire file into your Supabase SQL Editor and click Run
-- ============================================================

-- 1. ADMINS
CREATE TABLE admins (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLASSES
CREATE TABLE classes (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_name TEXT NOT NULL DEFAULT '',
    section    TEXT DEFAULT '',
    room_no    TEXT
);

-- 3. TEACHERS
CREATE TABLE teachers (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL UNIQUE,
    phone         TEXT,
    subject       TEXT,
    qualification TEXT,
    salary        NUMERIC(10,2) DEFAULT 0,
    password      TEXT NOT NULL DEFAULT 'teacher123',
    joining_date  DATE DEFAULT CURRENT_DATE
);

-- 4. STUDENTS
CREATE TABLE students (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL UNIQUE,
    password      TEXT NOT NULL DEFAULT 'student123',
    class_id      BIGINT REFERENCES classes(id) ON DELETE SET NULL,
    roll_no       TEXT,
    admission_no  TEXT,
    father_name   TEXT,
    mother_name   TEXT,
    parent_phone  TEXT,
    parent_email  TEXT,
    address       TEXT,
    date_of_birth DATE,
    gender        TEXT
);

-- 5. CLASS_TEACHERS
CREATE TABLE class_teachers (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id   BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    UNIQUE(class_id, teacher_id)
);

-- 6. CLASS_SUBJECTS
CREATE TABLE class_subjects (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id     BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    subject_code TEXT
);

-- 7. SUBJECT_TEACHERS
CREATE TABLE subject_teachers (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id     BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id   BIGINT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    UNIQUE(class_id, subject_name)
);

-- 8. EXAMS
CREATE TABLE exams (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          TEXT NOT NULL DEFAULT '',
    term          TEXT,
    academic_year TEXT,
    start_date    DATE,
    end_date      DATE,
    class_id      BIGINT REFERENCES classes(id) ON DELETE SET NULL,
    status        TEXT DEFAULT 'scheduled',
    is_published  BOOLEAN DEFAULT FALSE
);

-- 9. MARKS
CREATE TABLE marks (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_id      BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id   BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    pt1          INT DEFAULT 0,
    nb1          INT DEFAULT 0,
    se1          INT DEFAULT 0,
    ma1          INT DEFAULT 0,
    hf           INT DEFAULT 0,
    pt2          INT DEFAULT 0,
    nb2          INT DEFAULT 0,
    se2          INT DEFAULT 0,
    ma2          INT DEFAULT 0,
    ann          INT DEFAULT 0,
    UNIQUE(exam_id, student_id, subject_name)
);

-- 10. ATTENDANCE
CREATE TABLE attendance (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date       DATE NOT NULL DEFAULT CURRENT_DATE,
    status     TEXT NOT NULL DEFAULT 'present',
    UNIQUE(student_id, date)
);

-- 11. FEES
CREATE TABLE fees (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_type   TEXT,
    amount     NUMERIC(10,2) DEFAULT 0,
    due_date   DATE,
    month      TEXT,
    year       TEXT,
    status     TEXT DEFAULT 'pending',
    paid_at    TIMESTAMPTZ,
    receipt_no TEXT
);

-- 12. NOTICES
CREATE TABLE notices (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT '',
    content         TEXT,
    category        TEXT,
    target_audience TEXT DEFAULT 'all',
    published_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TIMETABLE
CREATE TABLE timetable (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id     BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    day_of_week  TEXT NOT NULL,
    period       INT NOT NULL DEFAULT 1,
    subject      TEXT,
    teacher_id   BIGINT REFERENCES teachers(id) ON DELETE SET NULL,
    start_time   TIME,
    end_time     TIME
);

-- 14. SUBJECTS_MASTER
CREATE TABLE subjects_master (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subject_name TEXT NOT NULL UNIQUE,
    subject_code TEXT,
    description  TEXT,
    is_graded    BOOLEAN DEFAULT FALSE,
    is_active    BOOLEAN DEFAULT TRUE
);

-- 15. PROMOTIONS_LOG
CREATE TABLE promotions_log (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id    BIGINT REFERENCES students(id) ON DELETE SET NULL,
    from_class    BIGINT REFERENCES classes(id) ON DELETE SET NULL,
    to_class      BIGINT REFERENCES classes(id) ON DELETE SET NULL,
    academic_year TEXT,
    promoted_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 16. USERS
CREATE TABLE users (
    id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email    TEXT NOT NULL UNIQUE,
    role     TEXT NOT NULL DEFAULT 'admin',
    password TEXT NOT NULL
);

-- 17. SUBJECTS
CREATE TABLE subjects (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL
);

-- 18. ASSIGN_SUBJECT_TEACHER
CREATE TABLE assign_subject_teacher (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subject_id BIGINT REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id BIGINT REFERENCES teachers(id) ON DELETE CASCADE,
    class_id   BIGINT REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(subject_id, teacher_id, class_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_marks_exam ON marks(exam_id);
CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_fees_student ON fees(student_id);
CREATE INDEX idx_fees_status ON fees(status);
CREATE INDEX idx_timetable_class ON timetable(class_id);
CREATE INDEX idx_subject_teachers_class ON subject_teachers(class_id);
CREATE INDEX idx_subject_teachers_teacher ON subject_teachers(teacher_id);

-- ============================================================
-- SEED DATA: Default admin + sample subjects
-- ============================================================
INSERT INTO admins (name, email, password) VALUES ('Admin', 'admin@sgnps.com', 'admin123');
INSERT INTO users (email, role, password) VALUES ('admin@sgnps.com', 'admin', 'admin123');

-- Sample subjects
INSERT INTO subjects_master (subject_name, subject_code, is_graded, is_active) VALUES
  ('English', 'ENG', FALSE, TRUE),
  ('Hindi', 'HIN', FALSE, TRUE),
  ('Mathematics', 'MAT', FALSE, TRUE),
  ('Science', 'SCI', FALSE, TRUE),
  ('Social Studies', 'SST', FALSE, TRUE),
  ('Computer', 'COM', TRUE, TRUE),
  ('Drawing', 'DRW', TRUE, TRUE),
  ('G.K.', 'GK', TRUE, TRUE),
  ('Punjabi', 'PUN', FALSE, TRUE),
  ('Moral Science', 'MSC', TRUE, TRUE);

-- Sample classes
INSERT INTO classes (class_name, section) VALUES
  ('Class 1', 'A'), ('Class 1', 'B'),
  ('Class 2', 'A'), ('Class 2', 'B'),
  ('Class 3', 'A'), ('Class 3', 'B'),
  ('Class 4', 'A'), ('Class 5', 'A'),
  ('Class 6', 'A'), ('Class 7', 'A'),
  ('Class 8', 'A'), ('Class 9', 'A'),
  ('Class 10', 'A');

-- ============================================================
-- DISABLE RLS FOR DEVELOPMENT (Enable in production!)
-- ============================================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assign_subject_teacher ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for development (REPLACE with proper RLS in production)
CREATE POLICY "Allow all access" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON class_teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON class_subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON subject_teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON fees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON notices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON timetable FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON subjects_master FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON promotions_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON assign_subject_teacher FOR ALL USING (true) WITH CHECK (true);
