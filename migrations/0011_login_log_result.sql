ALTER TABLE login_logs ADD COLUMN result TEXT NOT NULL DEFAULT 'success';
ALTER TABLE login_logs ADD COLUMN reason TEXT;
