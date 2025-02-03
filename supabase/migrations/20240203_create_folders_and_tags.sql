-- Create folders table
create table folders (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null
);

-- Create tags table
create table tags (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  color text not null default '#3B82F6', -- default blue color
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  unique(name, user_id)
);

-- Create code_snippets_folders junction table
create table code_snippets_folders (
  code_snippet_id uuid references code_snippets(id) on delete cascade not null,
  folder_id uuid references folders(id) on delete cascade not null,
  primary key (code_snippet_id, folder_id)
);

-- Create code_snippets_tags junction table
create table code_snippets_tags (
  code_snippet_id uuid references code_snippets(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  primary key (code_snippet_id, tag_id)
);

-- Add RLS policies
alter table folders enable row level security;
alter table tags enable row level security;
alter table code_snippets_folders enable row level security;
alter table code_snippets_tags enable row level security;

-- Folders policies
create policy "Users can view all folders"
  on folders for select
  using (true);

create policy "Only admin can insert folders"
  on folders for insert
  with check (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

create policy "Only admin can update folders"
  on folders for update
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

create policy "Only admin can delete folders"
  on folders for delete
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

-- Tags policies
create policy "Users can view all tags"
  on tags for select
  using (true);

create policy "Only admin can insert tags"
  on tags for insert
  with check (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

create policy "Only admin can update tags"
  on tags for update
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

create policy "Only admin can delete tags"
  on tags for delete
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

-- Junction table policies
create policy "Users can view all code_snippets_folders"
  on code_snippets_folders for select
  using (true);

create policy "Only admin can insert code_snippets_folders"
  on code_snippets_folders for insert
  with check (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

create policy "Only admin can update code_snippets_folders"
  on code_snippets_folders for update
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

create policy "Only admin can delete code_snippets_folders"
  on code_snippets_folders for delete
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

create policy "Users can view all code_snippets_tags"
  on code_snippets_tags for select
  using (true);

create policy "Only admin can insert code_snippets_tags"
  on code_snippets_tags for insert
  with check (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

create policy "Only admin can update code_snippets_tags"
  on code_snippets_tags for update
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

create policy "Only admin can delete code_snippets_tags"
  on code_snippets_tags for delete
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email in ('admin@example.com')
    )
  );

-- Create updated_at triggers
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_folders_updated_at
  before update on folders
  for each row
  execute function update_updated_at_column();

-- Add folder_id to code_snippets table for default folder
alter table code_snippets add column folder_id uuid references folders(id) on delete set null;

-- Create default language tags (replace YOUR_USER_ID with the actual ID from auth.users)
do $$
declare
  admin_id uuid;
begin
  -- Get the first user's ID
  select id into admin_id from auth.users limit 1;
  
  -- Create tags with the actual user ID
  insert into tags (name, color, user_id) values
    ('HTML', '#E34F26', admin_id),
    ('CSS', '#1572B6', admin_id),
    ('JavaScript', '#F7DF1E', admin_id),
    ('C++', '#00599C', admin_id),
    ('Java', '#007396', admin_id),
    ('PHP', '#777BB4', admin_id);
end $$;
