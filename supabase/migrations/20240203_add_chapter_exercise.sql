-- Add chapter and exercise columns
ALTER TABLE folders 
ADD COLUMN is_chapter boolean DEFAULT false,
ADD COLUMN is_exercise boolean DEFAULT false;
