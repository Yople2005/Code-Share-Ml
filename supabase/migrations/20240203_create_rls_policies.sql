-- Enable RLS on tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for subjects table
CREATE POLICY "Allow all users to view subjects"
  ON subjects
  FOR SELECT
  USING (true);

CREATE POLICY "Allow only admins to insert subjects"
  ON subjects
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to update subjects"
  ON subjects
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to delete subjects"
  ON subjects
  FOR DELETE
  USING (auth.jwt()->>'role' = 'admin');

-- Create policies for notes table
CREATE POLICY "Allow all users to view notes"
  ON notes
  FOR SELECT
  USING (true);

CREATE POLICY "Allow only admins to insert notes"
  ON notes
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to update notes"
  ON notes
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to delete notes"
  ON notes
  FOR DELETE
  USING (auth.jwt()->>'role' = 'admin');

-- Create policies for attachments table
CREATE POLICY "Allow all users to view attachments"
  ON attachments
  FOR SELECT
  USING (true);

CREATE POLICY "Allow only admins to insert attachments"
  ON attachments
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to update attachments"
  ON attachments
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to delete attachments"
  ON attachments
  FOR DELETE
  USING (auth.jwt()->>'role' = 'admin');
