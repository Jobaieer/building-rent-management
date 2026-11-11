-- Run ONCE in Supabase SQL Editor after `prisma migrate`.
-- Locks every table against the public anon/authenticated API keys.
-- Prisma connects as the table owner, so the app keeps working.
alter table "Profile"            enable row level security;
alter table "Building"           enable row level security;
alter table "BuildingAssignment" enable row level security;
alter table "Unit"               enable row level security;
alter table "RentRecord"         enable row level security;
alter table "Invoice"            enable row level security;
alter table "Expense"            enable row level security;
