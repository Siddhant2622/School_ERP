-- ==============================================================================
-- Enhanced International School ERP - PostgreSQL Schema
-- Run this in the Supabase SQL Editor
-- ==============================================================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'teacher', 'student', 'parent');
CREATE TYPE exam_type AS ENUM ('midterm', 'final', 'unit_test', 'annual');
CREATE TYPE fee_status AS ENUM ('paid', 'partial', 'unpaid', 'overdue');
CREATE TYPE payment_method AS ENUM ('cash', 'bank', 'online', 'cheque');
CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'graded', 'late');

-- 2. CORE TABLES
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_number TEXT
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(), -- Link to auth.users in Supabase
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_name TEXT NOT NULL, 
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL 
);

CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT NOT NULL 
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT
);

-- Maps which teacher teaches what subject to a specific class/section
CREATE TABLE class_subject_teacher_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(class_id, section_id, subject_id, teacher_id)
);

CREATE TABLE students (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  roll_no TEXT,
  admission_no TEXT UNIQUE,
  date_of_birth DATE,
  gender TEXT
);

CREATE TABLE parents (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  mobile_number TEXT NOT NULL,
  occupation TEXT
);

CREATE TABLE teachers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  qualification TEXT,
  joining_date DATE
);

-- 3. FEE MANAGEMENT MODULE
CREATE TABLE fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  fee_type TEXT, 
  amount NUMERIC NOT NULL,
  due_date DATE,
  late_fee_per_day NUMERIC DEFAULT 0
);

CREATE TABLE fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE RESTRICT,
  amount_paid NUMERIC,
  payment_date DATE,
  payment_method payment_method,
  transaction_id TEXT,
  status fee_status,
  discount_amount NUMERIC DEFAULT 0,
  late_fee_applied NUMERIC DEFAULT 0,
  receipt_number TEXT UNIQUE,
  collected_by UUID REFERENCES users(id),
  academic_year_id UUID REFERENCES academic_years(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fee_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_mobile TEXT NOT NULL,
  message_sent TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT CHECK (delivery_status IN ('sent','delivered','failed')),
  reminder_type TEXT CHECK (reminder_type IN ('manual','scheduled','auto')),
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 4. ASSIGNMENT MODULE
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  total_marks INTEGER,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submission_text TEXT,
  attachment_url TEXT,
  marks_obtained INTEGER,
  feedback TEXT,
  status submission_status DEFAULT 'pending',
  UNIQUE(assignment_id, student_id)
);

-- 5. RESULT MANAGEMENT WITH LOCKS
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  exam_type exam_type,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  marks_obtained NUMERIC,
  total_marks NUMERIC,
  grade TEXT,
  remarks TEXT,
  entered_by UUID REFERENCES users(id),
  last_edited_by UUID REFERENCES users(id),
  last_edited_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE result_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  exam_type exam_type,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES users(id),
  is_locked BOOLEAN DEFAULT FALSE,
  UNIQUE(class_id, exam_type, academic_year_id)
);

-- 6. ATTENDANCE & COMMUNICATION
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- 1. RESULTS: Students can only see their own PAID + PUBLISHED results
CREATE POLICY "student_result_view" ON results
  FOR SELECT USING (
    (auth.uid() = student_id)
    AND (is_published = TRUE)
    AND EXISTS (
      SELECT 1 FROM fee_payments fp
      WHERE fp.student_id = results.student_id
      AND fp.status = 'paid'
      AND fp.academic_year_id = results.academic_year_id
    )
  );

-- 2. RESULTS: Admins and Super Admins can access all results
CREATE POLICY "admin_full_result_access" ON results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- 3. RESULTS: Teachers can access results if it's unlocked and they teach the subject
CREATE POLICY "teacher_result_access" ON results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'
    )
    AND NOT EXISTS (
      SELECT 1 FROM result_locks rl
      JOIN students s ON s.class_id = rl.class_id
      WHERE s.id = results.student_id 
      AND rl.exam_type = results.exam_type
      AND rl.academic_year_id = results.academic_year_id
      AND rl.is_locked = TRUE
    )
  );

-- 4. ASSIGNMENTS: Students can view assignments for their class/section
CREATE POLICY "student_assignment_view" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s 
      WHERE s.id = auth.uid() 
      AND s.class_id = assignments.class_id 
      AND s.section_id = assignments.section_id
    )
  );

-- 5. ASSIGNMENTS: Teachers can manage their own assignments
CREATE POLICY "teacher_assignment_manage" ON assignments
  FOR ALL USING (
    teacher_id = auth.uid()
  );

-- 6. SUBMISSIONS: Students can manage their own submissions
CREATE POLICY "student_submission_manage" ON assignment_submissions
  FOR ALL USING (
    student_id = auth.uid()
  );

-- 7. SUBMISSIONS: Teachers can view and grade submissions for their assignments
CREATE POLICY "teacher_submission_manage" ON assignment_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_submissions.assignment_id
      AND a.teacher_id = auth.uid()
    )
  );

-- Note: For development, you may want to add policies to allow broad access if you haven't wired up Auth fully.
-- Uncomment below to bypass RLS during initial frontend development:

/*
CREATE POLICY "dev_allow_all" ON users FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON results FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON assignments FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON assignment_submissions FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON fee_payments FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON fee_structures FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON fee_reminders FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON attendance FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON classes FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON sections FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON subjects FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON students FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON teachers FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON parents FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON result_locks FOR ALL USING (true);
CREATE POLICY "dev_allow_all" ON academic_years FOR ALL USING (true);
*/
