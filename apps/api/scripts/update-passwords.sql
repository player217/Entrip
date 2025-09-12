-- Update all users with correct bcrypt hash for 'pass1234'
UPDATE "User" 
SET password = '$2b$10$lT8wGf8IYyLnItP5KW5X8u1q/1OtbIWm6NVrvt3Y6gIgECJmc.ZQC'
WHERE password = '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G';