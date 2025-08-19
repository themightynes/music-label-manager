-- Add missing budget and economic decision columns to projects table
-- These columns are needed for the budget-quality integration

-- Add budget_per_song column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS budget_per_song INTEGER DEFAULT 0;

-- Add producer_tier column  
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS producer_tier TEXT DEFAULT 'local';

-- Add time_investment column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS time_investment TEXT DEFAULT 'standard';

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('budget_per_song', 'producer_tier', 'time_investment')
ORDER BY column_name;