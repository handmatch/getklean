-- =====================================================================
-- Getklean platform: database schema + access rules (Supabase / Postgres)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a new project. Follows the PRD permissions matrix.
-- =====================================================================

-- ---------- Types ----------
create type app_role as enum ('customer','super_admin','sales','operations','finance','cleaner','housemaid','technician','rider');
create type worker_level as enum ('regular','expert');
create type business_unit as enum ('housemaid','aircon','deep');
create type booking_status as enum ('quote','pending_payment','confirmed','in_progress','completed','cancelled');
create type job_status as enum ('scheduled','in_progress','completed','cancelled','no_show');
create type assignment_status as enum ('assigned','checked_in','checked_out','removed');
create type photo_kind as enum ('before','after','cash');
create type pay_method as enum ('card','gcash','maya','qrph','online_banking','cash');
create type pay_status as enum ('pending','paid','failed','refunded','cash_due','cash_proof_uploaded','cash_verified');
create type avail_slot as enum ('whole','am','pm','off');

-- ---------- People ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'customer',
  full_name text not null default '',
  mobile text unique,
  email text,
  is_business boolean not null default false,
  company_name text,
  created_at timestamptz not null default now()
);

create table workers (
  profile_id uuid primary key references profiles(id) on delete cascade,
  level worker_level not null default 'regular',
  home_city text,
  home_lat double precision, home_lon double precision,
  documents_complete boolean not null default false,
  background_checked boolean not null default false,
  suspended boolean not null default false,
  updated_at timestamptz not null default now()
);
-- A housemaid is bookable only when this is true (PRD: "passes system checks").
create or replace function worker_is_bookable(w workers) returns boolean language sql stable as
$$ select w.documents_complete and w.background_checked and not w.suspended $$;

create table training_records (
  id bigint generated always as identity primary key,
  worker_id uuid not null references workers(profile_id) on delete cascade,
  course text not null,
  completed_on date not null default current_date,
  recorded_by uuid references profiles(id)
);

create table worker_documents (
  id bigint generated always as identity primary key,
  worker_id uuid not null references workers(profile_id) on delete cascade,
  kind text not null,             -- e.g. government ID, NBI clearance, training certificate
  storage_path text not null,     -- in the private 'worker-docs' bucket
  expires_on date,
  created_at timestamptz not null default now()
);

-- ---------- Places ----------
create table areas (                 -- Aircon Areas: a group of cities or municipalities, each with its own calendar
  id bigint generated always as identity primary key,
  unit business_unit not null default 'aircon',
  name text not null
);
create table area_cities (
  area_id bigint not null references areas(id) on delete cascade,
  city text not null,
  primary key (area_id, city)
);
create table worker_areas (
  worker_id uuid not null references workers(profile_id) on delete cascade,
  area_id bigint not null references areas(id) on delete cascade,
  primary key (worker_id, area_id)
);

create table addresses (             -- a customer can save many
  id bigint generated always as identity primary key,
  customer_id uuid not null references profiles(id) on delete cascade,
  label text not null default 'Home',
  unit_floor text, building text, street text not null, city text not null,
  landmark text, access_notes text,
  lat double precision, lon double precision,
  contact_name text, contact_phone text,   -- business sites
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index one_default_address on addresses(customer_id) where is_default;

-- ---------- Bookings and jobs ----------
create table bookings (
  id bigint generated always as identity primary key,
  ref text unique not null default ('BK-' || to_char(now(),'YYMM') || '-' || substr(md5(random()::text),1,5)),
  customer_id uuid not null references profiles(id),
  unit business_unit not null,
  status booking_status not null default 'pending_payment',
  address_id bigint references addresses(id),
  address_snapshot jsonb not null,     -- copy at booking time; later address edits don't change it
  area_id bigint references areas(id),
  details jsonb not null default '{}', -- tasks / aircon units / sqm and scope / dispatch level / ride
  price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  plan_fee numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (price - discount + plan_fee) stored,
  pay_method pay_method,
  created_by uuid references profiles(id),  -- staff member when booked by phone
  created_at timestamptz not null default now()
);

create table jobs (                  -- one visit of a booking
  id bigint generated always as identity primary key,
  booking_id bigint not null references bookings(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status job_status not null default 'scheduled',
  customer_signoff_name text,
  created_at timestamptz not null default now()
);
create index on jobs(date);

create table assignments (           -- one worker on one job; aircon = Technician + Rider per team
  id bigint generated always as identity primary key,
  job_id bigint not null references jobs(id) on delete cascade,
  worker_id uuid not null references workers(profile_id),
  team_no int not null default 1,
  is_lead boolean not null default false,
  status assignment_status not null default 'assigned',
  checkin_at timestamptz, checkin_lat double precision, checkin_lon double precision,
  checkin_distance_m int, checkin_no_gps boolean not null default false,
  checkout_at timestamptz,
  assigned_by uuid references profiles(id),
  unique (job_id, worker_id)
);
create index on assignments(worker_id);

create table job_photos (
  id bigint generated always as identity primary key,
  job_id bigint not null references jobs(id) on delete cascade,
  kind photo_kind not null,
  unit_ref text,                       -- which aircon unit
  storage_path text not null,          -- in the private 'job-photos' bucket
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table availability (          -- housemaids set their own
  worker_id uuid not null references workers(profile_id) on delete cascade,
  date date not null,
  slot avail_slot not null,
  primary key (worker_id, date)
);

-- ---------- Money ----------
create table payments (
  id bigint generated always as identity primary key,
  booking_id bigint not null references bookings(id) on delete cascade,
  method pay_method not null,
  amount numeric(12,2) not null,
  status pay_status not null default 'pending',
  provider_ref text,                   -- PayMongo payment / checkout id
  cash_proof_path text,                -- photo uploaded by the team
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create table refunds (
  id bigint generated always as identity primary key,
  payment_id bigint not null references payments(id),
  amount numeric(12,2) not null,
  reason text,
  requested_by uuid references profiles(id),
  approved_by uuid references profiles(id),  -- Super Admin above the threshold in settings
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

create table worker_rates (          -- Super Admin: pay per worker category and level
  id bigint generated always as identity primary key,
  unit business_unit not null,
  worker_role app_role not null check (worker_role in ('cleaner','housemaid','technician','rider')),
  level worker_level not null,
  service_key text not null,           -- e.g. 'whole_day', 'half_day', 'split_type_unit', 'per_sqm'
  amount numeric(12,2) not null,
  effective_from date not null default current_date
);
create table payouts (
  id bigint generated always as identity primary key,
  period_start date not null, period_end date not null,
  status text not null default 'draft',
  created_by uuid references profiles(id), created_at timestamptz not null default now()
);
create table earnings (
  id bigint generated always as identity primary key,
  worker_id uuid not null references workers(profile_id),
  job_id bigint not null references jobs(id),
  amount numeric(12,2) not null,
  payout_id bigint references payouts(id),
  created_at timestamptz not null default now(),
  unique (worker_id, job_id)
);

create table sqm_price_matrix (      -- Deep Cleaning price per sqm band
  id bigint generated always as identity primary key,
  space_type text not null,            -- home, office, restaurant, airbnb
  min_sqm int not null, max_sqm int,
  price_per_sqm numeric(10,2), flat_price numeric(12,2)
);

create table settings (              -- Super Admin controls
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
insert into settings(key, value) values
  ('cancellation_fees', '{"enabled": false, "tiers": []}'),
  ('refund_approval_threshold_php', 'null'),
  ('checkin_radius_m', '200'),
  ('maps_monthly_budget_usd', 'null');

create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, table_name text not null, record_id text,
  diff jsonb, at timestamptz not null default now()
);

-- ---------- Role helpers ----------
create or replace function my_role() returns app_role language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;
create or replace function is_office() returns boolean language sql stable as
$$ select my_role() in ('super_admin','sales','operations','finance') $$;
create or replace function is_assigned(j bigint) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from assignments a where a.job_id = j and a.worker_id = auth.uid() and a.status <> 'removed') $$;
-- These helpers read across tables without re-running row rules (prevents policy loops).
create or replace function is_job_customer(j bigint) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from jobs x join bookings b on b.id = x.booking_id where x.id = j and b.customer_id = auth.uid()) $$;
create or replace function worker_can_see_booking(bk bigint) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from jobs x join assignments a on a.job_id = x.id where x.booking_id = bk and a.worker_id = auth.uid() and a.status <> 'removed' and x.date >= current_date - 1) $$;

-- New sign-ups become customers; staff and workers are promoted by Super Admin / Operations.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, mobile, email) values (new.id, new.phone, new.email) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------- Row-level security ----------
alter table profiles enable row level security;
alter table workers enable row level security;
alter table training_records enable row level security;
alter table worker_documents enable row level security;
alter table areas enable row level security;
alter table area_cities enable row level security;
alter table worker_areas enable row level security;
alter table addresses enable row level security;
alter table bookings enable row level security;
alter table jobs enable row level security;
alter table assignments enable row level security;
alter table job_photos enable row level security;
alter table availability enable row level security;
alter table payments enable row level security;
alter table refunds enable row level security;
alter table worker_rates enable row level security;
alter table payouts enable row level security;
alter table earnings enable row level security;
alter table sqm_price_matrix enable row level security;
alter table settings enable row level security;
alter table audit_log enable row level security;

-- profiles
create policy "read own profile or office" on profiles for select using (id = auth.uid() or is_office());
create policy "update own name" on profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = my_role());
create policy "super admin manages profiles" on profiles for all using (my_role() = 'super_admin') with check (my_role() = 'super_admin');
create policy "ops manage worker profiles" on profiles for update using (my_role() = 'operations' and role in ('cleaner','housemaid','technician','rider'));

-- workers, training, documents (Supervisors are Operations)
create policy "worker reads self" on workers for select using (profile_id = auth.uid() or is_office());
create policy "ops edit workers" on workers for all using (my_role() in ('operations','super_admin')) with check (my_role() in ('operations','super_admin'));
create policy "training read" on training_records for select using (worker_id = auth.uid() or is_office());
create policy "training edit" on training_records for all using (my_role() in ('operations','super_admin')) with check (my_role() in ('operations','super_admin'));
create policy "docs read" on worker_documents for select using (worker_id = auth.uid() or my_role() in ('operations','super_admin','finance'));
create policy "docs edit" on worker_documents for all using (my_role() in ('operations','super_admin')) with check (my_role() in ('operations','super_admin'));

-- areas: everyone signed in can read; Super Admin edits
create policy "areas read" on areas for select using (auth.uid() is not null);
create policy "areas edit" on areas for all using (my_role() = 'super_admin') with check (my_role() = 'super_admin');
create policy "area cities read" on area_cities for select using (auth.uid() is not null);
create policy "area cities edit" on area_cities for all using (my_role() = 'super_admin') with check (my_role() = 'super_admin');
create policy "worker areas read" on worker_areas for select using (worker_id = auth.uid() or is_office());
create policy "worker areas edit" on worker_areas for all using (my_role() in ('operations','super_admin')) with check (my_role() in ('operations','super_admin'));

-- addresses: customers manage their own; Sales/Ops can add for customers
create policy "own addresses" on addresses for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "office read addresses" on addresses for select using (is_office());
create policy "sales ops write addresses" on addresses for insert with check (my_role() in ('sales','operations','super_admin'));
create policy "sales ops update addresses" on addresses for update using (my_role() in ('sales','operations','super_admin'));

-- bookings
create policy "customer own bookings" on bookings for select using (customer_id = auth.uid());
create policy "customer creates booking" on bookings for insert with check (customer_id = auth.uid());
create policy "office read bookings" on bookings for select using (is_office());
create policy "sales ops write bookings" on bookings for all using (my_role() in ('sales','operations','super_admin')) with check (my_role() in ('sales','operations','super_admin'));
create policy "worker reads assigned booking" on bookings for select using (worker_can_see_booking(id));

-- jobs
create policy "worker reads own jobs" on jobs for select using (is_assigned(id));
create policy "customer reads own jobs" on jobs for select using (is_job_customer(id));
create policy "office read jobs" on jobs for select using (is_office());
create policy "ops write jobs" on jobs for all using (my_role() in ('operations','super_admin')) with check (my_role() in ('operations','super_admin'));

-- assignments: workers see their team on their jobs; Ops assigns
create policy "worker reads team" on assignments for select using (is_assigned(job_id));
create policy "office read assignments" on assignments for select using (is_office());
create policy "ops assign" on assignments for all using (my_role() in ('operations','super_admin')) with check (my_role() in ('operations','super_admin'));

-- photos: assigned workers upload; office and the customer can view
create policy "worker adds photos" on job_photos for insert with check (is_assigned(job_id) and uploaded_by = auth.uid());
create policy "worker removes own photos" on job_photos for delete using (uploaded_by = auth.uid());
create policy "read photos" on job_photos for select using (is_assigned(job_id) or is_office() or is_job_customer(job_id));

-- availability: housemaids manage their own
create policy "own availability" on availability for all using (worker_id = auth.uid()) with check (worker_id = auth.uid() and my_role() = 'housemaid');
create policy "office availability" on availability for select using (is_office());
create policy "ops override availability" on availability for all using (my_role() in ('operations','super_admin')) with check (my_role() in ('operations','super_admin'));
-- customers see only open slots of bookable housemaids, through this view
create or replace view open_housemaid_slots with (security_invoker = false) as
  select a.worker_id, p.full_name, w.level, a.date, a.slot
  from availability a join workers w on w.profile_id = a.worker_id join profiles p on p.id = a.worker_id
  where a.slot <> 'off' and a.date >= current_date and worker_is_bookable(w) and p.role = 'housemaid';
grant select on open_housemaid_slots to authenticated, anon;

-- payments and refunds
create policy "customer own payments" on payments for select using (exists(select 1 from bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "office read payments" on payments for select using (my_role() in ('super_admin','sales','finance','operations'));
create policy "finance writes payments" on payments for all using (my_role() in ('finance','super_admin')) with check (my_role() in ('finance','super_admin'));
create policy "refunds finance" on refunds for all using (my_role() in ('finance','super_admin')) with check (my_role() in ('finance','super_admin'));

-- rates, payouts, earnings, price matrix, settings
create policy "rates read" on worker_rates for select using (my_role() in ('super_admin','finance','operations'));
create policy "rates edit" on worker_rates for all using (my_role() = 'super_admin') with check (my_role() = 'super_admin');
create policy "payouts finance" on payouts for all using (my_role() in ('finance','super_admin')) with check (my_role() in ('finance','super_admin'));
create policy "own earnings" on earnings for select using (worker_id = auth.uid() or my_role() in ('finance','super_admin','operations'));
create policy "earnings finance" on earnings for all using (my_role() in ('finance','super_admin')) with check (my_role() in ('finance','super_admin'));
create policy "price matrix read" on sqm_price_matrix for select using (true);
create policy "price matrix edit" on sqm_price_matrix for all using (my_role() = 'super_admin') with check (my_role() = 'super_admin');
create policy "settings read" on settings for select using (is_office());
create policy "settings edit" on settings for all using (my_role() = 'super_admin') with check (my_role() = 'super_admin');
create policy "audit read" on audit_log for select using (my_role() = 'super_admin');

-- ---------- Worker actions (run with checks, not raw table writes) ----------
create or replace function worker_check_in(p_job bigint, p_lat double precision, p_lon double precision, p_no_gps boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare d int; target jsonb; r int := coalesce((select (value)::text::int from settings where key = 'checkin_radius_m'), 200);
begin
  if not is_assigned(p_job) then raise exception 'Not assigned to this job'; end if;
  select b.address_snapshot into target from jobs j join bookings b on b.id = j.booking_id where j.id = p_job and j.date = current_date;
  if target is null then raise exception 'Check-in opens on the job date'; end if;
  if not p_no_gps and target ? 'lat' then
    d := round(2 * 6371000 * asin(sqrt(power(sin(radians((target->>'lat')::float - p_lat) / 2), 2)
         + cos(radians(p_lat)) * cos(radians((target->>'lat')::float)) * power(sin(radians((target->>'lon')::float - p_lon) / 2), 2))));
  end if;
  update assignments set status = 'checked_in', checkin_at = now(), checkin_lat = p_lat, checkin_lon = p_lon,
         checkin_distance_m = d, checkin_no_gps = p_no_gps
   where job_id = p_job and worker_id = auth.uid();
  update jobs set status = 'in_progress' where id = p_job and status = 'scheduled';
  insert into audit_log(actor, action, table_name, record_id, diff)
    values (auth.uid(), 'check_in', 'assignments', p_job::text, jsonb_build_object('distance_m', d, 'flagged', coalesce(d > r, p_no_gps)));
end $$;

create or replace function worker_check_out(p_job bigint, p_signoff text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  if not is_assigned(p_job) then raise exception 'Not assigned to this job'; end if;
  select bk.* into b from jobs j join bookings bk on bk.id = j.booking_id where j.id = p_job;
  if not exists(select 1 from job_photos where job_id = p_job and kind = 'after') then raise exception 'Add at least one after photo'; end if;
  if b.pay_method = 'cash' and not exists(select 1 from job_photos where job_id = p_job and kind = 'cash') then raise exception 'Add a photo of the cash payment'; end if;
  update assignments set status = 'checked_out', checkout_at = now() where job_id = p_job and worker_id = auth.uid();
  update jobs set status = 'completed', customer_signoff_name = coalesce(p_signoff, customer_signoff_name)
   where id = p_job and not exists(select 1 from assignments a where a.job_id = p_job and a.status = 'checked_in');
  if b.pay_method = 'cash' then update payments set status = 'cash_proof_uploaded' where booking_id = b.id and status = 'cash_due'; end if;
  insert into audit_log(actor, action, table_name, record_id) values (auth.uid(), 'check_out', 'assignments', p_job::text);
end $$;
grant execute on function worker_check_in, worker_check_out to authenticated;

-- ---------- File storage (private buckets) ----------
insert into storage.buckets (id, name, public) values ('job-photos','job-photos', false), ('worker-docs','worker-docs', false)
  on conflict (id) do nothing;
-- job photos are stored as  <job_id>/<file>.jpg
create policy "workers upload job photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos' and is_assigned((split_part(name, '/', 1))::bigint));
create policy "read job photos" on storage.objects for select to authenticated
  using (bucket_id = 'job-photos' and (is_office() or is_assigned((split_part(name, '/', 1))::bigint)));
create policy "ops manage worker docs" on storage.objects for all to authenticated
  using (bucket_id = 'worker-docs' and my_role() in ('operations','super_admin'))
  with check (bucket_id = 'worker-docs' and my_role() in ('operations','super_admin'));
create policy "workers read own docs" on storage.objects for select to authenticated
  using (bucket_id = 'worker-docs' and split_part(name, '/', 1) = auth.uid()::text);
