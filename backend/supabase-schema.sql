create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('patient','doctor')),
  email text not null unique,
  password_hash text not null,
  first_name text default '',
  last_name text default '',
  phone text default '',
  date_of_birth text default '',
  address text default '',
  specialty text default '',
  license_number text default '',
  years_experience integer default 0,
  bio text default '',
  working_days text default 'monday,tuesday,wednesday,thursday,friday',
  start_time text default '09:00',
  end_time text default '17:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references users(id) on delete cascade,
  doctor_id uuid not null references users(id) on delete cascade,
  appointment_date text not null,
  appointment_time text not null,
  reason text not null,
  notes text default '',
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  reminder_sent_at timestamptz,
  visit_summary text default '',
  visit_summary_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references users(id) on delete cascade,
  patient_id uuid not null references users(id) on delete cascade,
  appointment_id uuid not null unique references appointments(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text default '',
  hide_patient_name boolean default false,
  hide_from_public boolean default false,
  hide_from_doctor boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('patient','doctor')),
  token_hash text not null unique,
  user_agent text default '',
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_appointments_patient_id on appointments(patient_id);
create index if not exists idx_appointments_doctor_id on appointments(doctor_id);
create index if not exists idx_reviews_doctor_id on reviews(doctor_id);
create index if not exists idx_reviews_patient_id on reviews(patient_id);
create index if not exists idx_trusted_devices_user_id on trusted_devices(user_id);
