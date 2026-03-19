-- Add video_path column to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS video_path TEXT;
