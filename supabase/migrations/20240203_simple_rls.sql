-- Simple RLS policy to allow all operations
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users"
ON folders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
