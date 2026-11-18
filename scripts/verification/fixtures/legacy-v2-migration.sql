INSERT INTO "User" (id,email,name,password,role,"companyCode","updatedAt") VALUES
 ('legacy-u1','legacy-admin@example.com','Legacy admin','preserve-password-hash','ADMIN','ENTRIP_MAIN','2025-01-01'),
 ('legacy-u2','legacy-guide@example.com','Legacy guide','preserve-guide-hash','GUIDE','star','2025-01-01'),
 ('legacy-u3','legacy-happy@example.com','Legacy happy','preserve-happy-hash','USER','happy','2025-01-01'),
 ('legacy-u4','legacy-member@example.com','Legacy member','preserve-member-hash','USER','ENTRIP_MAIN','2025-01-01');
INSERT INTO "Booking" (id,"teamName",type,origin,destination,"startDate","endDate",coordinator,status,"updatedAt","companyCode","userId",revenue) VALUES
 ('legacy-b1','Legacy golf','golf','ICN','NRT','2025-01-01','2025-01-04','Legacy manager','done','2025-01-01','ENTRIP_MAIN','legacy-u1',1250000),
 ('legacy-b2','Legacy airtel','airtel','PUS','KIX','2025-02-01','2025-02-03','Legacy guide','pending','2025-01-01','star','legacy-u2',800000);
INSERT INTO "BookingHistory" (id,"bookingId",action,changes,"performedById","performedAt") VALUES ('legacy-h1','legacy-b1','update','{"old":"pending","new":"done"}','legacy-u1','2025-01-04');
INSERT INTO "CalendarEvent" (id,title,start,"end",status,"createdBy","createdById","updatedAt","companyCode") VALUES ('legacy-cal','Legacy event','2025-01-01','2025-01-02','confirmed','Legacy free-text author','legacy-u1','2025-01-01','ENTRIP_MAIN');
INSERT INTO "FinanceRecord" (id,type,category,amount,"occurredAt",status,"createdById","approvedById","updatedAt","companyCode") VALUES ('legacy-fin','income','travel',500000,'2025-01-01','approved','legacy-u1','legacy-u1','2025-01-01','ENTRIP_MAIN');
INSERT INTO "Approval" (id,title,content,"targetType","targetId","requesterId","updatedAt","companyCode") VALUES ('legacy-approval','Legacy approval','Keep content','finance','legacy-fin','legacy-u1','2025-01-01','ENTRIP_MAIN');
INSERT INTO "ApprovalStep" (id,"approvalId","approverId","order",action,"updatedAt") VALUES ('legacy-step','legacy-approval','legacy-u4',0,'approve','2025-01-01');
INSERT INTO "Account" (id,name,email,"passwordHash",role,status,"updatedAt","companyCode") VALUES ('legacy-account','Legacy account','legacy-account@example.com','keep-account-password','staff','active','2025-01-01','ENTRIP_MAIN');
INSERT INTO "Conversation" (id,name,type,"createdBy","updatedAt") VALUES ('legacy-same','Same tenant','group','legacy-u1','2025-01-01'),('legacy-mixed','Mixed tenants','group','legacy-u1','2025-01-01'),('legacy-unknown','No known tenant','direct',NULL,'2025-01-01');
INSERT INTO "ConversationParticipant" (id,"conversationId","userId",role) VALUES ('legacy-p1','legacy-same','legacy-u1','owner'),('legacy-p2','legacy-same','legacy-u4','member'),('legacy-p3','legacy-mixed','legacy-u1','owner'),('legacy-p4','legacy-mixed','legacy-u2','member');
INSERT INTO "Message" (id,"conversationId","senderId",content,attachments,"updatedAt") VALUES ('legacy-m1','legacy-same','legacy-u1','Keep message','[{"name":"document.pdf","url":"/legacy/file.pdf"}]','2025-01-01'),('legacy-m2','legacy-mixed','legacy-u2','Keep mixed message',NULL,'2025-01-01');
INSERT INTO "MessageRead" (id,"messageId","userId") VALUES ('legacy-read','legacy-m1','legacy-u4');
INSERT INTO "MessageReaction" (id,"messageId","userId",emoji) VALUES ('legacy-reaction','legacy-m1','legacy-u4','👍');
INSERT INTO "UserPresence" (id,"userId",status,"updatedAt") VALUES ('legacy-presence','legacy-u1','online','2025-01-01');
