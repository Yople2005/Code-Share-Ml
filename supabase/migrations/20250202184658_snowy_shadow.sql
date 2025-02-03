/*
  # Initial Schema for Coding Notes Application

  1. New Tables
    - `subjects`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references auth.users)

    - `notes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `subject_id` (uuid, references subjects)
      - `folder` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, references auth.users)

    - `tags`
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamp)

    - `note_tags`
      - `note_id` (uuid, references notes)
      - `tag_id` (uuid, references tags)

    - `comments`
      - `id` (uuid, primary key)
      - `note_id` (uuid, references notes)
      - `content` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references auth.users)

    - `attachments`
      - `id` (uuid, primary key)
      - `note_id` (uuid, references notes)
      - `file_name` (text)
      - `file_type` (text)
      - `file_url` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated and anonymous users
*/

-- Create subjects table
CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subjects" ON subjects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create subjects" ON subjects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create notes table
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  folder text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notes" ON notes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create notes" ON notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Note owners can update their notes" ON notes
  FOR UPDATE USING (auth.uid() = created_by);

-- Create tags table
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tags" ON tags
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create note_tags junction table
CREATE TABLE note_tags (
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view note tags" ON note_tags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage note tags" ON note_tags
  FOR ALL USING (auth.role() = 'authenticated');

-- Create comments table
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Comment owners can update their comments" ON comments
  FOR UPDATE USING (auth.uid() = created_by);

-- Create attachments table
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view attachments" ON attachments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create attachments" ON attachments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create full-text search index for notes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX notes_title_content_search_idx ON notes
  USING GIN ((to_tsvector('english', title || ' ' || content)));