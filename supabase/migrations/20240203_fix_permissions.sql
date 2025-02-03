-- Drop existing policies
drop policy if exists "Only admin can insert folders" on folders;
drop policy if exists "Only admin can update folders" on folders;
drop policy if exists "Only admin can delete folders" on folders;
drop policy if exists "Only admin can insert tags" on tags;
drop policy if exists "Only admin can update tags" on tags;
drop policy if exists "Only admin can delete tags" on tags;

-- Update folder policies to allow user operations
create policy "Users can create folders"
  on folders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their folders"
  on folders for update
  using (auth.uid() = user_id);

create policy "Users can delete their folders"
  on folders for delete
  using (auth.uid() = user_id);

-- Update tag policies to allow user operations
create policy "Users can create tags"
  on tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update their tags"
  on tags for update
  using (auth.uid() = user_id);

create policy "Users can delete their tags"
  on tags for delete
  using (auth.uid() = user_id);

-- Add policies for junction tables
create policy "Users can add code snippets to folders"
  on code_snippets_folders for insert
  with check (
    exists (
      select 1 from folders
      where folders.id = folder_id
      and folders.user_id = auth.uid()
    )
  );

create policy "Users can remove code snippets from folders"
  on code_snippets_folders for delete
  using (
    exists (
      select 1 from folders
      where folders.id = folder_id
      and folders.user_id = auth.uid()
    )
  );

create policy "Users can add tags to code snippets"
  on code_snippets_tags for insert
  with check (
    exists (
      select 1 from tags
      where tags.id = tag_id
      and tags.user_id = auth.uid()
    )
  );

create policy "Users can remove tags from code snippets"
  on code_snippets_tags for delete
  using (
    exists (
      select 1 from tags
      where tags.id = tag_id
      and tags.user_id = auth.uid()
    )
  );

-- Add policies for code_snippets table if not exists
create policy if not exists "Users can view all code snippets"
  on code_snippets for select
  using (true);

create policy if not exists "Users can create code snippets"
  on code_snippets for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their code snippets"
  on code_snippets for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their code snippets"
  on code_snippets for delete
  using (auth.uid() = user_id);
