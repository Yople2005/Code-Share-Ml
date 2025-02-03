-- Create attachments table
create table public.attachments (
    id uuid default gen_random_uuid() primary key,
    note_id uuid references public.notes(id) on delete cascade,
    file_name text not null,
    file_type text not null,
    file_url text not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS policies
alter table public.attachments enable row level security;

-- Allow users to view attachments of notes they have access to
create policy "Users can view attachments of notes they have access to"
    on public.attachments for select
    using (
        exists (
            select 1 from public.notes n
            where n.id = attachments.note_id
            and (
                n.created_by = auth.uid() or
                exists (
                    select 1 from public.subjects s
                    where s.id = n.subject_id
                    and s.created_by = auth.uid()
                )
            )
        )
    );

-- Allow users to create attachments for their own notes
create policy "Users can create attachments for their own notes"
    on public.attachments for insert
    with check (
        exists (
            select 1 from public.notes n
            where n.id = note_id
            and n.created_by = auth.uid()
        )
    );

-- Allow users to delete their own attachments
create policy "Users can delete their own attachments"
    on public.attachments for delete
    using (created_by = auth.uid());

-- Create storage bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true);

-- Set up storage policies
create policy "Attachments are publicly accessible."
    on storage.objects for select
    using ( bucket_id = 'attachments' );

create policy "Users can upload attachments."
    on storage.objects for insert
    with check (
        bucket_id = 'attachments'
        and auth.role() = 'authenticated'
    );
