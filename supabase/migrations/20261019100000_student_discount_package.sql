-- Student Discount Package: fixed bundle for the two approved courses.
-- Safe to re-run; does not modify or hide existing courses.
begin;

insert into public.packages
  (slug, title, title_roman_urdu, description, description_roman_urdu, price, duration_months, is_active, display_order, package_type, courses_count)
values
  ('student-discount-package',
   'Student Discount Package',
   'Student Discount Package',
   'AI Earnings Course + AI Web & Android App Development. Original total Rs. 10,000; student offer price Rs. 4,000 (60% off; save Rs. 6,000).',
   'AI Earnings Course aur AI Web & Android App Development dono courses. Asal fees Rs. 10,000; offer Rs. 4,000 (60% discount; Rs. 6,000 bachat).',
   4000, 6, true, 0, 'bundle', 2)
on conflict (slug) do update set
  title = excluded.title,
  title_roman_urdu = excluded.title_roman_urdu,
  description = excluded.description,
  description_roman_urdu = excluded.description_roman_urdu,
  price = excluded.price,
  is_active = true,
  display_order = 0,
  package_type = 'bundle',
  courses_count = 2,
  updated_at = timezone('utc'::text, now());

insert into public.package_courses (package_id, course_id)
select p.id, c.id
from public.packages p
join public.courses c on c.slug in ('ai-earnings-course', 'ai-web-development')
where p.slug = 'student-discount-package'
on conflict do nothing;

commit;
