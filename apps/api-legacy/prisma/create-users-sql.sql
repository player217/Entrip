-- Create users directly in database to bypass Prisma enum issues
-- This script creates users for all 4 companies with different roles

-- Company: J1 - 3 users (1 admin, 1 manager, 1 user)
INSERT INTO "User" (id, email, name, password, role, department, "companyCode", "isActive", "createdAt", "updatedAt", version)
VALUES 
  ('j1_admin_001', 'admin@j1.com', 'J1 관리자', '$2b$10$hash_placeholder', 'ADMIN', '경영진', 'J1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('j1_manager_001', 'manager1@j1.com', 'J1 매니저1', '$2b$10$hash_placeholder', 'MANAGER', '영업팀', 'J1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('j1_user_001', 'user1@j1.com', 'J1 일반사용자', '$2b$10$hash_placeholder', 'USER', '마케팅팀', 'J1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1);

-- Company: HAPPY - 2 users (1 admin, 1 manager)
INSERT INTO "User" (id, email, name, password, role, department, "companyCode", "isActive", "createdAt", "updatedAt", version)
VALUES 
  ('happy_admin_001', 'admin@happy.com', 'HAPPY 관리자', '$2b$10$hash_placeholder', 'ADMIN', '경영진', 'HAPPY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('happy_manager_001', 'manager@happy.com', 'HAPPY 매니저', '$2b$10$hash_placeholder', 'MANAGER', '고객지원팀', 'HAPPY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1);

-- Company: STAR - 2 users (1 admin, 1 manager)  
INSERT INTO "User" (id, email, name, password, role, department, "companyCode", "isActive", "createdAt", "updatedAt", version)
VALUES 
  ('star_admin_001', 'admin@star.com', 'STAR 관리자', '$2b$10$hash_placeholder', 'ADMIN', '경영진', 'STAR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('star_manager_001', 'manager@star.com', 'STAR 매니저', '$2b$10$hash_placeholder', 'MANAGER', '제작팀', 'STAR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1);

-- Company: ENTRIP_MAIN - 3 users (1 admin, 2 managers)
INSERT INTO "User" (id, email, name, password, role, department, "companyCode", "isActive", "createdAt", "updatedAt", version)
VALUES 
  ('entrip_admin_001', 'admin@entrip.com', 'ENTRIP 관리자', '$2b$10$hash_placeholder', 'ADMIN', '경영진', 'ENTRIP_MAIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('entrip_manager_001', 'manager@entrip.com', 'ENTRIP 매니저1', '$2b$10$hash_placeholder', 'MANAGER', '플랫폼개발팀', 'ENTRIP_MAIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('entrip_operator_001', 'operator@entrip.com', 'ENTRIP 운영자', '$2b$10$hash_placeholder', 'MANAGER', '운영팀', 'ENTRIP_MAIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1);

-- Verify the insertion
SELECT "companyCode", role, count(*) as user_count
FROM "User" 
GROUP BY "companyCode", role 
ORDER BY "companyCode", role;