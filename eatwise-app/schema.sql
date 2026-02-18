-- Create pantry_items table
CREATE TABLE pantry_items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
