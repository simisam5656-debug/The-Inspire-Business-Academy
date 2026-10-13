-- ==============================================================================
-- THE INSPIRE BUSINESS ACADEMY
-- Migration 003: Physical Academy Operations & Admin Core
-- Target: Supabase PostgreSQL (Phase 5 Operations)
-- ==============================================================================

-- 1. PHYSICAL STUDENTS TABLE
-- Dedicated physical academy student records (managed by Academy Staff/Admin).
-- Physical students do NOT require an auth.users account.
CREATE TABLE IF NOT EXISTS public.physical_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_code TEXT NOT NULL UNIQUE, -- e.g. IBA-PHY-2026-001 or roll number
    full_name TEXT NOT NULL,
    guardian_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    course_slug TEXT NOT NULL,
    course_title TEXT NOT NULL,
    batch_title TEXT DEFAULT 'Regular Batch',
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_fee >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'left')),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_physical_students_code ON public.physical_students(student_id_code);
CREATE INDEX IF NOT EXISTS idx_physical_students_course ON public.physical_students(course_slug);
CREATE INDEX IF NOT EXISTS idx_physical_students_status ON public.physical_students(status);
CREATE INDEX IF NOT EXISTS idx_physical_students_phone ON public.physical_students(phone);
CREATE INDEX IF NOT EXISTS idx_physical_students_admission ON public.physical_students(admission_id);

-- 2. PHYSICAL ATTENDANCE TABLE
-- Daily attendance for physical students
CREATE TABLE IF NOT EXISTS public.physical_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.physical_students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
    notes TEXT,
    marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Prevent duplicate attendance for the same student on the same date
    CONSTRAINT uq_physical_attendance_student_date UNIQUE (student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_physical_attendance_date ON public.physical_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_physical_attendance_student ON public.physical_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_physical_attendance_status ON public.physical_attendance(status);

-- 3. PHYSICAL FEE PAYMENTS TABLE
-- Tracks fee payments made by physical academy students
CREATE TABLE IF NOT EXISTS public.physical_fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES public.physical_students(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other')),
    reference_note TEXT,
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.physical_fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON public.physical_fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt ON public.physical_fee_payments(receipt_number);

-- 4. ACADEMY EXPENSES TABLE
-- Track operational costs (utilities, rent, lab equipment, stationery, tea, marketing)
CREATE TABLE IF NOT EXISTS public.academy_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('rent', 'utilities', 'lab_equipment', 'stationery', 'refreshment', 'marketing', 'salary', 'maintenance', 'other')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    receipt_reference TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_academy_expenses_date ON public.academy_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_academy_expenses_category ON public.academy_expenses(category);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - STRICT PRIVILEGE BOUNDARIES
-- ==============================================================================

ALTER TABLE public.physical_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_expenses ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Physical Students Policies
-- Only Staff (super_admin, manager) can view, insert, update
-- Super Admin only can delete
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view physical students" ON public.physical_students;
CREATE POLICY "Staff can view physical students"
    ON public.physical_students
    FOR SELECT
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can insert physical students" ON public.physical_students;
CREATE POLICY "Staff can insert physical students"
    ON public.physical_students
    FOR INSERT
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can update physical students" ON public.physical_students;
CREATE POLICY "Staff can update physical students"
    ON public.physical_students
    FOR UPDATE
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Super admin can delete physical students" ON public.physical_students;
CREATE POLICY "Super admin can delete physical students"
    ON public.physical_students
    FOR DELETE
    USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- Attendance Policies
-- Staff can view, insert, update
-- Super Admin can delete
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view physical attendance" ON public.physical_attendance;
CREATE POLICY "Staff can view physical attendance"
    ON public.physical_attendance
    FOR SELECT
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can mark physical attendance" ON public.physical_attendance;
CREATE POLICY "Staff can mark physical attendance"
    ON public.physical_attendance
    FOR INSERT
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can update physical attendance" ON public.physical_attendance;
CREATE POLICY "Staff can update physical attendance"
    ON public.physical_attendance
    FOR UPDATE
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Super admin can delete physical attendance" ON public.physical_attendance;
CREATE POLICY "Super admin can delete physical attendance"
    ON public.physical_attendance
    FOR DELETE
    USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- Fee Payments Policies
-- Staff can view and record payments
-- Super Admin only can modify or delete financial ledger entries
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view physical fee payments" ON public.physical_fee_payments;
CREATE POLICY "Staff can view physical fee payments"
    ON public.physical_fee_payments
    FOR SELECT
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can record physical fee payments" ON public.physical_fee_payments;
CREATE POLICY "Staff can record physical fee payments"
    ON public.physical_fee_payments
    FOR INSERT
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Super admin can update physical fee payments" ON public.physical_fee_payments;
CREATE POLICY "Super admin can update physical fee payments"
    ON public.physical_fee_payments
    FOR UPDATE
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can delete physical fee payments" ON public.physical_fee_payments;
CREATE POLICY "Super admin can delete physical fee payments"
    ON public.physical_fee_payments
    FOR DELETE
    USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- Expenses Policies
-- Staff can view and insert expenses
-- Super Admin only can update or delete expenses
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view expenses" ON public.academy_expenses;
CREATE POLICY "Staff can view expenses"
    ON public.academy_expenses
    FOR SELECT
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can record expenses" ON public.academy_expenses;
CREATE POLICY "Staff can record expenses"
    ON public.academy_expenses
    FOR INSERT
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Super admin can update expenses" ON public.academy_expenses;
CREATE POLICY "Super admin can update expenses"
    ON public.academy_expenses
    FOR UPDATE
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can delete expenses" ON public.academy_expenses;
CREATE POLICY "Super admin can delete expenses"
    ON public.academy_expenses
    FOR DELETE
    USING (public.is_super_admin());
