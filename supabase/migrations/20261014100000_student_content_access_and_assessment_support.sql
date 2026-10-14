-- Assessment support (additive). Lesson/resource RLS for enrolled students is already
-- live (migration enrolled_students_can_view_lessons). Quiz/exam questions stay hidden
-- from students; they are served and graded by /api/student/assessments (service role).
ALTER TABLE public.student_quiz_attempts ALTER COLUMN lesson_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.student_quiz_attempts (quiz_id);
