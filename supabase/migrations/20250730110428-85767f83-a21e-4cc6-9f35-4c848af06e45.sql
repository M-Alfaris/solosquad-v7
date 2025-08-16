-- Create the user_category enum type
CREATE TYPE user_category AS ENUM ('Business', 'Content Creator', 'Other');

-- Update the profiles table to properly use the enum type (if needed)
-- The table already references this type, so this ensures it exists