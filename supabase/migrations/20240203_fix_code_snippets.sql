-- Drop existing policies
drop policy if exists "Users can view all code snippets" on code_snippets;
drop policy if exists "Users can create code snippets" on code_snippets;
drop policy if exists "Users can update their own code snippets" on code_snippets;
drop policy if exists "Users can delete their own code snippets" on code_snippets;

-- Create code_snippets table if it doesn't exist
create table if not exists public.code_snippets (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    language text not null,
    code_content text not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    folder_id uuid references folders(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.code_snippets enable row level security;

-- Create code_snippets_tags junction table if it doesn't exist
create table if not exists public.code_snippets_tags (
    id uuid default gen_random_uuid() primary key,
    code_snippet_id uuid references code_snippets(id) on delete cascade not null,
    tag_id uuid references tags(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(code_snippet_id, tag_id)
);

-- Add RLS policies for code_snippets
create policy "Users can view all code snippets"
    on code_snippets for select
    using (true);

create policy "Users can create code snippets"
    on code_snippets for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own code snippets"
    on code_snippets for update
    using (auth.uid() = user_id);

create policy "Users can delete their own code snippets"
    on code_snippets for delete
    using (auth.uid() = user_id);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger set_updated_at
    before update on code_snippets
    for each row
    execute function update_updated_at_column();

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on code_snippets to anon, authenticated;
grant all on code_snippets_tags to anon, authenticated;
grant usage on sequence code_snippets_id_seq to anon, authenticated;
grant usage on sequence code_snippets_tags_id_seq to anon, authenticated;
