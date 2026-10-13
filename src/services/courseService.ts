import {
  CourseCMS,
  CourseModule,
  CourseLesson,
  LessonResource,
  CourseStatus,
  LessonResourceType,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { OFFICIAL_COURSES } from '../config/courses';
import { extractYouTubeVideoId } from '../utils/youtube';

/**
 * In-memory fallback repository for Course CMS when live Supabase credentials
 * are not yet provisioned in the current preview environment.
 */
let memoryCourses: CourseCMS[] = OFFICIAL_COURSES.map((oc, index) => ({
  id: oc.id,
  slug: oc.slug,
  title: oc.title,
  titleRomanUrdu: oc.titleRomanUrdu,
  shortDescription: oc.shortDescription,
  shortDescriptionRomanUrdu: oc.shortDescriptionRomanUrdu,
  fullDescription: oc.fullDescription,
  fullDescriptionRomanUrdu: oc.fullDescriptionRomanUrdu,
  thumbnailUrl: undefined,
  price: oc.price,
  durationValue: oc.durationMonths,
  durationUnit: 'months',
  category: oc.category,
  categoryLabel: oc.categoryLabel,
  isFeatured: oc.isFeatured,
  displayOrder: oc.displayOrder || index + 1,
  status: 'published' as CourseStatus,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  moduleCount: 3,
  lessonCount: 6,
}));

let memoryModules: CourseModule[] = [
  {
    id: 'mod-1',
    courseId: 'course-youtube-monetization',
    title: 'Module 1: Channel Foundation & High-CPM Niche Selection',
    titleRomanUrdu: 'Module 1: Channel ki Bunyad aur Niche ka Intikhab',
    description: 'Learn how to find profitable niches with low competition and high RPM.',
    displayOrder: 1,
    isPublished: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'mod-2',
    courseId: 'course-youtube-monetization',
    title: 'Module 2: Viral Scriptwriting, Voiceover & CapCut Workflow',
    titleRomanUrdu: 'Module 2: Scriptwriting, Voiceover aur Video Editing',
    description: 'End-to-end video production workflow with AI tools and editing speed hacks.',
    displayOrder: 2,
    isPublished: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'mod-3',
    courseId: 'course-youtube-monetization',
    title: 'Module 3: YouTube Studio SEO, Analytics & Monetization Rules',
    titleRomanUrdu: 'Module 3: Video SEO, Analytics aur Monetization Policies',
    description: 'Maximizing CTR with thumbnails, tags, retention graphs, and AdSense approval.',
    displayOrder: 3,
    isPublished: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

let memoryLessons: CourseLesson[] = [
  {
    id: 'les-1',
    moduleId: 'mod-1',
    title: 'Lesson 1.1: YouTube Algorithm & Monetization Requirements (2026)',
    titleRomanUrdu: 'Sabaq 1.1: YouTube Algorithm aur Kamai ke Sharaait',
    description: 'Understanding 4,000 watch hours, 1,000 subscribers, and YPP policies in Pakistan.',
    youtubeVideoId: 'dQw4w9WgXcQ', // Standard embed test ID
    durationMinutes: 24,
    displayOrder: 1,
    isFreePreview: true,
    isPublished: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'les-2',
    moduleId: 'mod-1',
    title: 'Lesson 1.2: Researching Evergreen & High-Paying Topics',
    titleRomanUrdu: 'Sabaq 1.2: Munafa-Bakhsh Topics aur Keyword Research',
    description: 'How to use Google Trends and vidIQ to validate video concepts before recording.',
    youtubeVideoId: 'dQw4w9WgXcQ',
    durationMinutes: 32,
    displayOrder: 2,
    isFreePreview: false,
    isPublished: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

let memoryResources: LessonResource[] = [
  {
    id: 'res-1',
    lessonId: 'les-1',
    title: 'Niche Evaluation Checklist (PDF/Notes)',
    resourceType: 'note',
    description: '10-point checklist before picking a YouTube channel direction.',
    contentText: '1. Passion & Skill Check\n2. Advertiser Demand (RPM > $2)\n3. Evergreen Audience\n4. Video Scalability\n5. Competition Analysis',
    displayOrder: 1,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'res-2',
    lessonId: 'les-1',
    title: 'ChatGPT Script Prompt Formula',
    resourceType: 'prompt',
    description: 'Master prompt to generate engaging 8-minute video outlines with hooks.',
    contentText: 'You are an expert YouTube content strategist. Write a high-retention 8-minute script about [TOPIC]. Include a hook in the first 10 seconds, followed by 3 actionable tips and a clear call-to-action.',
    displayOrder: 2,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'res-3',
    lessonId: 'les-1',
    title: 'vidIQ Keyword Tool',
    resourceType: 'tool',
    description: 'Browser extension for YouTube tag and search volume analysis.',
    externalUrl: 'https://vidiq.com',
    displayOrder: 3,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

export const CourseService = {
  // ============================================================================
  // COURSE OPERATIONS
  // ============================================================================

  async getCourses(filters?: {
    search?: string;
    status?: CourseStatus | 'all';
    featured?: boolean;
    availableForPhysical?: boolean;
    availableForOnline?: boolean;
  }): Promise<{ data: CourseCMS[]; error: string | null }> {
    try {
      if (isSupabaseConfigured && supabase) {
        let query = supabase
          .from('courses')
          .select(`
            id,
            slug,
            title,
            title_roman_urdu,
            short_description,
            short_description_roman_urdu,
            full_description,
            full_description_roman_urdu,
            image_url,
            thumbnail_url,
            is_most_popular,
            available_for_physical,
            available_for_online,
            online_price,
            online_duration_months,
            price,
            duration_value,
            duration_unit,
            category,
            category_label,
            is_featured,
            display_order,
            status,
            created_by,
            created_at,
            updated_at
          `)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.featured !== undefined) {
          query = query.eq('is_featured', filters.featured);
        }
        if (filters?.availableForPhysical !== undefined) {
          query = query.eq('available_for_physical', filters.availableForPhysical);
        }
        if (filters?.availableForOnline !== undefined) {
          query = query.eq('available_for_online', filters.availableForOnline);
        }
        if (filters?.search) {
          query = query.or(`title.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) {
          console.error('[CourseService] Live query failed:', error.message);
          return { data: [], error: error.message };
        } else if (data) {
          const mapped: CourseCMS[] = data.map((c: any) => ({
            id: c.id,
            slug: c.slug,
            title: c.title,
            titleRomanUrdu: c.title_roman_urdu,
            shortDescription: c.short_description,
            shortDescriptionRomanUrdu: c.short_description_roman_urdu,
            fullDescription: c.full_description,
            fullDescriptionRomanUrdu: c.full_description_roman_urdu,
            imageUrl: c.image_url || c.thumbnail_url || undefined,
            thumbnailUrl: c.image_url || c.thumbnail_url || undefined,
            isMostPopular: !!c.is_most_popular,
            availableForPhysical: c.available_for_physical !== undefined ? !!c.available_for_physical : true,
            availableForOnline: c.available_for_online !== undefined ? !!c.available_for_online : true,
            onlinePrice: c.online_price !== null && c.online_price !== undefined ? Number(c.online_price) : undefined,
            onlineDurationMonths: c.online_duration_months !== null && c.online_duration_months !== undefined ? Number(c.online_duration_months) : undefined,
            price: Number(c.price || 0),
            durationValue: Number(c.duration_value || 6),
            durationUnit: c.duration_unit || 'months',
            category: c.category || 'business',
            categoryLabel: c.category_label,
            isFeatured: !!c.is_featured,
            displayOrder: Number(c.display_order || 0),
            status: c.status as CourseStatus,
            createdBy: c.created_by,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
          return { data: mapped, error: null };
        }
      }

      // Memory filter fallback
      let result = [...memoryCourses];
      if (filters?.status && filters.status !== 'all') {
        result = result.filter((c) => c.status === filters.status);
      }
      if (filters?.featured !== undefined) {
        result = result.filter((c) => c.isFeatured === filters.featured);
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
        );
      }
      result.sort((a, b) => a.displayOrder - b.displayOrder);

      // Compute dynamic counts
      result = result.map((c) => ({
        ...c,
        moduleCount: memoryModules.filter((m) => m.courseId === c.id).length,
        lessonCount: memoryLessons.filter((l) =>
          memoryModules.filter((m) => m.courseId === c.id).map((m) => m.id).includes(l.moduleId)
        ).length,
      }));

      return { data: result, error: null };
    } catch (err: any) {
      return { data: [], error: err.message || 'Error fetching courses' };
    }
  },

  async getCourseById(id: string): Promise<{ data: CourseCMS | null; error: string | null }> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('[CourseService] Live get single failed:', error.message);
          return { data: null, error: error.message };
        } else if (data) {
          return {
            data: {
              id: data.id,
              slug: data.slug,
              title: data.title,
              titleRomanUrdu: data.title_roman_urdu,
              shortDescription: data.short_description,
              shortDescriptionRomanUrdu: data.short_description_roman_urdu,
              fullDescription: data.full_description,
              fullDescriptionRomanUrdu: data.full_description_roman_urdu,
              thumbnailUrl: data.thumbnail_url || undefined,
              isMostPopular: !!data.is_most_popular,
              availableForPhysical: data.available_for_physical !== undefined ? !!data.available_for_physical : true,
              availableForOnline: data.available_for_online !== undefined ? !!data.available_for_online : true,
              onlinePrice: data.online_price !== null && data.online_price !== undefined ? Number(data.online_price) : undefined,
              onlineDurationMonths: data.online_duration_months !== null && data.online_duration_months !== undefined ? Number(data.online_duration_months) : undefined,
              price: Number(data.price || 0),
              durationValue: Number(data.duration_value || 6),
              durationUnit: data.duration_unit || 'months',
              category: data.category || 'business',
              categoryLabel: data.category_label,
              isFeatured: !!data.is_featured,
              displayOrder: Number(data.display_order || 0),
              status: data.status,
              createdBy: data.created_by,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            },
            error: null,
          };
        }
      }

      const match = memoryCourses.find((c) => c.id === id);
      return { data: match || null, error: match ? null : 'Course not found' };
    } catch (err: any) {
      return { data: null, error: err.message || 'Error fetching course' };
    }
  },

  async createCourse(payload: {
    title: string;
    titleRomanUrdu?: string;
    slug: string;
    shortDescription: string;
    shortDescriptionRomanUrdu?: string;
    fullDescription?: string;
    fullDescriptionRomanUrdu?: string;
    price: number;
    durationValue: number;
    durationUnit: 'weeks' | 'months' | 'hours';
    category: string;
    categoryLabel?: string;
    isFeatured: boolean;
    displayOrder: number;
    status: CourseStatus;
    availableForPhysical?: boolean;
    availableForOnline?: boolean;
    actorId?: string;
  }): Promise<{ data: CourseCMS | null; error: string | null }> {
    try {
      // Slug normalization & sanitation
      const cleanSlug = payload.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!cleanSlug) {
        return { data: null, error: 'A valid alphanumeric slug is required.' };
      }

      const now = new Date().toISOString();

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('courses')
          .insert({
            slug: cleanSlug,
            title: payload.title.trim(),
            title_roman_urdu: payload.titleRomanUrdu?.trim() || null,
            short_description: payload.shortDescription.trim(),
            short_description_roman_urdu: payload.shortDescriptionRomanUrdu?.trim() || null,
            full_description: payload.fullDescription?.trim() || null,
            full_description_roman_urdu: payload.fullDescriptionRomanUrdu?.trim() || null,
            thumbnail_url: (payload as any).thumbnailUrl?.trim() || null,
            is_most_popular: !!(payload as any).isMostPopular,
            available_for_physical: payload.availableForPhysical !== undefined ? !!payload.availableForPhysical : true,
            available_for_online: payload.availableForOnline !== undefined ? !!payload.availableForOnline : true,
            online_price: (payload as any).onlinePrice !== undefined ? Number((payload as any).onlinePrice) : null,
            online_duration_months: (payload as any).onlineDurationMonths !== undefined ? Number((payload as any).onlineDurationMonths) : null,
            price: Math.max(0, Number(payload.price) || 0),
            duration_value: Math.max(1, Number(payload.durationValue) || 1),
            duration_unit: payload.durationUnit,
            category: payload.category || 'business',
            category_label: payload.categoryLabel || 'Business',
            is_featured: !!payload.isFeatured,
            display_order: Number(payload.displayOrder) || 0,
            status: payload.status,
            created_by: payload.actorId || null,
          })
          .select()
          .single();

        if (error) {
          console.error('[CourseService] DB insert failed:', error.message);
          return { data: null, error: error.message };
        } else if (data) {
          return {
            data: {
              id: data.id,
              slug: data.slug,
              title: data.title,
              titleRomanUrdu: data.title_roman_urdu,
              shortDescription: data.short_description,
              shortDescriptionRomanUrdu: data.short_description_roman_urdu,
              fullDescription: data.full_description,
              fullDescriptionRomanUrdu: data.full_description_roman_urdu,
              thumbnailUrl: data.thumbnail_url || undefined,
              isMostPopular: !!data.is_most_popular,
              availableForPhysical: data.available_for_physical !== undefined ? !!data.available_for_physical : true,
              availableForOnline: data.available_for_online !== undefined ? !!data.available_for_online : true,
              onlinePrice: data.online_price !== null && data.online_price !== undefined ? Number(data.online_price) : undefined,
              onlineDurationMonths: data.online_duration_months !== null && data.online_duration_months !== undefined ? Number(data.online_duration_months) : undefined,
              price: Number(data.price),
              durationValue: Number(data.duration_value),
              durationUnit: data.duration_unit,
              category: data.category,
              categoryLabel: data.category_label,
              isFeatured: !!data.is_featured,
              displayOrder: Number(data.display_order),
              status: data.status,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            },
            error: null,
          };
        }
        return { data: null, error: 'Database insert returned no record.' };
      }

      // Fallback in-memory
      const newCourse: CourseCMS = {
        id: `course-${Date.now()}`,
        slug: cleanSlug,
        title: payload.title.trim(),
        titleRomanUrdu: payload.titleRomanUrdu?.trim(),
        shortDescription: payload.shortDescription.trim(),
        shortDescriptionRomanUrdu: payload.shortDescriptionRomanUrdu?.trim(),
        fullDescription: payload.fullDescription?.trim(),
        fullDescriptionRomanUrdu: payload.fullDescriptionRomanUrdu?.trim(),
        thumbnailUrl: (payload as any).thumbnailUrl?.trim() || undefined,
        isMostPopular: !!(payload as any).isMostPopular,
        availableForPhysical: payload.availableForPhysical !== undefined ? !!payload.availableForPhysical : true,
        availableForOnline: payload.availableForOnline !== undefined ? !!payload.availableForOnline : true,
        onlinePrice: (payload as any).onlinePrice !== undefined ? Number((payload as any).onlinePrice) : undefined,
        onlineDurationMonths: (payload as any).onlineDurationMonths !== undefined ? Number((payload as any).onlineDurationMonths) : undefined,
        price: Math.max(0, Number(payload.price) || 0),
        durationValue: Math.max(1, Number(payload.durationValue) || 1),
        durationUnit: payload.durationUnit,
        category: payload.category || 'business',
        categoryLabel: payload.categoryLabel || 'Business',
        isFeatured: !!payload.isFeatured,
        displayOrder: Number(payload.displayOrder) || memoryCourses.length + 1,
        status: payload.status,
        createdAt: now,
        updatedAt: now,
        moduleCount: 0,
        lessonCount: 0,
      };

      memoryCourses.push(newCourse);
      return { data: newCourse, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create course' };
    }
  },

  async updateCourse(
    id: string,
    updates: Partial<CourseCMS>
  ): Promise<{ data: CourseCMS | null; error: string | null }> {
    try {
      const now = new Date().toISOString();

      if (isSupabaseConfigured && supabase) {
        const payload: any = { updated_at: now };
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.titleRomanUrdu !== undefined) payload.title_roman_urdu = updates.titleRomanUrdu;
        if (updates.slug !== undefined) payload.slug = updates.slug;
        if (updates.shortDescription !== undefined) payload.short_description = updates.shortDescription;
        if (updates.shortDescriptionRomanUrdu !== undefined) payload.short_description_roman_urdu = updates.shortDescriptionRomanUrdu;
        if (updates.fullDescription !== undefined) payload.full_description = updates.fullDescription;
        if (updates.fullDescriptionRomanUrdu !== undefined) payload.full_description_roman_urdu = updates.fullDescriptionRomanUrdu;
        if (updates.thumbnailUrl !== undefined) payload.thumbnail_url = updates.thumbnailUrl;
        if (updates.isMostPopular !== undefined) payload.is_most_popular = updates.isMostPopular;
        if (updates.availableForPhysical !== undefined) payload.available_for_physical = updates.availableForPhysical;
        if (updates.availableForOnline !== undefined) payload.available_for_online = updates.availableForOnline;
        if (updates.onlinePrice !== undefined) payload.online_price = updates.onlinePrice;
        if (updates.onlineDurationMonths !== undefined) payload.online_duration_months = updates.onlineDurationMonths;
        if (updates.price !== undefined) payload.price = Math.max(0, Number(updates.price));
        if (updates.durationValue !== undefined) payload.duration_value = Math.max(1, Number(updates.durationValue));
        if (updates.durationUnit !== undefined) payload.duration_unit = updates.durationUnit;
        if (updates.category !== undefined) payload.category = updates.category;
        if (updates.categoryLabel !== undefined) payload.category_label = updates.categoryLabel;
        if (updates.isFeatured !== undefined) payload.is_featured = updates.isFeatured;
        if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;
        if (updates.status !== undefined) payload.status = updates.status;

        const { data, error } = await supabase
          .from('courses')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('[CourseService] Update failed:', error.message);
          return { data: null, error: error.message };
        } else if (data) {
          return {
            data: {
              id: data.id,
              slug: data.slug,
              title: data.title,
              titleRomanUrdu: data.title_roman_urdu,
              shortDescription: data.short_description,
              shortDescriptionRomanUrdu: data.short_description_roman_urdu,
              fullDescription: data.full_description,
              fullDescriptionRomanUrdu: data.full_description_roman_urdu,
              thumbnailUrl: data.thumbnail_url || undefined,
              isMostPopular: !!data.is_most_popular,
              availableForPhysical: data.available_for_physical !== undefined ? !!data.available_for_physical : true,
              availableForOnline: data.available_for_online !== undefined ? !!data.available_for_online : true,
              onlinePrice: data.online_price !== null && data.online_price !== undefined ? Number(data.online_price) : undefined,
              onlineDurationMonths: data.online_duration_months !== null && data.online_duration_months !== undefined ? Number(data.online_duration_months) : undefined,
              price: Number(data.price),
              durationValue: Number(data.duration_value),
              durationUnit: data.duration_unit,
              category: data.category,
              categoryLabel: data.category_label,
              isFeatured: !!data.is_featured,
              displayOrder: Number(data.display_order),
              status: data.status,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            },
            error: null,
          };
        }
        return { data: null, error: 'Database update returned no record.' };
      }

      const index = memoryCourses.findIndex((c) => c.id === id);
      if (index === -1) return { data: null, error: 'Course not found' };

      memoryCourses[index] = {
        ...memoryCourses[index],
        ...updates,
        updatedAt: now,
      };

      return { data: memoryCourses[index], error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update course' };
    }
  },

  async setCourseStatus(
    id: string,
    status: CourseStatus
  ): Promise<{ success: boolean; error: string | null }> {
    return this.updateCourse(id, { status }).then((res) => ({
      success: !res.error,
      error: res.error,
    }));
  },

  // ============================================================================
  // MODULE OPERATIONS
  // ============================================================================

  async getModulesWithCurriculum(courseId: string): Promise<{ data: CourseModule[]; error: string | null }> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('course_modules')
          .select(`
            id,
            course_id,
            title,
            title_roman_urdu,
            description,
            description_roman_urdu,
            display_order,
            is_published,
            created_at,
            updated_at,
            course_lessons (
              id,
              module_id,
              title,
              title_roman_urdu,
              description,
              youtube_video_id,
              duration_minutes,
              display_order,
              is_free_preview,
              is_published,
              created_at,
              updated_at,
              lesson_resources (
                id,
                lesson_id,
                title,
                resource_type,
                description,
                content_text,
                external_url,
                storage_path,
                display_order,
                created_at,
                updated_at
              )
            )
          `)
          .eq('course_id', courseId)
          .order('display_order', { ascending: true });

        if (error) {
          console.warn('[CourseService] Live getModulesWithCurriculum failed:', error.message);
        } else if (data) {
          const formatted: CourseModule[] = data.map((m: any) => ({
            id: m.id,
            courseId: m.course_id,
            title: m.title,
            titleRomanUrdu: m.title_roman_urdu,
            description: m.description,
            descriptionRomanUrdu: m.description_roman_urdu,
            displayOrder: m.display_order,
            isPublished: m.is_published,
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            lessons: (m.course_lessons || [])
              .sort((a: any, b: any) => a.display_order - b.display_order)
              .map((l: any) => ({
                id: l.id,
                moduleId: l.module_id,
                title: l.title,
                titleRomanUrdu: l.title_roman_urdu,
                description: l.description,
                youtubeVideoId: l.youtube_video_id,
                durationMinutes: l.duration_minutes || 0,
                displayOrder: l.display_order,
                isFreePreview: l.is_free_preview,
                isPublished: l.is_published,
                createdAt: l.created_at,
                updatedAt: l.updated_at,
                resources: (l.lesson_resources || [])
                  .sort((a: any, b: any) => a.display_order - b.display_order)
                  .map((r: any) => ({
                    id: r.id,
                    lessonId: r.lesson_id,
                    title: r.title,
                    resourceType: r.resource_type,
                    description: r.description,
                    contentText: r.content_text,
                    externalUrl: r.external_url,
                    storagePath: r.storage_path,
                    displayOrder: r.display_order,
                    createdAt: r.created_at,
                    updatedAt: r.updated_at,
                  })),
              })),
          }));
          return { data: formatted, error: null };
        }
      }

      // Memory fallback
      const modules = memoryModules
        .filter((m) => m.courseId === courseId)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const assembled: CourseModule[] = modules.map((mod) => {
        const modLessons = memoryLessons
          .filter((l) => l.moduleId === mod.id)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((les) => ({
            ...les,
            resources: memoryResources
              .filter((r) => r.lessonId === les.id)
              .sort((a, b) => a.displayOrder - b.displayOrder),
          }));

        return {
          ...mod,
          lessons: modLessons,
        };
      });

      return { data: assembled, error: null };
    } catch (err: any) {
      return { data: [], error: err.message || 'Failed to fetch curriculum' };
    }
  },

  async createModule(payload: {
    courseId: string;
    title: string;
    titleRomanUrdu?: string;
    description?: string;
    displayOrder?: number;
  }): Promise<{ data: CourseModule | null; error: string | null }> {
    try {
      const now = new Date().toISOString();

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('course_modules')
          .insert({
            course_id: payload.courseId,
            title: payload.title.trim(),
            title_roman_urdu: payload.titleRomanUrdu?.trim() || null,
            description: payload.description?.trim() || null,
            display_order: payload.displayOrder || 1,
            is_published: true,
          })
          .select()
          .single();

        if (error) {
          return { data: null, error: error.message };
        } else if (data) {
          return {
            data: {
              id: data.id,
              courseId: data.course_id,
              title: data.title,
              titleRomanUrdu: data.title_roman_urdu,
              description: data.description,
              displayOrder: data.display_order,
              isPublished: data.is_published,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
              lessons: [],
            },
            error: null,
          };
        }
      }

      const newMod: CourseModule = {
        id: `mod-${Date.now()}`,
        courseId: payload.courseId,
        title: payload.title.trim(),
        titleRomanUrdu: payload.titleRomanUrdu?.trim(),
        description: payload.description?.trim(),
        displayOrder:
          payload.displayOrder ||
          memoryModules.filter((m) => m.courseId === payload.courseId).length + 1,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        lessons: [],
      };

      memoryModules.push(newMod);
      return { data: newMod, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create module' };
    }
  },

  async updateModule(
    id: string,
    updates: Partial<CourseModule>
  ): Promise<{ data: CourseModule | null; error: string | null }> {
    try {
      const now = new Date().toISOString();

      if (isSupabaseConfigured && supabase) {
        const payload: any = { updated_at: now };
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.titleRomanUrdu !== undefined) payload.title_roman_urdu = updates.titleRomanUrdu;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;
        if (updates.isPublished !== undefined) payload.is_published = updates.isPublished;

        const { data, error } = await supabase
          .from('course_modules')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) return { data: null, error: error.message };
        return {
          data: {
            id: data.id,
            courseId: data.course_id,
            title: data.title,
            titleRomanUrdu: data.title_roman_urdu,
            description: data.description,
            displayOrder: data.display_order,
            isPublished: data.is_published,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
          error: null,
        };
      }

      const idx = memoryModules.findIndex((m) => m.id === id);
      if (idx === -1) return { data: null, error: 'Module not found' };

      memoryModules[idx] = { ...memoryModules[idx], ...updates, updatedAt: now };
      return { data: memoryModules[idx], error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update module' };
    }
  },

  async deleteModule(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('course_modules').delete().eq('id', id);
        if (error) return { success: false, error: error.message };
        return { success: true, error: null };
      }

      memoryModules = memoryModules.filter((m) => m.id !== id);
      memoryLessons = memoryLessons.filter((l) => l.moduleId !== id);
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete module' };
    }
  },

  // ============================================================================
  // LESSON OPERATIONS
  // ============================================================================

  async createLesson(payload: {
    moduleId: string;
    title: string;
    titleRomanUrdu?: string;
    description?: string;
    youtubeUrlOrId?: string;
    durationMinutes?: number;
    isFreePreview?: boolean;
    displayOrder?: number;
  }): Promise<{ data: CourseLesson | null; error: string | null }> {
    try {
      const now = new Date().toISOString();
      const videoId = extractYouTubeVideoId(payload.youtubeUrlOrId) || undefined;

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('course_lessons')
          .insert({
            module_id: payload.moduleId,
            title: payload.title.trim(),
            title_roman_urdu: payload.titleRomanUrdu?.trim() || null,
            description: payload.description?.trim() || null,
            youtube_video_id: videoId || null,
            duration_minutes: Number(payload.durationMinutes) || 0,
            is_free_preview: !!payload.isFreePreview,
            display_order: payload.displayOrder || 1,
            is_published: true,
          })
          .select()
          .single();

        if (error) return { data: null, error: error.message };
        return {
          data: {
            id: data.id,
            moduleId: data.module_id,
            title: data.title,
            titleRomanUrdu: data.title_roman_urdu,
            description: data.description,
            youtubeVideoId: data.youtube_video_id,
            durationMinutes: data.duration_minutes,
            displayOrder: data.display_order,
            isFreePreview: data.is_free_preview,
            isPublished: data.is_published,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            resources: [],
          },
          error: null,
        };
      }

      const newLesson: CourseLesson = {
        id: `les-${Date.now()}`,
        moduleId: payload.moduleId,
        title: payload.title.trim(),
        titleRomanUrdu: payload.titleRomanUrdu?.trim(),
        description: payload.description?.trim(),
        youtubeVideoId: videoId,
        durationMinutes: Number(payload.durationMinutes) || 0,
        isFreePreview: !!payload.isFreePreview,
        displayOrder:
          payload.displayOrder ||
          memoryLessons.filter((l) => l.moduleId === payload.moduleId).length + 1,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
        resources: [],
      };

      memoryLessons.push(newLesson);
      return { data: newLesson, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create lesson' };
    }
  },

  async updateLesson(
    id: string,
    updates: Partial<CourseLesson> & { youtubeUrlOrId?: string }
  ): Promise<{ data: CourseLesson | null; error: string | null }> {
    try {
      const now = new Date().toISOString();
      let extractedId = updates.youtubeVideoId;

      if (updates.youtubeUrlOrId !== undefined) {
        extractedId = extractYouTubeVideoId(updates.youtubeUrlOrId) || undefined;
      }

      if (isSupabaseConfigured && supabase) {
        const payload: any = { updated_at: now };
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.titleRomanUrdu !== undefined) payload.title_roman_urdu = updates.titleRomanUrdu;
        if (updates.description !== undefined) payload.description = updates.description;
        if (extractedId !== undefined) payload.youtube_video_id = extractedId || null;
        if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
        if (updates.isFreePreview !== undefined) payload.is_free_preview = updates.isFreePreview;
        if (updates.isPublished !== undefined) payload.is_published = updates.isPublished;
        if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;

        const { data, error } = await supabase
          .from('course_lessons')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) return { data: null, error: error.message };
        return {
          data: {
            id: data.id,
            moduleId: data.module_id,
            title: data.title,
            titleRomanUrdu: data.title_roman_urdu,
            description: data.description,
            youtubeVideoId: data.youtube_video_id,
            durationMinutes: data.duration_minutes,
            displayOrder: data.display_order,
            isFreePreview: data.is_free_preview,
            isPublished: data.is_published,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
          error: null,
        };
      }

      const idx = memoryLessons.findIndex((l) => l.id === id);
      if (idx === -1) return { data: null, error: 'Lesson not found' };

      memoryLessons[idx] = {
        ...memoryLessons[idx],
        ...updates,
        youtubeVideoId: extractedId !== undefined ? extractedId : memoryLessons[idx].youtubeVideoId,
        updatedAt: now,
      };

      return { data: memoryLessons[idx], error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update lesson' };
    }
  },

  async deleteLesson(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('course_lessons').delete().eq('id', id);
        if (error) return { success: false, error: error.message };
        return { success: true, error: null };
      }

      memoryLessons = memoryLessons.filter((l) => l.id !== id);
      memoryResources = memoryResources.filter((r) => r.lessonId !== id);
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete lesson' };
    }
  },

  // ============================================================================
  // RESOURCE OPERATIONS
  // ============================================================================

  async createResource(payload: {
    lessonId: string;
    title: string;
    resourceType: LessonResourceType;
    description?: string;
    contentText?: string;
    externalUrl?: string;
    displayOrder?: number;
  }): Promise<{ data: LessonResource | null; error: string | null }> {
    try {
      const now = new Date().toISOString();

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('lesson_resources')
          .insert({
            lesson_id: payload.lessonId,
            title: payload.title.trim(),
            resource_type: payload.resourceType,
            description: payload.description?.trim() || null,
            content_text: payload.contentText?.trim() || null,
            external_url: payload.externalUrl?.trim() || null,
            display_order: payload.displayOrder || 1,
          })
          .select()
          .single();

        if (error) return { data: null, error: error.message };
        return {
          data: {
            id: data.id,
            lessonId: data.lesson_id,
            title: data.title,
            resourceType: data.resource_type,
            description: data.description,
            contentText: data.content_text,
            externalUrl: data.external_url,
            storagePath: data.storage_path,
            displayOrder: data.display_order,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
          error: null,
        };
      }

      const newRes: LessonResource = {
        id: `res-${Date.now()}`,
        lessonId: payload.lessonId,
        title: payload.title.trim(),
        resourceType: payload.resourceType,
        description: payload.description?.trim(),
        contentText: payload.contentText?.trim(),
        externalUrl: payload.externalUrl?.trim(),
        displayOrder:
          payload.displayOrder ||
          memoryResources.filter((r) => r.lessonId === payload.lessonId).length + 1,
        createdAt: now,
        updatedAt: now,
      };

      memoryResources.push(newRes);
      return { data: newRes, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create resource' };
    }
  },

  async deleteResource(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('lesson_resources').delete().eq('id', id);
        if (error) return { success: false, error: error.message };
        return { success: true, error: null };
      }

      memoryResources = memoryResources.filter((r) => r.id !== id);
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete resource' };
    }
  },

  // Convenience helpers for student LMS portal & classroom
  async getAllCourses(): Promise<CourseCMS[]> {
    const res = await this.getCourses();
    return res.data;
  },

  async getCourseModules(courseId: string): Promise<CourseModule[]> {
    const res = await this.getModulesWithCurriculum(courseId);
    return res.data;
  },

  async getLessonResources(lessonId: string): Promise<LessonResource[]> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('lesson_resources')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('display_order', { ascending: true });

        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id,
            lessonId: r.lesson_id,
            title: r.title,
            resourceType: r.resource_type,
            description: r.description,
            contentText: r.content_text,
            externalUrl: r.external_url,
            storagePath: r.storage_path,
            displayOrder: r.display_order,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));
        }
      }

      return memoryResources
        .filter((r) => r.lessonId === lessonId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    } catch {
      return [];
    }
  },
};
