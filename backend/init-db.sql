-- Time Tracking Database Schema
-- This schema supports the time tracking application with PostgreSQL

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Metadata table to store system-level information
CREATE TABLE IF NOT EXISTS metadata (
    id SERIAL PRIMARY KEY,
    version VARCHAR(10) NOT NULL DEFAULT '1.0',
    last_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_entries INTEGER NOT NULL DEFAULT 0
);

-- Insert initial metadata if not exists
INSERT INTO metadata (version, last_modified, total_entries)
SELECT '1.0', NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM metadata);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    billable BOOLEAN NOT NULL DEFAULT false,
    total_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
    last_used DATE,
    last_saved TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    hours_away NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_hours NUMERIC(10, 2) NOT NULL,
    imported BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Project allocations within time entries (many-to-many relationship)
CREATE TABLE IF NOT EXISTS time_entry_projects (
    id SERIAL PRIMARY KEY,
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    project_id VARCHAR(50) NOT NULL, -- Stores the original project ID from frontend
    project_name VARCHAR(255) NOT NULL,
    billable BOOLEAN NOT NULL DEFAULT false,
    hours_allocated NUMERIC(10, 2) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_created_at ON time_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_time_entry_projects_time_entry_id ON time_entry_projects(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_time_entry_projects_project_name ON time_entry_projects(project_name);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_last_used ON projects(last_used);

-- Function to update metadata total_entries
CREATE OR REPLACE FUNCTION update_metadata_total_entries()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE metadata 
    SET total_entries = (SELECT COUNT(*) FROM time_entries),
        last_modified = NOW()
    WHERE id = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update metadata when time_entries changes
DROP TRIGGER IF EXISTS trigger_update_metadata ON time_entries;
CREATE TRIGGER trigger_update_metadata
AFTER INSERT OR DELETE ON time_entries
FOR EACH STATEMENT
EXECUTE FUNCTION update_metadata_total_entries();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_time_entries_updated_at ON time_entries;
CREATE TRIGGER trigger_time_entries_updated_at
BEFORE UPDATE ON time_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON projects;
CREATE TRIGGER trigger_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
