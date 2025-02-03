-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON folders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON folders;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON folders;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON folders;

-- Enable RLS on folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" 
ON folders FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for admins" 
ON folders FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  )
);

CREATE POLICY "Enable update for admins" 
ON folders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  )
);

CREATE POLICY "Enable delete for admins" 
ON folders FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  )
);
