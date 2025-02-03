-- Grant permissions for auth.users to the authenticated role
grant usage on schema auth to authenticated;
grant select on auth.users to authenticated;

-- Grant permissions for code_snippets operations
grant all on code_snippets to authenticated;
grant all on code_snippets_id_seq to authenticated;

-- Grant permissions for code_snippets_tags operations
grant all on code_snippets_tags to authenticated;
grant all on code_snippets_tags_id_seq to authenticated;

-- Grant permissions for tags operations
grant select on tags to authenticated;

-- Enable RLS for code_snippets_tags
alter table public.code_snippets_tags enable row level security;

-- Add RLS policies for code_snippets_tags
create policy "Users can view all code snippet tags"
    on code_snippets_tags for select
    using (true);

create policy "Users can create tags for their own snippets"
    on code_snippets_tags for insert
    with check (
        exists (
            select 1 from code_snippets
            where code_snippets.id = code_snippet_id
            and code_snippets.user_id = auth.uid()
        )
    );

create policy "Users can delete tags from their own snippets"
    on code_snippets_tags for delete
    using (
        exists (
            select 1 from code_snippets
            where code_snippets.id = code_snippet_id
            and code_snippets.user_id = auth.uid()
        )
    );
