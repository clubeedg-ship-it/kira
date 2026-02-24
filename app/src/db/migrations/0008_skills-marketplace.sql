-- Skills marketplace: add new columns to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS long_description text;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS subcategory varchar(64);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS author varchar(128) DEFAULT 'Kira Team';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS source_url varchar(512);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS version varchar(16) DEFAULT '1.0.0';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS tags text;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS downloads integer DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS rating real DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
