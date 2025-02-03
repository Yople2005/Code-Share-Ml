-- Add new columns to folders table
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS year_level text,
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES folders(id),
ADD COLUMN IF NOT EXISTS is_chapter boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_exercise boolean DEFAULT false;

-- Add constraint to year_level
ALTER TABLE folders 
ADD CONSTRAINT valid_year_level 
CHECK (year_level IN ('2nd Year', '3rd Year') OR year_level IS NULL);

-- Update existing folders to have default values
UPDATE folders 
SET is_chapter = false, 
    is_exercise = false 
WHERE is_chapter IS NULL 
   OR is_exercise IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_folders_year_level ON folders(year_level);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_is_chapter ON folders(is_chapter);
CREATE INDEX IF NOT EXISTS idx_folders_is_exercise ON folders(is_exercise);

-- Remove any existing article-related fields if they exist
ALTER TABLE folders DROP COLUMN IF EXISTS is_article;
