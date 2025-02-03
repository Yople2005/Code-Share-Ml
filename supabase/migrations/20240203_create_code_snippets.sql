-- Create code_snippets table if it doesn't exist
create table if not exists public.code_snippets (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    language text not null,
    code_content text not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.code_snippets enable row level security;

-- RLS Policies for code_snippets
create policy "Users can view all code snippets"
    on public.code_snippets for select
    using (true);

create policy "Users can create code snippets"
    on public.code_snippets for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own code snippets"
    on public.code_snippets for update
    using (auth.uid() = user_id);

create policy "Users can delete their own code snippets"
    on public.code_snippets for delete
    using (auth.uid() = user_id);

-- Add updated_at trigger
create trigger set_updated_at
    before update on public.code_snippets
    for each row
    execute function update_updated_at_column();
