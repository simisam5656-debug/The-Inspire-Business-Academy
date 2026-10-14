import { authenticateStudent } from '../_lib/auth';

/**
 * Student quizzes + final exams.
 * Answer keys (correct_option_id) never leave the server; grading is done here
 * with the service-role client and attempts are stored server-side.
 *
 * POST body: { action, ... }
 *  list         -> { quizzes, exams } for the student's enrolled courses
 *  start        -> { kind: 'quiz'|'exam', id } -> questions without answers
 *  submit       -> { kind, id, answers: { [questionId]: optionId } } -> graded result
 */

const today = () => new Date().toISOString().slice(0, 10);

function stripQuestion(q: any) {
  return {
    id: q.id,
    textEn: q.question_text_en,
    textRoman: q.question_text_roman,
    type: q.question_type,
    options: q.options || [],
    marks: q.marks ?? 1,
  };
}

async function activeCourseIds(db: any, userId: string): Promise<string[]> {
  const { data } = await db
    .from('student_enrollments')
    .select('course_id, status, expiry_date')
    .eq('user_id', userId)
    .in('status', ['active', 'completed']);
  return (data || []).filter((e: any) => !e.expiry_date || e.expiry_date >= today()).map((e: any) => e.course_id);
}

export function gradeAnswers(questions: any[], answers: Record<string, string>) {
  let score = 0;
  let maxScore = 0;
  const review = questions.map((q) => {
    const marks = Number(q.marks ?? 1) || 1;
    maxScore += marks;
    const chosen = answers?.[q.id] ?? null;
    const correct = chosen !== null && String(chosen) === String(q.correct_option_id);
    if (correct) score += marks;
    return {
      questionId: q.id,
      textEn: q.question_text_en,
      textRoman: q.question_text_roman,
      options: q.options || [],
      chosen,
      correctOptionId: q.correct_option_id,
      isCorrect: correct,
      explanationEn: q.explanation_en || null,
      explanationRoman: q.explanation_roman || null,
    };
  });
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
  return { score, maxScore, percentage, review };
}

export default async function handler(req: any, res: any, dbClient?: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  const auth = await authenticateStudent(req, dbClient);
  if (!auth.authorized) return res.status(auth.statusCode || 401).json({ ok: false, error: auth.error });
  const db = auth.supabase;
  const userId = auth.userId!;
  const { action, kind, id, answers } = req.body || {};

  try {
    const courseIds = await activeCourseIds(db, userId);

    if (action === 'list') {
      if (courseIds.length === 0) return res.status(200).json({ ok: true, quizzes: [], exams: [] });

      const { data: quizzes } = await db
        .from('quizzes').select('*')
        .in('course_id', courseIds).eq('is_published', true).eq('is_archived', false)
        .order('display_order', { ascending: true });
      const { data: exams } = await db
        .from('final_exams').select('*').in('course_id', courseIds).eq('is_published', true);
      const { data: courses } = await db.from('courses').select('id, title').in('id', courseIds);
      const courseTitle = (cid: string) => (courses || []).find((c: any) => c.id === cid)?.title || '';

      const quizIds = (quizzes || []).map((q: any) => q.id);
      const examIds = (exams || []).map((e: any) => e.id);
      const { data: qCounts } = quizIds.length
        ? await db.from('quiz_questions').select('quiz_id').in('quiz_id', quizIds).eq('is_active', true) : { data: [] };
      const { data: eCounts } = examIds.length
        ? await db.from('final_exam_questions').select('exam_id').in('exam_id', examIds).eq('is_active', true) : { data: [] };
      const { data: qAttempts } = quizIds.length
        ? await db.from('student_quiz_attempts').select('id, quiz_id, attempt_number, score, max_score, percentage, passed, completed_at')
            .eq('user_id', userId).in('quiz_id', quizIds).order('completed_at', { ascending: false }) : { data: [] };
      const { data: eAttempts } = examIds.length
        ? await db.from('final_exam_attempts').select('id, exam_id, attempt_number, score, max_score, percentage, passed, completed_at')
            .eq('user_id', userId).in('exam_id', examIds).order('completed_at', { ascending: false }) : { data: [] };

      return res.status(200).json({
        ok: true,
        quizzes: (quizzes || []).map((q: any) => ({
          id: q.id, courseId: q.course_id, courseTitle: courseTitle(q.course_id), lessonId: q.lesson_id, moduleId: q.module_id,
          title: q.title, titleRomanUrdu: q.title_roman_urdu, description: q.description, descriptionRomanUrdu: q.description_roman_urdu,
          instructions: q.instructions, instructionsRomanUrdu: q.instructions_roman_urdu,
          durationMinutes: q.duration_minutes, passingPercentage: Number(q.passing_score_percentage), maxAttempts: q.max_attempts,
          questionCount: (qCounts || []).filter((x: any) => x.quiz_id === q.id).length,
          attempts: (qAttempts || []).filter((a: any) => a.quiz_id === q.id),
        })),
        exams: (exams || []).map((e: any) => ({
          id: e.id, courseId: e.course_id, courseTitle: courseTitle(e.course_id),
          title: e.title, titleRomanUrdu: e.title_roman_urdu, description: e.description, descriptionRomanUrdu: e.description_roman_urdu,
          instructions: e.instructions, instructionsRomanUrdu: e.instructions_roman_urdu,
          durationMinutes: e.duration_minutes, passingPercentage: Number(e.passing_percentage), attemptLimit: e.attempt_limit,
          questionCount: (eCounts || []).filter((x: any) => x.exam_id === e.id).length,
          attempts: (eAttempts || []).filter((a: any) => a.exam_id === e.id),
        })),
      });
    }

    if ((action === 'start' || action === 'submit') && (kind === 'quiz' || kind === 'exam') && id) {
      const isQuiz = kind === 'quiz';
      const { data: item } = await db.from(isQuiz ? 'quizzes' : 'final_exams').select('*').eq('id', id).maybeSingle();
      const published = item && item.is_published && !(isQuiz && item.is_archived);
      if (!item || !published) return res.status(404).json({ ok: false, error: 'Not found.' });
      if (!courseIds.includes(item.course_id)) {
        return res.status(403).json({ ok: false, error: 'You are not enrolled in this course.' });
      }

      const qTable = isQuiz ? 'quiz_questions' : 'final_exam_questions';
      const { data: questions } = await db.from(qTable).select('*')
        .eq(isQuiz ? 'quiz_id' : 'exam_id', id).eq('is_active', true).order('display_order', { ascending: true });
      if (!questions || questions.length === 0) {
        return res.status(409).json({ ok: false, error: 'This assessment has no questions yet.' });
      }

      const aTable = isQuiz ? 'student_quiz_attempts' : 'final_exam_attempts';
      const aKey = isQuiz ? 'quiz_id' : 'exam_id';
      const { data: prior } = await db.from(aTable).select('attempt_number').eq('user_id', userId).eq(aKey, id);
      const used = (prior || []).length;
      const limit = Number(isQuiz ? item.max_attempts : item.attempt_limit) || 1;
      if (used >= limit) return res.status(403).json({ ok: false, error: `Attempt limit reached (${limit}).` });

      if (action === 'start') {
        return res.status(200).json({
          ok: true,
          durationMinutes: item.duration_minutes,
          attemptNumber: used + 1,
          questions: questions.map(stripQuestion),
        });
      }

      const result = gradeAnswers(questions, answers || {});
      const passing = Number(isQuiz ? item.passing_score_percentage : item.passing_percentage);
      const passed = result.percentage >= passing;
      const row: any = {
        user_id: userId,
        course_id: item.course_id,
        attempt_number: used + 1,
        score: result.score,
        max_score: result.maxScore,
        percentage: result.percentage,
        passed,
        user_answers: answers || {},
        questions_snapshot: questions.map((q: any) => ({ id: q.id, text: q.question_text_en })),
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
      if (isQuiz) { row.quiz_id = id; row.lesson_id = item.lesson_id || null; }
      else { row.exam_id = id; row.passing_threshold = passing; }

      const { error: insErr } = await db.from(aTable).insert(row);
      if (insErr) {
        console.error('assessment attempt insert failed:', insErr.message);
        return res.status(500).json({ ok: false, error: 'Could not save your attempt.' });
      }
      return res.status(200).json({
        ok: true, score: result.score, maxScore: result.maxScore, percentage: result.percentage,
        passed, passingPercentage: passing, attemptNumber: used + 1, attemptsLeft: limit - used - 1, review: result.review,
      });
    }

    return res.status(400).json({ ok: false, error: 'Invalid request.' });
  } catch (err: any) {
    console.error('student assessments error:', err?.message);
    return res.status(500).json({ ok: false, error: 'Internal server error.' });
  }
}
