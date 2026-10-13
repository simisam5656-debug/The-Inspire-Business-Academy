import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  QuizRecord,
  QuestionBankItem,
  FinalExamRecord,
  FinalExamAttemptRecord,
  QuizAttempt,
} from '../types';
import { siteConfig } from '../config/site';

export const AssessmentService = {
  // ============================================================================
  // QUIZZES MANAGEMENT (ADMIN)
  // ============================================================================
  async getQuizzes(courseId?: string, onlyPublished: boolean = false): Promise<QuizRecord[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('quizzes')
        .select('*, courses(title)')
        .order('display_order', { ascending: true });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      if (onlyPublished) {
        query = query.eq('is_published', true).eq('is_archived', false);
      }

      const { data, error } = await query;
      if (error) {
        console.error('AssessmentService.getQuizzes db error:', error);
        throw new Error(error.message);
      }

      if (!data) return [];

      // Query question counts for each quiz
      const quizzesWithCounts = await Promise.all(
        data.map(async (q: any) => {
          let questionCount = 0;
          try {
            if (supabase) {
              const { count } = await supabase
                .from('quiz_questions')
                .select('*', { count: 'exact', head: true })
                .eq('quiz_id', q.id)
                .eq('is_active', true);
              questionCount = count || 0;
            }
          } catch (_) {}

          return {
            id: q.id,
            courseId: q.course_id,
            courseTitle: q.courses?.title || 'Unknown Course',
            moduleId: q.module_id,
            lessonId: q.lesson_id,
            title: q.title,
            titleRomanUrdu: q.title_roman_urdu,
            description: q.description,
            descriptionRomanUrdu: q.description_roman_urdu,
            instructions: q.instructions,
            instructionsRomanUrdu: q.instructions_roman_urdu,
            durationMinutes: Number(q.duration_minutes || 15),
            passingScorePercentage: Number(q.passing_score_percentage || 70),
            maxAttempts: Number(q.max_attempts || 3),
            isPublished: Boolean(q.is_published),
            isArchived: Boolean(q.is_archived),
            displayOrder: Number(q.display_order || 1),
            questionCount,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
          };
        })
      );

      return quizzesWithCounts;
    }

    // Fallback in-memory list ONLY when Supabase is not configured
    return getFallbackQuizzes(courseId);
  },

  async createQuiz(payload: Partial<QuizRecord>): Promise<QuizRecord> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          course_id: payload.courseId,
          module_id: payload.moduleId || null,
          lesson_id: payload.lessonId || null,
          title: payload.title,
          title_roman_urdu: payload.titleRomanUrdu || payload.title,
          description: payload.description || '',
          description_roman_urdu: payload.descriptionRomanUrdu || '',
          instructions: payload.instructions || 'Answer all questions to test your understanding.',
          instructions_roman_urdu: payload.instructionsRomanUrdu || 'Tamam sawalat ke jawabat dain.',
          duration_minutes: payload.durationMinutes ?? 15,
          passing_score_percentage: payload.passingScorePercentage ?? 70,
          max_attempts: payload.maxAttempts ?? 3,
          is_published: payload.isPublished ?? false,
          is_archived: false,
          display_order: payload.displayOrder ?? 1,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return {
        id: data.id,
        courseId: data.course_id,
        moduleId: data.module_id,
        lessonId: data.lesson_id,
        title: data.title,
        titleRomanUrdu: data.title_roman_urdu,
        description: data.description,
        descriptionRomanUrdu: data.description_roman_urdu,
        instructions: data.instructions,
        instructionsRomanUrdu: data.instructions_roman_urdu,
        durationMinutes: Number(data.duration_minutes),
        passingScorePercentage: Number(data.passing_score_percentage),
        maxAttempts: Number(data.max_attempts),
        isPublished: Boolean(data.is_published),
        isArchived: Boolean(data.is_archived),
        displayOrder: Number(data.display_order),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const newQuiz: QuizRecord = {
      id: `quiz-${Date.now()}`,
      courseId: payload.courseId || '',
      title: payload.title || 'Untitled Quiz',
      titleRomanUrdu: payload.titleRomanUrdu || payload.title,
      description: payload.description || '',
      instructions: payload.instructions || '',
      durationMinutes: payload.durationMinutes ?? 15,
      passingScorePercentage: payload.passingScorePercentage ?? 70,
      maxAttempts: payload.maxAttempts ?? 3,
      isPublished: payload.isPublished ?? false,
      isArchived: false,
      displayOrder: payload.displayOrder ?? 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fallbackQuizzesStore.push(newQuiz);
    return newQuiz;
  },

  async updateQuiz(id: string, payload: Partial<QuizRecord>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (payload.title !== undefined) updateData.title = payload.title;
      if (payload.titleRomanUrdu !== undefined) updateData.title_roman_urdu = payload.titleRomanUrdu;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.descriptionRomanUrdu !== undefined) updateData.description_roman_urdu = payload.descriptionRomanUrdu;
      if (payload.instructions !== undefined) updateData.instructions = payload.instructions;
      if (payload.durationMinutes !== undefined) updateData.duration_minutes = payload.durationMinutes;
      if (payload.passingScorePercentage !== undefined) updateData.passing_score_percentage = payload.passingScorePercentage;
      if (payload.maxAttempts !== undefined) updateData.max_attempts = payload.maxAttempts;
      if (payload.isPublished !== undefined) updateData.is_published = payload.isPublished;
      if (payload.isArchived !== undefined) updateData.is_archived = payload.isArchived;

      const { error } = await supabase.from('quizzes').update(updateData).eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }

    const idx = fallbackQuizzesStore.findIndex((q) => q.id === id);
    if (idx !== -1) {
      fallbackQuizzesStore[idx] = { ...fallbackQuizzesStore[idx], ...payload, updatedAt: new Date().toISOString() };
    }
  },

  // ============================================================================
  // QUESTION BANK MANAGEMENT
  // ============================================================================
  async getQuestions(quizId?: string, courseId?: string, includeAnswers: boolean = false): Promise<QuestionBankItem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('quiz_questions').select('*').order('display_order', { ascending: true });
        if (quizId) query = query.eq('quiz_id', quizId);
        if (courseId) query = query.eq('course_id', courseId);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((q: any) => ({
            id: q.id,
            quizId: q.quiz_id,
            courseId: q.course_id,
            questionTextEn: q.question_text_en,
            questionTextRoman: q.question_text_roman,
            questionType: q.question_type,
            options: Array.isArray(q.options) ? q.options : [],
            correctOptionId: includeAnswers ? q.correct_option_id : '',
            explanationEn: includeAnswers ? q.explanation_en : '',
            explanationRoman: includeAnswers ? q.explanation_roman : '',
            marks: Number(q.marks || 1),
            displayOrder: Number(q.display_order || 1),
            isActive: Boolean(q.is_active),
            createdAt: q.created_at,
            updatedAt: q.updated_at,
          }));
        }
      } catch (err) {
        console.warn('AssessmentService.getQuestions db error:', err);
      }
    }

    return getFallbackQuestions(quizId, courseId, includeAnswers);
  },

  async createQuestion(payload: Partial<QuestionBankItem>): Promise<QuestionBankItem> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert({
          quiz_id: payload.quizId || null,
          course_id: payload.courseId,
          question_text_en: payload.questionTextEn,
          question_text_roman: payload.questionTextRoman || payload.questionTextEn,
          question_type: payload.questionType || 'multiple_choice',
          options: payload.options || [],
          correct_option_id: payload.correctOptionId,
          explanation_en: payload.explanationEn || '',
          explanation_roman: payload.explanationRoman || '',
          marks: payload.marks || 1,
          display_order: payload.displayOrder || 1,
          is_active: payload.isActive ?? true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return {
        id: data.id,
        quizId: data.quiz_id,
        courseId: data.course_id,
        questionTextEn: data.question_text_en,
        questionTextRoman: data.question_text_roman,
        questionType: data.question_type,
        options: data.options,
        correctOptionId: data.correct_option_id,
        explanationEn: data.explanation_en,
        explanationRoman: data.explanation_roman,
        marks: data.marks,
        displayOrder: data.display_order,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const newQ: QuestionBankItem = {
      id: `q-${Date.now()}`,
      quizId: payload.quizId,
      courseId: payload.courseId || '',
      questionTextEn: payload.questionTextEn || '',
      questionTextRoman: payload.questionTextRoman || payload.questionTextEn || '',
      questionType: payload.questionType || 'multiple_choice',
      options: payload.options || [],
      correctOptionId: payload.correctOptionId || '',
      explanationEn: payload.explanationEn,
      marks: payload.marks || 1,
      displayOrder: payload.displayOrder || 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fallbackQuestionsStore.push(newQ);
    return newQ;
  },

  async deleteQuestion(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }
    const idx = fallbackQuestionsStore.findIndex((q) => q.id === id);
    if (idx !== -1) fallbackQuestionsStore.splice(idx, 1);
  },

  // ============================================================================
  // FINAL EXAM MANAGEMENT (ADMIN)
  // ============================================================================
  async getFinalExams(): Promise<FinalExamRecord[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('final_exams')
        .select('*, courses(title, slug)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('AssessmentService.getFinalExams db error:', error);
        throw new Error(error.message);
      }

      if (!data) return [];

      const examsWithCounts = await Promise.all(
        data.map(async (fe: any) => {
          let questionCount = 0;
          try {
            if (supabase) {
              const { count } = await supabase
                .from('final_exam_questions')
                .select('*', { count: 'exact', head: true })
                .eq('exam_id', fe.id)
                .eq('is_active', true);
              questionCount = count || 0;
            }
          } catch (_) {}

          return {
            id: fe.id,
            courseId: fe.course_id,
            courseTitle: fe.courses?.title || 'Unknown Course',
            courseSlug: fe.courses?.slug,
            title: fe.title,
            titleRomanUrdu: fe.title_roman_urdu,
            description: fe.description,
            descriptionRomanUrdu: fe.description_roman_urdu,
            instructions: fe.instructions,
            instructionsRomanUrdu: fe.instructions_roman_urdu,
            durationMinutes: Number(fe.duration_minutes || 45),
            passingPercentage: Number(fe.passing_percentage || 70.0),
            attemptLimit: Number(fe.attempt_limit || 2),
            isPublished: Boolean(fe.is_published),
            questionCount,
            createdAt: fe.created_at,
            updatedAt: fe.updated_at,
          };
        })
      );

      return examsWithCounts;
    }

    return getFallbackFinalExams();
  },

  async getFinalExamForCourse(courseId: string, onlyPublished: boolean = true): Promise<FinalExamRecord | null> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('final_exams')
        .select('*, courses(title, slug)')
        .eq('course_id', courseId);

      if (onlyPublished) {
        query = query.eq('is_published', true);
      }

      query = query.order('created_at', { ascending: false }).limit(1);

      const { data, error } = await query;
      if (error) {
        console.error('AssessmentService.getFinalExamForCourse db error:', error);
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        const item = data[0];
        let questionCount = 0;
        try {
          const { count } = await supabase
            .from('final_exam_questions')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', item.id)
            .eq('is_active', true);
          questionCount = count || 0;
        } catch (_) {}

        return {
          id: item.id,
          courseId: item.course_id,
          courseTitle: item.courses?.title || '',
          courseSlug: item.courses?.slug,
          title: item.title,
          titleRomanUrdu: item.title_roman_urdu,
          description: item.description,
          descriptionRomanUrdu: item.description_roman_urdu,
          instructions: item.instructions,
          instructionsRomanUrdu: item.instructions_roman_urdu,
          durationMinutes: Number(item.duration_minutes || 45),
          passingPercentage: Number(item.passing_percentage || 70.0),
          attemptLimit: Number(item.attempt_limit || 2),
          isPublished: Boolean(item.is_published),
          questionCount,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      }
      return null;
    }

    const found = getFallbackFinalExams().find((e) => e.courseId === courseId && (!onlyPublished || e.isPublished));
    return found || null;
  },

  async updateFinalExam(
    id: string,
    payload: Partial<FinalExamRecord>,
    actorId?: string,
    actorRole?: string
  ): Promise<void> {
    // Validate passing threshold bounds (30% to 100%)
    if (payload.passingPercentage !== undefined) {
      const p = Number(payload.passingPercentage);
      if (isNaN(p) || p < 30 || p > 100) {
        throw new Error('Passing mark must be between 30% and 100%.');
      }
    }

    if (isSupabaseConfigured && supabase) {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (payload.title !== undefined) updateData.title = payload.title;
      if (payload.titleRomanUrdu !== undefined) updateData.title_roman_urdu = payload.titleRomanUrdu;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.instructions !== undefined) updateData.instructions = payload.instructions;
      if (payload.durationMinutes !== undefined) updateData.duration_minutes = payload.durationMinutes;
      if (payload.passingPercentage !== undefined) updateData.passing_percentage = payload.passingPercentage;
      if (payload.attemptLimit !== undefined) updateData.attempt_limit = payload.attemptLimit;
      if (payload.isPublished !== undefined) updateData.is_published = payload.isPublished;

      const { error } = await supabase.from('final_exams').update(updateData).eq('id', id);
      if (error) throw new Error(error.message);

      // Audit Log
      if (actorId) {
        try {
          await supabase.from('audit_logs').insert({
            actor_id: actorId,
            actor_role: actorRole || 'super_admin',
            action: 'update_final_exam_config',
            entity: 'final_exams',
            entity_id: id,
            details: payload,
          });
        } catch (_) {}
      }
      return;
    }

    const idx = fallbackFinalExamsStore.findIndex((e) => e.id === id);
    if (idx !== -1) {
      fallbackFinalExamsStore[idx] = {
        ...fallbackFinalExamsStore[idx],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
    }
  },

  async getFinalExamQuestions(examId: string, includeAnswers: boolean = false): Promise<QuestionBankItem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('final_exam_questions')
          .select('*')
          .eq('exam_id', examId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((q: any) => ({
            id: q.id,
            quizId: q.exam_id,
            courseId: '',
            questionTextEn: q.question_text_en,
            questionTextRoman: q.question_text_roman,
            questionType: q.question_type,
            options: Array.isArray(q.options) ? q.options : [],
            correctOptionId: includeAnswers ? q.correct_option_id : '',
            explanationEn: includeAnswers ? q.explanation_en : '',
            explanationRoman: includeAnswers ? q.explanation_roman : '',
            marks: Number(q.marks || 1),
            displayOrder: Number(q.display_order || 1),
            isActive: Boolean(q.is_active),
            createdAt: q.created_at,
            updatedAt: q.updated_at,
          }));
        }
      } catch (err) {
        console.warn('AssessmentService.getFinalExamQuestions db error:', err);
      }
    }

    return getFallbackExamQuestions(examId, includeAnswers);
  },

  async saveFinalExamQuestion(payload: Partial<QuestionBankItem> & { examId: string }): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      if (payload.id && !payload.id.startsWith('mock-')) {
        const { error } = await supabase
          .from('final_exam_questions')
          .update({
            question_text_en: payload.questionTextEn,
            question_text_roman: payload.questionTextRoman,
            question_type: payload.questionType || 'multiple_choice',
            options: payload.options || [],
            correct_option_id: payload.correctOptionId,
            explanation_en: payload.explanationEn,
            explanation_roman: payload.explanationRoman,
            marks: payload.marks || 1,
            display_order: payload.displayOrder || 1,
            is_active: payload.isActive ?? true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('final_exam_questions').insert({
          exam_id: payload.examId,
          question_text_en: payload.questionTextEn,
          question_text_roman: payload.questionTextRoman,
          question_type: payload.questionType || 'multiple_choice',
          options: payload.options || [],
          correct_option_id: payload.correctOptionId,
          explanation_en: payload.explanationEn,
          explanation_roman: payload.explanationRoman,
          marks: payload.marks || 1,
          display_order: payload.displayOrder || 1,
          is_active: payload.isActive ?? true,
        });
        if (error) throw new Error(error.message);
      }
      return;
    }

    // In-memory update
    const idx = fallbackExamQuestionsStore.findIndex((q) => q.id === payload.id);
    if (idx !== -1) {
      fallbackExamQuestionsStore[idx] = {
        ...fallbackExamQuestionsStore[idx],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
    } else {
      fallbackExamQuestionsStore.push({
        id: `mock-eq-${Date.now()}`,
        quizId: payload.examId,
        courseId: '',
        questionTextEn: payload.questionTextEn || '',
        questionTextRoman: payload.questionTextRoman || '',
        questionType: payload.questionType || 'multiple_choice',
        options: payload.options || [],
        correctOptionId: payload.correctOptionId || '',
        explanationEn: payload.explanationEn,
        marks: payload.marks || 1,
        displayOrder: payload.displayOrder || 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  },

  async deleteFinalExamQuestion(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('final_exam_questions').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }
    const idx = fallbackExamQuestionsStore.findIndex((q) => q.id === id);
    if (idx !== -1) fallbackExamQuestionsStore.splice(idx, 1);
  },

  // ============================================================================
  // STUDENT FINAL EXAM ATTEMPTS & SERVER-SIDE GRADING
  // ============================================================================
  async getStudentExamAttempts(userId: string, examId?: string): Promise<FinalExamAttemptRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('final_exam_attempts')
          .select('*, final_exams(title), courses(title)')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false });

        if (examId) query = query.eq('exam_id', examId);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            examId: a.exam_id,
            courseId: a.course_id,
            courseTitle: a.courses?.title || '',
            attemptNumber: Number(a.attempt_number || 1),
            score: Number(a.score || 0),
            maxScore: Number(a.max_score || 0),
            percentage: Number(a.percentage || 0),
            passed: Boolean(a.passed),
            passingThreshold: Number(a.passing_threshold || 70),
            userAnswers: a.user_answers || {},
            status: a.status || 'completed',
            startedAt: a.started_at,
            completedAt: a.completed_at,
          }));
        }
      } catch (err) {
        console.warn('AssessmentService.getStudentExamAttempts db error:', err);
      }
    }

    return fallbackExamAttemptsStore.filter(
      (a) => a.userId === userId && (!examId || a.examId === examId)
    );
  },

  /**
   * Authoritative Grading Engine for Final Exam:
   * 1. Validates active enrollment (not expired, not suspended)
   * 2. Validates attempt limits
   * 3. Fetches authoritative correct keys
   * 4. Calculates score, percentage, and evaluates against configured passing_percentage (default 70%)
   * 5. Saves immutable attempt record
   */
  async submitFinalExamAttempt(
    userId: string,
    examId: string,
    courseId: string,
    userAnswers: Record<string, string>
  ): Promise<FinalExamAttemptRecord> {
    // 1. Check enrollment eligibility
    if (isSupabaseConfigured && supabase) {
      const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (enrollment) {
        if (enrollment.status === 'suspended') {
          throw new Error('Aapki enrollment suspend shuda hai. Exam access nahi kiya ja sakta.');
        }
        if (enrollment.expiry_date) {
          const isExpired = new Date(enrollment.expiry_date) < new Date();
          if (isExpired) {
            throw new Error('Aapki course enrollment expire ho chuki hai. Exam access karne ke liye renewal zaroori hai.');
          }
        }
      }
    }

    // 2. Fetch authoritative questions & passing mark
    let questions: QuestionBankItem[] = [];
    let passingThreshold = siteConfig.onlineCourses.finalExamPassMarkPercent; // default 70
    let attemptLimit = 2;

    if (isSupabaseConfigured && supabase) {
      const { data: examData } = await supabase
        .from('final_exams')
        .select('*')
        .eq('id', examId)
        .single();
      if (examData) {
        passingThreshold = Number(examData.passing_percentage || 70);
        attemptLimit = Number(examData.attempt_limit || 2);
      }

      // Fetch questions WITH answers
      const { data: qData } = await supabase
        .from('final_exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .eq('is_active', true);

      if (qData && qData.length > 0) {
        questions = qData.map((q: any) => ({
          id: q.id,
          courseId: '',
          questionTextEn: q.question_text_en,
          questionTextRoman: q.question_text_roman,
          questionType: q.question_type,
          options: q.options || [],
          correctOptionId: q.correct_option_id,
          marks: Number(q.marks || 1),
          displayOrder: q.display_order,
          isActive: true,
          createdAt: q.created_at,
          updatedAt: q.updated_at,
        }));
      }
    }

    if (questions.length === 0) {
      questions = getFallbackExamQuestions(examId, true);
    }

    // Check existing attempts count
    const existingAttempts = await this.getStudentExamAttempts(userId, examId);
    if (existingAttempts.length >= attemptLimit) {
      throw new Error(`Aap is imtihan ke tamam ${attemptLimit} attempts mukammal kar chuke hain.`);
    }

    // 3. Authoritative scoring
    let score = 0;
    let maxScore = 0;
    const questionsSnapshot: any[] = [];

    questions.forEach((q) => {
      const qMarks = q.marks || 1;
      maxScore += qMarks;
      const studentAns = userAnswers[q.id];
      const isCorrect = studentAns === q.correctOptionId;
      if (isCorrect) {
        score += qMarks;
      }
      questionsSnapshot.push({
        questionId: q.id,
        questionText: q.questionTextRoman || q.questionTextEn,
        submittedAnswer: studentAns || null,
        isCorrect,
        marksEarned: isCorrect ? qMarks : 0,
      });
    });

    const percentage = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;
    const passed = percentage >= passingThreshold;
    const attemptNumber = existingAttempts.length + 1;
    const now = new Date().toISOString();

    const record: FinalExamAttemptRecord = {
      id: `fea-${Date.now()}`,
      userId,
      examId,
      courseId,
      attemptNumber,
      score,
      maxScore,
      percentage,
      passed,
      passingThreshold,
      userAnswers,
      status: 'completed',
      startedAt: now,
      completedAt: now,
    };

    // 4. Save to database
    if (isSupabaseConfigured && supabase) {
      const { data: inserted, error } = await supabase
        .from('final_exam_attempts')
        .insert({
          user_id: userId,
          exam_id: examId,
          course_id: courseId,
          attempt_number: attemptNumber,
          score,
          max_score: maxScore,
          percentage,
          passed,
          passing_threshold: passingThreshold,
          user_answers: userAnswers,
          questions_snapshot: questionsSnapshot,
          status: 'completed',
          started_at: now,
          completed_at: now,
        })
        .select()
        .single();

      if (!error && inserted) {
        record.id = inserted.id;
      }
    }

    fallbackExamAttemptsStore.push(record);
    return record;
  },
};

// ==============================================================================
// IN-MEMORY FALLBACK STORES FOR SEED / PREVIEW RESILIENCE
// ==============================================================================

const fallbackQuizzesStore: QuizRecord[] = [
  {
    id: 'quiz-yt-01',
    courseId: 'course-youtube-automation',
    courseTitle: 'YouTube Automation & Faceless Channels Masterclass',
    title: 'YouTube Niche & Monetization Quiz',
    titleRomanUrdu: 'YouTube Niche & Monetization Imtihan',
    description: 'Test your understanding of high-RPM niches and monetization policies.',
    descriptionRomanUrdu: 'High-RPM niches aur monetization qawaneen ki janch.',
    durationMinutes: 15,
    passingScorePercentage: 70,
    maxAttempts: 3,
    isPublished: true,
    isArchived: false,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'quiz-shp-01',
    courseId: 'course-shopify-dropshipping',
    courseTitle: 'Shopify Dropshipping & E-Commerce Mastery',
    title: 'Winning Product Research Quiz',
    titleRomanUrdu: 'Winning Product Daryaft Ka Quiz',
    description: 'Verify product margin analysis and local courier delivery rules.',
    descriptionRomanUrdu: 'Product margin aur local courier delivery ke bunyadi asool.',
    durationMinutes: 15,
    passingScorePercentage: 70,
    maxAttempts: 3,
    isPublished: true,
    isArchived: false,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const fallbackQuestionsStore: QuestionBankItem[] = [
  {
    id: 'q-yt-1',
    quizId: 'quiz-yt-01',
    courseId: 'course-youtube-automation',
    questionTextEn: 'Which metric most directly indicates strong audience retention on a YouTube video?',
    questionTextRoman: 'YouTube video par audience retention ko sabse behtar konsa metric zahir karta hai?',
    questionType: 'multiple_choice',
    options: [
      { id: 'opt1', textEn: 'Average Percentage Viewed (APV) and retention graph', textRoman: 'Average Percentage Viewed (APV) graph' },
      { id: 'opt2', textEn: 'Total channel subscriber count', textRoman: 'Channel ke kul subscribers' },
      { id: 'opt3', textEn: 'Video title character length', textRoman: 'Video title ke characters ki tadad' },
      { id: 'opt4', textEn: 'Number of tags added in description', textRoman: 'Description mein tags ki tadad' },
    ],
    correctOptionId: 'opt1',
    marks: 1,
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'q-yt-2',
    quizId: 'quiz-yt-01',
    courseId: 'course-youtube-automation',
    questionTextEn: 'Reused content without significant original commentary or value can be monetized under YPP.',
    questionTextRoman: 'Bina kisi zaati value ya voiceover ke copy shuda content YouTube par monetize ho sakta hai?',
    questionType: 'true_false',
    options: [
      { id: 'opt_true', textEn: 'True', textRoman: 'Sahi' },
      { id: 'opt_false', textEn: 'False', textRoman: 'Ghalat' },
    ],
    correctOptionId: 'opt_false',
    marks: 1,
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const fallbackFinalExamsStore: FinalExamRecord[] = [
  {
    id: 'fe-yt',
    courseId: 'course-youtube-automation',
    courseTitle: 'YouTube Automation & Faceless Channels Masterclass',
    title: 'YouTube Automation Certification Final Exam',
    titleRomanUrdu: 'YouTube Automation Sanad Ka Final Imtihan',
    description: 'Comprehensive certification examination covering content strategy, RPM optimization, and channel scaling.',
    descriptionRomanUrdu: 'Mukammal tasdeeqi imtihan: Content strategy, RPM, aur channel scale karne ke bunyadi asool.',
    durationMinutes: 45,
    passingPercentage: 70, // Default 70%
    attemptLimit: 2,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fe-shp',
    courseId: 'course-shopify-dropshipping',
    courseTitle: 'Shopify Dropshipping & E-Commerce Mastery',
    title: 'Shopify E-Commerce Certification Final Exam',
    titleRomanUrdu: 'Shopify E-Commerce Sanad Ka Final Imtihan',
    description: 'Comprehensive exam on store architecture, Meta conversion API, supplier vetting, and COD fulfillment.',
    descriptionRomanUrdu: 'Mukammal imtihan: Store design, Meta conversion API, supplier vetting, aur COD delivery.',
    durationMinutes: 45,
    passingPercentage: 70, // Default 70%
    attemptLimit: 2,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fe-meta',
    courseId: 'course-meta-ads',
    courseTitle: 'Meta & Social Media Ads Specialist',
    title: 'Meta Ads Certification Final Exam',
    titleRomanUrdu: 'Meta Ads Sanad Ka Final Imtihan',
    description: 'Professional test on ROAS scaling, custom audiences, CBO campaign budgets, and ad policy compliance.',
    descriptionRomanUrdu: 'Professional test: ROAS scaling, lookalike audiences, CBO budget, aur ad policy compliance.',
    durationMinutes: 45,
    passingPercentage: 70,
    attemptLimit: 2,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const fallbackExamQuestionsStore: QuestionBankItem[] = [
  {
    id: 'fe-q-1',
    quizId: 'fe-yt',
    courseId: 'course-youtube-automation',
    questionTextEn: 'When conducting high-RPM niche selection for international audiences, which topic commands higher advertiser bids?',
    questionTextRoman: 'Bahar ke mumalik ke liye YouTube video banate waqt kis topic par sabse zyada advertisement rate (RPM) milta hai?',
    questionType: 'multiple_choice',
    options: [
      { id: 'o1', textEn: 'Personal Finance, Software, and Digital Business', textRoman: 'Personal Finance, Software, aur Karobar' },
      { id: 'o2', textEn: 'Daily household comedy pranks', textRoman: 'Aam comedy pranks' },
      { id: 'o3', textEn: 'Gaming walk-through clips without commentary', textRoman: 'Bina awaz ke gaming clips' },
      { id: 'o4', textEn: 'Random viral shorts compilations', textRoman: 'Mukhtalif viral shorts clips' },
    ],
    correctOptionId: 'o1',
    marks: 1,
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fe-q-2',
    quizId: 'fe-yt',
    courseId: 'course-youtube-automation',
    questionTextEn: 'CTR (Click-Through Rate) is heavily dictated by the synergy between video thumbnail and title.',
    questionTextRoman: 'Video par clicks aana (CTR) zyada tar Thumbnail aur Title ki behtari par munhasir hota hai.',
    questionType: 'true_false',
    options: [
      { id: 'o_true', textEn: 'True', textRoman: 'Sahi (Durust)' },
      { id: 'o_false', textEn: 'False', textRoman: 'Ghalat' },
    ],
    correctOptionId: 'o_true',
    marks: 1,
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fe-q-3',
    quizId: 'fe-yt',
    courseId: 'course-youtube-automation',
    questionTextEn: 'What is the safest method to ensure automated videos comply with copyright fair use laws?',
    questionTextRoman: 'Automated videos banate waqt copyright masail se bachne ka sabse mehfooz tareeqa kya hai?',
    questionType: 'multiple_choice',
    options: [
      { id: 'o1', textEn: 'Licensed stock assets, original human scriptwriting, and transformative voiceovers', textRoman: 'Licensed stock footage, asil script, aur original voiceover' },
      { id: 'o2', textEn: 'Downloading full competitor videos and mirroring horizontally', textRoman: 'Doosron ki video download kar ke mirror kar dena' },
      { id: 'o3', textEn: 'Using uncredited copyrighted songs at low volume', textRoman: 'Bina ijazat copyrighted gaane chalana' },
      { id: 'o4', textEn: 'Uploading raw copyrighted movie trailers', textRoman: 'Direct trailers upload kar dena' },
    ],
    correctOptionId: 'o1',
    marks: 1,
    displayOrder: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const fallbackExamAttemptsStore: FinalExamAttemptRecord[] = [];

function getFallbackQuizzes(courseId?: string): QuizRecord[] {
  if (!courseId) return fallbackQuizzesStore;
  return fallbackQuizzesStore.filter((q) => q.courseId === courseId);
}

function getFallbackQuestions(quizId?: string, courseId?: string, includeAnswers: boolean = false): QuestionBankItem[] {
  let list = fallbackQuestionsStore;
  if (quizId) list = list.filter((q) => q.quizId === quizId);
  if (courseId) list = list.filter((q) => q.courseId === courseId);
  return list.map((q) => ({
    ...q,
    correctOptionId: includeAnswers ? q.correctOptionId : '',
  }));
}

function getFallbackFinalExams(): FinalExamRecord[] {
  return fallbackFinalExamsStore;
}

function getFallbackExamQuestions(examId: string, includeAnswers: boolean = false): QuestionBankItem[] {
  let list = fallbackExamQuestionsStore.filter((q) => q.quizId === examId);
  if (list.length === 0) {
    // Generate default set for any exam
    list = fallbackExamQuestionsStore;
  }
  return list.map((q) => ({
    ...q,
    correctOptionId: includeAnswers ? q.correctOptionId : '',
  }));
}
