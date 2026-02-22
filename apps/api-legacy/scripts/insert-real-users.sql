-- 실제 사용자 데이터 삽입 스크립트
-- 비밀번호는 모두 'pass1234'의 bcrypt 해시값

-- bcrypt 해시 생성: pass1234
-- $2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G

INSERT INTO "User" (id, email, name, password, role, "companyCode", "isActive", "createdAt", "updatedAt", version)
VALUES 
  -- ENTRIP_MAIN 회사
  ('cm5gzk8w90001w3a8khx6zkqr', 'admin@entrip.com', 'Entrip Admin', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'ADMIN', 'ENTRIP_MAIN', true, NOW(), NOW(), 1),
  ('cm5gzk8w90002w3a8khx6zkqs', 'manager@entrip.com', 'Entrip Manager', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'MANAGER', 'ENTRIP_MAIN', true, NOW(), NOW(), 1),
  ('cm5gzk8w90003w3a8khx6zkqt', 'user@entrip.com', 'Entrip User', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'USER', 'ENTRIP_MAIN', true, NOW(), NOW(), 1),
  
  -- j1 회사
  ('cm5gzk8w90004w3a8khx6zkqu', 'admin@j1.com', 'J1 Admin', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'ADMIN', 'j1', true, NOW(), NOW(), 1),
  ('cm5gzk8w90005w3a8khx6zkqv', 'manager@j1.com', 'J1 Manager', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'MANAGER', 'j1', true, NOW(), NOW(), 1),
  ('cm5gzk8w90006w3a8khx6zkqw', 'user1@j1.com', 'J1 User 1', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'USER', 'j1', true, NOW(), NOW(), 1),
  ('cm5gzk8w90007w3a8khx6zkqx', 'user2@j1.com', 'J1 User 2', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'USER', 'j1', true, NOW(), NOW(), 1),
  
  -- happy 회사
  ('cm5gzk8w90008w3a8khx6zkqy', 'admin@happy.com', 'Happy Admin', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'ADMIN', 'happy', true, NOW(), NOW(), 1),
  ('cm5gzk8w90009w3a8khx6zkqz', 'manager@happy.com', 'Happy Manager', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'MANAGER', 'happy', true, NOW(), NOW(), 1),
  ('cm5gzk8w90010w3a8khx6zkr0', 'user@happy.com', 'Happy User', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'USER', 'happy', true, NOW(), NOW(), 1),
  
  -- star 회사
  ('cm5gzk8w90011w3a8khx6zkr1', 'admin@star.com', 'Star Admin', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'ADMIN', 'star', true, NOW(), NOW(), 1),
  ('cm5gzk8w90012w3a8khx6zkr2', 'manager@star.com', 'Star Manager', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'MANAGER', 'star', true, NOW(), NOW(), 1),
  ('cm5gzk8w90013w3a8khx6zkr3', 'user@star.com', 'Star User', '$2b$10$ZX3uPvJTeQlpMX2Q3OXoVuPKNcV9qXMG7OvcKr2OeGMqKfRjxNb/G', 'USER', 'star', true, NOW(), NOW(), 1)
ON CONFLICT (email) DO NOTHING;