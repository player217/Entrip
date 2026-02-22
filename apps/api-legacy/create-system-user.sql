-- Create system user
INSERT INTO "User" (
  id,
  email,
  password,
  name,
  role,
  "companyCode",
  "createdAt",
  "updatedAt"
) VALUES (
  'system',
  'system@entrip.com',
  '$2b$10$YourHashedPasswordHere', 
  'System User',
  'ADMIN',
  'ENTRIP_MAIN',
  NOW(),
  NOW()
);