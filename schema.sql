-- Create users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create papers table
CREATE TABLE papers (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    progress DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create subjects table
CREATE TABLE subjects (
    id VARCHAR(255) PRIMARY KEY,
    paper_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    progress DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

-- Create subtopics table
CREATE TABLE subtopics (
    id VARCHAR(255) PRIMARY KEY,
    subject_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    progress DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Create lectures table
CREATE TABLE lectures (
    id VARCHAR(255) PRIMARY KEY,
    subtopic_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    topic VARCHAR(255),
    hours DECIMAL(5,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    notes TEXT,
    last_studied TIMESTAMP,
    progress DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_papers_user_id ON papers(user_id);
CREATE INDEX idx_subjects_paper_id ON subjects(paper_id);
CREATE INDEX idx_subtopics_subject_id ON subtopics(subject_id);
CREATE INDEX idx_lectures_subtopic_id ON lectures(subtopic_id);
CREATE INDEX idx_lectures_status ON lectures(status);
CREATE INDEX idx_lectures_last_studied ON lectures(last_studied);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_papers_updated_at
    BEFORE UPDATE ON papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtopics_updated_at
    BEFORE UPDATE ON subtopics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lectures_updated_at
    BEFORE UPDATE ON lectures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 