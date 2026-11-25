-- Post-setup helper: Activate & promote your first Supabase Auth user to 'admin'
-- New users created in Auth start with role = 'staff' and is_active = false (fail-closed).
-- Run this in the Supabase SQL Editor AFTER creating your first user in Authentication -> Users.
-- Also remember to disable "Allow new users to sign up" in Supabase Auth -> Providers -> Email.

-- 1. Promote and activate first Admin:
-- UPDATE public.staff_profiles
-- SET role = 'admin', is_active = true
-- WHERE email = 'admin@example.com';

-- 2. Activate additional Staff users:
-- UPDATE public.staff_profiles
-- SET is_active = true
-- WHERE email = 'staff@example.com';
