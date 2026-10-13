import {
  StudentEnrollment,
  StudentLessonProgress,
  StudentNote,
  QuizQuestion,
  QuizAttempt,
  CertificateEligibility,
  CourseCMS,
  CourseLesson,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CourseService } from './courseService';

// Sample pre-built quiz bank for academy lessons
const CURATED_QUIZ_BANK: Record<string, QuizQuestion[]> = {
  default: [
    {
      id: 'q1',
      questionEn: 'What is the minimum watch time requirement for the standard YouTube Partner Program (YPP)?',
      questionRoman: 'YouTube Partner Program (YPP) ke liye kam az kam kitne ghante watch time darkar hota hai?',
      options: [
        { id: 'opt-a', textEn: '1,000 Watch Hours in 12 months', textRoman: '1,000 Ghante 12 maah mein' },
        { id: 'opt-b', textEn: '4,000 Watch Hours in the past 365 days', textRoman: 'Guzishta 365 dino mein 4,000 Ghante' },
        { id: 'opt-c', textEn: '10,000 Watch Hours all time', textRoman: 'Kul 10,000 Ghante' },
        { id: 'opt-d', textEn: '500 Watch Hours in 90 days', textRoman: '90 dino mein 500 Ghante' },
      ],
      correctOptionId: 'opt-b',
      explanationEn: 'The classic monetization threshold requires 1,000 subscribers and 4,000 valid public watch hours in the last 12 months.',
      explanationRoman: 'Classic monetization ke liye pichle 12 maah mein 1,000 subscribers aur 4,000 public watch hours mukammal hone zaroori hain.',
    },
    {
      id: 'q2',
      questionEn: 'Which metric has the strongest direct impact on YouTube CTR (Click-Through Rate)?',
      questionRoman: 'YouTube par CTR (Click-Through Rate) par sab se zyada kis cheez ka asar hota hai?',
      options: [
        { id: 'opt-a', textEn: 'Video File Bitrate', textRoman: 'Video File ka Bitrate' },
        { id: 'opt-b', textEn: 'Thumbnail visual contrast and compelling title packaging', textRoman: 'Thumbnail ka wazeh design aur pur-kashish title' },
        { id: 'opt-c', textEn: 'Number of tags added in description', textRoman: 'Description mein likhe gaye tags ki tadaad' },
        { id: 'opt-d', textEn: 'Microphone brand used for recording', textRoman: 'Recording mic ka brand' },
      ],
      correctOptionId: 'opt-b',
      explanationEn: 'The thumbnail and title package determines whether a viewer clicks your impression.',
      explanationRoman: 'Thumbnail aur title hi faisla karte hain ke viewer aapki video par click karega ya aage scroll kar jayega.',
    },
    {
      id: 'q3',
      questionEn: 'Why is it critical to retain viewers during the first 30 seconds (hook) of a video?',
      questionRoman: 'Video ke pehle 30 seconds (Hook) mein dekhne walon ko roke rakhna kyun ahem hai?',
      options: [
        { id: 'opt-a', textEn: 'To prevent YouTube comments from disabling', textRoman: 'Comments band hone se bachane ke liye' },
        { id: 'opt-b', textEn: 'High early retention signals value to the algorithm and pushes wider impressions', textRoman: 'Shuruat ka high retention algorithm ko ishara deta hai ke video qabil-e-deed hai' },
        { id: 'opt-c', textEn: 'It immediately earns double AdSense CPM', textRoman: 'Is se foran do-guna AdSense milta hai' },
        { id: 'opt-d', textEn: 'It reduces internet bandwidth for the user', textRoman: 'Is se user ka internet data kam kharch hota hai' },
      ],
      correctOptionId: 'opt-b',
      explanationEn: 'The algorithm uses the retention drop-off curve in the first 30 seconds to gauge initial interest.',
      explanationRoman: 'Pehle 30 seconds ki retention girne na paye to algorithm video ko barhi tadaad tak pohnchata hai.',
    },
  ],
};

const STORAGE_KEY_PROGRESS = 'iba_student_progress_data';
const STORAGE_KEY_NOTES = 'iba_student_notes_data';
const STORAGE_KEY_QUIZZES = 'iba_student_quiz_attempts';
const STORAGE_KEY_ENROLLMENTS = 'iba_student_enrollments_data';

/**
 * Calculates progress percentage safely between 0 and 100
 */
export function calculateProgressPercentage(completedCount: number, totalCount: number): number {
  if (!totalCount || totalCount <= 0) return 0;
  if (!completedCount || completedCount <= 0) return 0;
  return Math.min(100, Math.round((completedCount / totalCount) * 100));
}

export const StudentLmsService = {
  /**
   * Get all active enrollments for a student
   */
  async getEnrolledCourses(userId: string): Promise<StudentEnrollment[]> {
    if (!userId) return [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          user_id,
          course_id,
          status,
          progress_percentage,
          last_accessed_lesson_id,
          last_accessed_at,
          enrolled_at,
          completed_at,
          start_date,
          expiry_date,
          student_code,
          courses:course_id (
            id,
            slug,
            title
          )
        `)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message || 'Failed to fetch enrollments from database');
      }

      const today = new Date().toISOString().split('T')[0];
      return (data || []).map((row: any) => {
        const isPastExpiry = row.expiry_date ? row.expiry_date < today : false;
        return {
          id: row.id,
          userId: row.user_id,
          courseId: row.course_id,
          courseSlug: row.courses?.slug || 'youtube-monetization',
          courseTitle: row.courses?.title || 'Course',
          status: row.status,
          startDate: row.start_date || row.enrolled_at?.split('T')[0],
          expiryDate: row.expiry_date,
          isExpired: isPastExpiry,
          studentCode: row.student_code,
          progressPercentage: Number(row.progress_percentage || 0),
          lastAccessedLessonId: row.last_accessed_lesson_id,
          lastAccessedAt: row.last_accessed_at,
          enrolledAt: row.enrolled_at,
          completedAt: row.completed_at,
        };
      });
    }

    // Only provision demo enrollment if DEMO MODE is explicitly enabled
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      const localData = localStorage.getItem(STORAGE_KEY_ENROLLMENTS);
      let enrollments: StudentEnrollment[] = [];
      if (localData) {
        try {
          enrollments = JSON.parse(localData).filter((e: StudentEnrollment) => e.userId === userId);
        } catch (e) {
          enrollments = [];
        }
      }

      if (enrollments.length === 0) {
        const allCourses = await CourseService.getAllCourses();
        const firstCourse = allCourses.find((c: CourseCMS) => c.status === 'published') || allCourses[0];
        if (firstCourse) {
          const defaultEnrollment: StudentEnrollment = {
            id: `enr-${userId.slice(0, 8)}-${firstCourse.id}`,
            userId,
            courseId: firstCourse.id,
            courseSlug: firstCourse.slug,
            courseTitle: firstCourse.title,
            status: 'active',
            startDate: new Date().toISOString().split('T')[0],
            expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            isExpired: false,
            studentCode: 'IBA-DEMO-001',
            enrolledAt: new Date().toISOString(),
            progressPercentage: 25,
            lastAccessedLessonId: 'les-1',
            lastAccessedAt: new Date().toISOString(),
          };

          const existingAll = localData ? JSON.parse(localData) : [];
          existingAll.push(defaultEnrollment);
          localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(existingAll));
          enrollments = [defaultEnrollment];
        }
      }

      return enrollments;
    }

    return [];
  },

  /**
   * Enroll a student into a specific course
   */
  async enrollInCourse(userId: string, course: CourseCMS): Promise<StudentEnrollment> {
    const enrollment: StudentEnrollment = {
      id: `enr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      progressPercentage: 0,
      lastAccessedLessonId: undefined,
      lastAccessedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('student_enrollments').upsert({
        id: enrollment.id,
        user_id: userId,
        course_id: course.id,
        status: 'active',
        progress_percentage: 0,
        enrolled_at: enrollment.enrolledAt,
      });
      if (error) {
        throw new Error(error.message || 'Failed to enroll in course in database');
      }
      return enrollment;
    }

    const localData = localStorage.getItem(STORAGE_KEY_ENROLLMENTS);
    const existingAll: StudentEnrollment[] = localData ? JSON.parse(localData) : [];
    const index = existingAll.findIndex((e) => e.userId === userId && e.courseId === course.id);
    if (index >= 0) {
      existingAll[index] = enrollment;
    } else {
      existingAll.push(enrollment);
    }
    localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(existingAll));

    return enrollment;
  },

  /**
   * Get all completed lesson IDs for a student in a course
   */
  async getLessonProgress(userId: string, courseId: string): Promise<Record<string, StudentLessonProgress>> {
    const progressMap: Record<string, StudentLessonProgress> = {};

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('student_lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) {
        throw new Error(error.message || 'Failed to fetch lesson progress from database');
      }

      if (data) {
        data.forEach((row: any) => {
          progressMap[row.lesson_id] = {
            id: row.id,
            userId: row.user_id,
            courseId: row.course_id,
            lessonId: row.lesson_id,
            isCompleted: row.is_completed,
            completedAt: row.completed_at,
            lastPlayedSeconds: row.last_played_seconds || 0,
            updatedAt: row.updated_at,
          };
        });
      }
      return progressMap;
    }

    // Local fallback
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) {
      try {
        const list: StudentLessonProgress[] = JSON.parse(raw);
        list
          .filter((p) => p.userId === userId && p.courseId === courseId)
          .forEach((p) => {
            progressMap[p.lessonId] = p;
          });
      } catch (e) {
        console.warn(e);
      }
    }

    return progressMap;
  },

  /**
   * Toggle completion state of a lesson and update overall course progress percentage
   */
  async toggleLessonProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    completed: boolean,
    totalCourseLessons: number,
    lastPlayedSeconds?: number
  ): Promise<{ isCompleted: boolean; newPercentage: number }> {
    const timestamp = new Date().toISOString();

    // 1. If Supabase configured, read/write ONLY Supabase
    if (isSupabaseConfigured && supabase) {
      const progressPayload: Record<string, any> = {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        is_completed: completed,
        completed_at: completed ? timestamp : null,
        updated_at: timestamp,
      };
      if (typeof lastPlayedSeconds === 'number') {
        progressPayload.last_played_seconds = lastPlayedSeconds;
      }

      const { error: progErr } = await supabase
        .from('student_lesson_progress')
        .upsert(progressPayload, { onConflict: 'user_id,lesson_id' });

      if (progErr) {
        throw new Error(progErr.message || 'Failed to update lesson progress in database');
      }

      // Recompute progress from real count of completed published lessons
      // Lessons belong to modules: course_lessons.module_id -> course_modules.course_id
      // Published flag is is_published on both course_lessons and course_modules
      const { data: publishedModules, error: modulesErr } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', courseId)
        .eq('is_published', true);

      if (modulesErr) {
        console.warn('Could not query published modules:', modulesErr);
      }

      const publishedModuleIds = (publishedModules || []).map((m: any) => m.id);

      let publishedLessons: { id: string }[] | null = null;
      if (publishedModuleIds.length > 0) {
        const { data: lessons, error: lessonsErr } = await supabase
          .from('course_lessons')
          .select('id')
          .in('module_id', publishedModuleIds)
          .eq('is_published', true);

        if (lessonsErr) {
          console.warn('Could not query published lessons:', lessonsErr);
        } else {
          publishedLessons = lessons;
        }
      } else {
        publishedLessons = [];
      }

      const { data: completedList, error: countErr } = await supabase
        .from('student_lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('is_completed', true);

      if (countErr) {
        throw new Error(countErr.message || 'Failed to count completed lessons');
      }

      const publishedCount = publishedLessons && publishedLessons.length > 0
        ? publishedLessons.length
        : totalCourseLessons;

      let completedPublishedCount = (completedList || []).length;
      if (publishedLessons && publishedLessons.length > 0) {
        const pubIds = new Set(publishedLessons.map((l: any) => l.id));
        completedPublishedCount = (completedList || []).filter((c: any) => pubIds.has(c.lesson_id)).length;
      }

      const newPercentage = calculateProgressPercentage(completedPublishedCount, publishedCount);

      const { error: enrErr } = await supabase
        .from('student_enrollments')
        .update({
          progress_percentage: newPercentage,
          last_accessed_lesson_id: lessonId,
          last_accessed_at: timestamp,
          status: newPercentage === 100 ? 'completed' : 'active',
          completed_at: newPercentage === 100 ? timestamp : null,
        })
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (enrErr) {
        throw new Error(enrErr.message || 'Failed to update enrollment progress in database');
      }

      return { isCompleted: completed, newPercentage };
    }

    // Local storage path ONLY for demo mode
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    let list: StudentLessonProgress[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((p) => p.userId === userId && p.lessonId === lessonId);

    if (idx >= 0) {
      list[idx].isCompleted = completed;
      list[idx].completedAt = completed ? timestamp : null;
      list[idx].updatedAt = timestamp;
      if (typeof lastPlayedSeconds === 'number') {
        list[idx].lastPlayedSeconds = lastPlayedSeconds;
      }
    } else {
      list.push({
        id: `prog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId,
        courseId,
        lessonId,
        isCompleted: completed,
        completedAt: completed ? timestamp : null,
        lastPlayedSeconds: typeof lastPlayedSeconds === 'number' ? lastPlayedSeconds : 0,
        updatedAt: timestamp,
      });
    }
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(list));

    // Calculate new progress percentage
    const courseCompletedCount = list.filter(
      (p) => p.userId === userId && p.courseId === courseId && p.isCompleted
    ).length;

    const newPercentage = calculateProgressPercentage(courseCompletedCount, totalCourseLessons);

    // Update enrollment progress percentage locally
    const rawEnr = localStorage.getItem(STORAGE_KEY_ENROLLMENTS);
    if (rawEnr) {
      const enrs: StudentEnrollment[] = JSON.parse(rawEnr);
      const enrIdx = enrs.findIndex((e) => e.userId === userId && e.courseId === courseId);
      if (enrIdx >= 0) {
        enrs[enrIdx].progressPercentage = newPercentage;
        enrs[enrIdx].lastAccessedLessonId = lessonId;
        enrs[enrIdx].lastAccessedAt = timestamp;
        if (newPercentage === 100) {
          enrs[enrIdx].status = 'completed';
          enrs[enrIdx].completedAt = timestamp;
        }
        localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(enrs));
      }
    }

    return { isCompleted: completed, newPercentage };
  },

  /**
   * Get personal note for a lesson
   */
  async getLessonNote(userId: string, lessonId: string): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('student_notes')
        .select('note_text')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to fetch lesson note from database');
      }

      return data?.note_text || '';
    }

    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    if (raw) {
      try {
        const notes: StudentNote[] = JSON.parse(raw);
        const found = notes.find((n) => n.userId === userId && n.lessonId === lessonId);
        return found ? found.noteText : '';
      } catch (e) {
        return '';
      }
    }
    return '';
  },

  /**
   * Save personal note for a lesson
   */
  async saveLessonNote(
    userId: string,
    courseId: string,
    lessonId: string,
    noteText: string,
    lessonTitle?: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('student_notes').upsert({
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        note_text: noteText,
        updated_at: timestamp,
      }, { onConflict: 'user_id,lesson_id' });

      if (error) {
        throw new Error(error.message || 'Failed to save note in database');
      }
      return;
    }

    // Local storage path ONLY for demo mode
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    let notes: StudentNote[] = raw ? JSON.parse(raw) : [];
    const idx = notes.findIndex((n) => n.userId === userId && n.lessonId === lessonId);

    if (idx >= 0) {
      notes[idx].noteText = noteText;
      notes[idx].updatedAt = timestamp;
      if (lessonTitle) notes[idx].lessonTitle = lessonTitle;
    } else {
      notes.push({
        id: `note-${Date.now()}`,
        userId,
        courseId,
        lessonId,
        lessonTitle: lessonTitle || 'Lesson',
        noteText,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  },

  /**
   * Delete personal note for a lesson
   */
  async deleteLessonNote(userId: string, lessonId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('student_notes')
        .delete()
        .eq('user_id', userId)
        .eq('lesson_id', lessonId);

      if (error) {
        throw new Error(error.message || 'Failed to delete note from database');
      }
      return;
    }

    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    if (raw) {
      try {
        const notes: StudentNote[] = JSON.parse(raw);
        const filtered = notes.filter((n) => !(n.userId === userId && n.lessonId === lessonId));
        localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(filtered));
      } catch (e) {
        // ignore
      }
    }
  },

  /**
   * Get all personal notes for a user
   */
  async getAllStudentNotes(userId: string): Promise<StudentNote[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('student_notes')
        .select('*, course_lessons(title)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to fetch student notes from database');
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        courseId: d.course_id,
        lessonId: d.lesson_id,
        lessonTitle: d.course_lessons?.title || 'Lesson',
        noteText: d.note_text,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    }

    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    if (raw) {
      try {
        const notes: StudentNote[] = JSON.parse(raw);
        return notes
          .filter((n) => n.userId === userId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  /**
   * Get quiz for a lesson
   */
  getLessonQuiz(lessonId: string): QuizQuestion[] {
    return CURATED_QUIZ_BANK[lessonId] || CURATED_QUIZ_BANK.default;
  },

  /**
   * Submit and evaluate a quiz attempt
   */
  async submitQuizAttempt(
    userId: string,
    courseId: string,
    lessonId: string,
    userAnswers: Record<string, string>
  ): Promise<QuizAttempt> {
    const questions = this.getLessonQuiz(lessonId);
    let correctCount = 0;

    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctOptionId) {
        correctCount += 1;
      }
    });

    const score = correctCount;
    const maxScore = questions.length;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const passed = percentage >= 70; // 70% passing threshold as required

    const attempt: QuizAttempt = {
      id: `quiz-att-${Date.now()}`,
      userId,
      courseId,
      lessonId,
      score,
      maxScore,
      passed,
      userAnswers,
      completedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('student_quiz_attempts').insert({
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        score,
        max_score: maxScore,
        passed,
        user_answers: userAnswers,
        completed_at: attempt.completedAt,
      });

      if (error) {
        throw new Error(error.message || 'Failed to record quiz attempt in database');
      }
      return attempt;
    }

    // Store in localStorage for demo mode
    const raw = localStorage.getItem(STORAGE_KEY_QUIZZES);
    let attempts: QuizAttempt[] = raw ? JSON.parse(raw) : [];
    attempts = attempts.filter((a) => !(a.userId === userId && a.lessonId === lessonId));
    attempts.push(attempt);
    localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(attempts));

    return attempt;
  },

  /**
   * Get latest quiz attempt for a lesson
   */
  async getLatestQuizAttempt(userId: string, lessonId: string): Promise<QuizAttempt | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('student_quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to fetch quiz attempt');
      }

      if (!data) return null;
      return {
        id: data.id,
        userId: data.user_id,
        courseId: data.course_id,
        lessonId: data.lesson_id,
        score: data.score,
        maxScore: data.max_score,
        passed: data.passed,
        userAnswers: data.user_answers || {},
        completedAt: data.completed_at,
      };
    }

    const raw = localStorage.getItem(STORAGE_KEY_QUIZZES);
    if (raw) {
      try {
        const attempts: QuizAttempt[] = JSON.parse(raw);
        const match = attempts.find((a) => a.userId === userId && a.lessonId === lessonId);
        if (match) return match;
      } catch (e) {
        // ignore
      }
    }
    return null;
  },

  /**
   * Get all quiz attempts for a student in a course
   */
  async getAllStudentQuizAttempts(userId: string, courseId: string): Promise<QuizAttempt[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('student_quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('completed_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to fetch quiz attempts from database');
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        courseId: row.course_id,
        lessonId: row.lesson_id,
        score: row.score,
        maxScore: row.max_score,
        passed: row.passed,
        userAnswers: row.user_answers || {},
        completedAt: row.completed_at,
      }));
    }

    const raw = localStorage.getItem(STORAGE_KEY_QUIZZES);
    if (raw) {
      try {
        const attempts: QuizAttempt[] = JSON.parse(raw);
        return attempts.filter((a) => a.userId === userId && a.courseId === courseId);
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  /**
   * Check certificate eligibility for an enrolled student
   */
  async getCertificateEligibility(
    userId: string,
    courseId: string,
    courseTitle: string,
    allLessons: CourseLesson[]
  ): Promise<CertificateEligibility> {
    const progressMap = await this.getLessonProgress(userId, courseId);
    const completedCount = allLessons.filter((l) => progressMap[l.id]?.isCompleted).length;
    const totalLessons = allLessons.length;
    const lessonsCompleted = totalLessons > 0 && completedCount === totalLessons;

    const quizAttempts = await this.getAllStudentQuizAttempts(userId, courseId);
    const quizzesTaken = quizAttempts.length;
    const totalScorePct = quizzesTaken > 0
      ? quizAttempts.reduce((acc, q) => acc + (q.score / q.maxScore) * 100, 0) / quizzesTaken
      : 0;

    const quizAverageScore = Math.round(totalScorePct);
    const quizzesPassed = quizzesTaken > 0 && quizAverageScore >= 70;
    const isEligible = lessonsCompleted && (quizzesTaken === 0 || quizzesPassed);

    const certificateCode = isEligible
      ? `IBA-2026-${courseId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`
      : undefined;

    return {
      courseId,
      courseTitle,
      totalLessons,
      completedLessons: completedCount,
      lessonsCompleted,
      quizzesTaken,
      quizAverageScore,
      quizzesPassed,
      isEligible,
      certificateCode,
      issueDate: isEligible ? new Date().toISOString() : undefined,
    };
  },
};
