-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;

-- Create subjects table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attachments table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_subjects_parent_id ON subjects(parent_id);
CREATE INDEX idx_notes_subject_id ON notes(subject_id);
CREATE INDEX idx_attachments_note_id ON attachments(note_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attachments_updated_at ON attachments;
CREATE TRIGGER update_attachments_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all users to view subjects" ON subjects;
DROP POLICY IF EXISTS "Allow only admins to insert subjects" ON subjects;
DROP POLICY IF EXISTS "Allow only admins to update subjects" ON subjects;
DROP POLICY IF EXISTS "Allow only admins to delete subjects" ON subjects;

DROP POLICY IF EXISTS "Allow all users to view notes" ON notes;
DROP POLICY IF EXISTS "Allow only admins to insert notes" ON notes;
DROP POLICY IF EXISTS "Allow only admins to update notes" ON notes;
DROP POLICY IF EXISTS "Allow only admins to delete notes" ON notes;

DROP POLICY IF EXISTS "Allow all users to view attachments" ON attachments;
DROP POLICY IF EXISTS "Allow only admins to insert attachments" ON attachments;
DROP POLICY IF EXISTS "Allow only admins to update attachments" ON attachments;
DROP POLICY IF EXISTS "Allow only admins to delete attachments" ON attachments;

-- Create RLS policies
CREATE POLICY "Allow all users to view subjects"
    ON subjects FOR SELECT
    USING (true);

CREATE POLICY "Allow only admins to insert subjects"
    ON subjects FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to update subjects"
    ON subjects FOR UPDATE
    USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to delete subjects"
    ON subjects FOR DELETE
    USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow all users to view notes"
    ON notes FOR SELECT
    USING (true);

CREATE POLICY "Allow only admins to insert notes"
    ON notes FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to update notes"
    ON notes FOR UPDATE
    USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to delete notes"
    ON notes FOR DELETE
    USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow all users to view attachments"
    ON attachments FOR SELECT
    USING (true);

CREATE POLICY "Allow only admins to insert attachments"
    ON attachments FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to update attachments"
    ON attachments FOR UPDATE
    USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Allow only admins to delete attachments"
    ON attachments FOR DELETE
    USING (auth.jwt()->>'role' = 'admin');

-- Insert demo data
INSERT INTO subjects (name) VALUES
    ('Programming'),
    ('Design'),
    ('Project Management');

INSERT INTO notes (title, content, subject_id)
SELECT 
    'Getting Started with React',
    'React is a JavaScript library for building user interfaces...',
    id
FROM subjects 
WHERE name = 'Programming';
