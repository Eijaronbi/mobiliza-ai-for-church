-- Draft schema for Lovable Cloud. Every table is tenant-scoped; RLS restricts rows to the caller's tenant.
create table tenants (id uuid primary key default gen_random_uuid(), name text not null, city text, timezone text default 'Africa/Lagos');
create type app_role as enum ('super_admin','church_admin','pastor','department_leader','cell_leader','member');
create table user_roles (user_id uuid references auth.users on delete cascade, tenant_id uuid references tenants, role app_role not null, primary key (user_id, tenant_id, role));

create table members (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants, name text not null, phone text, email text, location text, status text, department_id uuid, group_ids uuid[] default '{}', leader_id uuid, contact_preference text, consent boolean default false, joined_at timestamptz default now());
create table org_units (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants, name text not null, type text not null, parent_id uuid references org_units, leader_id uuid);
create table services (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants, name text, kind text, starts_at timestamptz, location text, expected int, leader_ids uuid[], workflow_id uuid, contact_schedule text[]);
create table mobilization_records (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, service_id uuid references services, member_id uuid references members, contacted boolean, response text, transport_needed boolean, follow_up_pending boolean, attended boolean, updated_at timestamptz default now());
create table transport_requests (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, member_id uuid, service_id uuid, kind text, amount numeric, pickup_point_id uuid, vehicle_id uuid, status text, history jsonb default '[]', created_at timestamptz default now());
create table vehicle_positions (vehicle_id uuid, tenant_id uuid not null, lat double precision, lng double precision, recorded_at timestamptz default now());
create table followups (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text, phone text, kind text, status text, assigned_leader_id uuid, consent boolean, next_contact_at timestamptz, notes text);
create table communications (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, subject_type text, subject_id uuid, channel text, direction text, summary text, outcome text, at timestamptz default now());
create table reports (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, template_id uuid, unit_id uuid, status text, due_at timestamptz, values jsonb);
create table escalations (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, title text, detail text, category text, priority text, owner_name text, status text, created_at timestamptz default now());
create table integrations (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, kind text, status text, base_url text, auth_type text, secret_ref text, settings jsonb);
create table webhook_endpoints (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, integration_id uuid, workflow text, name text, url text, method text, auth_type text, secret_ref text, headers jsonb, events text[], active boolean, direction text);
create table delivery_logs (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, integration_id uuid, event text, endpoint text, request_status text, response_status int, duration_ms int, error text, retries int, payload jsonb, at timestamptz default now());

-- RLS pattern (repeat per table):
-- alter table members enable row level security;
-- create policy "tenant read" on members for select to authenticated
--   using (exists (select 1 from user_roles r where r.user_id = auth.uid() and r.tenant_id = members.tenant_id));
