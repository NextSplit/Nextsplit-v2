-- Runner personal colour — shows on profile, share cards, squad
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS runner_colour text DEFAULT '#06b6d4';

-- Valid colours only (prevents injection via colour value)
ALTER TABLE profiles
ADD CONSTRAINT runner_colour_format 
CHECK (runner_colour ~ '^#[0-9a-fA-F]{6}$');
