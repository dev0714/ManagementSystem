set search_path = "ManagementSystem", extensions, public;

insert into kpis (tenant_id, board, label, value, delta, tone, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('group','Live alerts','9','2 critical, 4 high','bad',0),
 ('group','Staff on shift','27','1 no-show, 1 late','warn',1),
 ('group','Compliance today','91%','Checklists + logs','ok',2),
 ('group','Cash collected','R 486 300','94.8% of billed','ok',3),
 ('group','Open jobs','14','2 past SLA','bad',4),
 ('pipeline','Open pipeline','R 1.42 m','11 deals','info',0),
 ('pipeline','Weighted forecast','R 684 000','Close by Sep','ok',1),
 ('pipeline','Won this quarter','R 512 000','4 deals','ok',2),
 ('pipeline','Avg deal age','34 days','+6 vs Q1','warn',3),
 ('users','Total users','48','12 roles','info',0),
 ('users','Signed in today','31','65% of staff','ok',1),
 ('users','Temporary access','6','Contractors, auto-expiring','warn',2),
 ('users','Access reviews due','2','Quarterly POPIA review','bad',3),
 ('jk','On shift now','11 / 12','1 no-show','bad',0),
 ('jk','Checklists today','43 / 48','89.6% on time','ok',1),
 ('jk','Open jobs','7','1 past SLA','bad',2),
 ('jk','Uniform pass rate','94%','+3 pts vs last week','ok',3),
 ('jk_ops','Avg repair time','19.4 h','−2.8 h vs last month','ok',0),
 ('jk_ops','SLA compliance','92%','1 breach open','bad',1),
 ('jk_ops','Detergent spend','R 24 180','+18% vs forecast','warn',2),
 ('jk_ops','Attendance rate','96.2%','+1.4 pts','ok',3),
 ('jk_manager','My cleaners on shift','4 / 4','All clocked in','ok',0),
 ('jk_manager','Checklists this prayer','3 / 4','1 outstanding','bad',1),
 ('jk_manager','Uniform selfies','3 approved','1 rejected','warn',2),
 ('jk_manager','Open jobs at my sites','2','None past SLA','ok',3),
 ('fleet','Vehicles','14','13 on road · 1 in workshop','ok',0),
 ('fleet','Logs today','12 / 14','2 outstanding at 07:00','bad',1),
 ('fleet','Expiring in 30 days','5','2 licences · 3 discs','warn',2),
 ('fleet','Open repairs','3','1 past 36 h SLA','bad',3),
 ('fleet','Claims this month','R 118 420','+6% vs June','warn',4),
 ('fleet_claims','Awaiting my approval','4','R 10 125 total','warn',0),
 ('fleet_claims','Approved this week','9','R 19 480','ok',1),
 ('fleet_claims','Flagged variances','2','Km vs fuel mismatch','bad',2),
 ('fleet_claims','Month to date','R 118 420','+6% vs June','warn',3),
 ('prop','Properties','24','22 occupied · 2 vacant','ok',0),
 ('prop','Tenants','22','1 onboarding','info',1),
 ('prop','Collected in July','R 486 300','94.8% of billed','ok',2),
 ('prop','Overdue','R 26 500','3 tenants · 1 in penalty','bad',3),
 ('prop','Open faults','4','1 breaching SLA','warn',4),
 ('prop_invoicing','Billed July','R 512 800','24 invoices issued','info',0),
 ('prop_invoicing','Collected','R 486 300','94.8%','ok',1),
 ('prop_invoicing','Overdue','R 26 500','3 tenants','bad',2),
 ('prop_invoicing','Penalties raised','R 1 590','2 accounts','warn',3)
) as v(board,label,value,delta,tone,sort_order);

insert into alerts (tenant_id, module, severity, title, detail, location, rule, recipients, primary_action, whatsapp_body, created_at)
select (select id from tenants where slug='cellular-citi'), v.module, v.sev, v.title, v.detail, v.loc, v.rule, v.rcpt, v.act, v.wa, now() - (v.mins || ' minutes')::interval
from (values
 ('jk','CRITICAL','Salaah checklist not submitted','Masjid As-Salaam has not submitted the Asr readiness checklist. Deadline passed 15 minutes before the call.','Masjid As-Salaam — Rylands','Checklist overdue','Site Manager + HQ Admin','Call cleaner',E'\U0001F534 JK ALERT — CRITICAL\nMasjid As-Salaam (Rylands)\nAsr checklist NOT submitted.\nCleaner: Faheem Adams\nDue 15:57 · now 16:02\nReply 1 to call, 2 to reassign.',2),
 ('jk','HIGH','Equipment failure — wudu tap 3','Failed item on the readiness check. Maintenance job #4412 opened automatically and HQ Repairs notified.','Masjid Al-Noor — Athlone','Equipment failure','HQ Repairs Staff','Open job #4412',E'\U0001F7E0 JK JOB #4412\nMasjid Al-Noor (Athlone)\nWudu tap 3 — leaking, flagged on Asr check.\nSLA: 48h (due Thu 16:40)\nReply ACCEPT to take the job.',18),
 ('jk','HIGH','SLA breach — job open 51 h','Repair job #4388 has exceeded the 48-hour SLA and has been escalated to HQ Main Admin.','Masjid Al-Furqaan — Mitchells Plain','SLA violation','HQ Main Admin','Escalate',E'\U0001F7E0 SLA BREACH\nJob #4388 — Geyser element failed\nMasjid Al-Furqaan\nOpen 51h (limit 48h)\nEscalated to HQ Main Admin.',60),
 ('jk','MEDIUM','Late clock-in — 34 min','Cleaner clocked in 34 minutes after shift start. Punctuality flag added to today''s shift report.','Masjid An-Nur — Gatesville','Punctuality','Site Manager','Log reason',E'\U0001F7E1 LATE CLOCK-IN\nMasjid An-Nur (Gatesville)\nZainab Hendricks clocked in 05:04 (shift 04:30).\n34 min late — flagged on shift report.',120),
 ('jk','MEDIUM','Uniform selfie rejected','Submitted photo did not show the full uniform. Warning flag added to the daily shift report.','Masjid Al-Ansaar — Lansdowne','Uniform compliance','Site Manager','Request resubmit',E'\U0001F7E1 UNIFORM WARNING\nMasjid Al-Ansaar\nSelfie rejected — uniform not visible.\nWarning 1 of 3 this month.',180),
 ('jk','MEDIUM','Stock below 15% — floor detergent','Floor detergent at 11%. Purchase order drafted and held for HQ approval.','Masjid Al-Noor — Athlone','Inventory anomaly','HQ Admin','Approve PO',E'\U0001F7E1 STOCK LOW\nMasjid Al-Noor\nFloor detergent 11% (limit 15%)\nPO-2291 drafted — R1 840.\nReply APPROVE to release.',240),
 ('fleet','CRITICAL','Repair SLA breach imminent','CA 776-410 in workshop since Monday. Escalates to fleet director at 36 h.','CA 776-410 — Workshop','SLA violation','Fleet Manager + Director','Escalate',E'\U0001F534 FLEET SLA\nCA 776-410 in workshop 34h.\nEscalates to fleet director at 36h.',12),
 ('fleet','MEDIUM','Licence disc expired','CA 776-410 lapsed 4 July — vehicle must not be dispatched.','CA 776-410','Expiry','Fleet Manager','Renew disc',E'\U0001F7E1 DISC EXPIRED\nCA 776-410 licence disc lapsed 4 July.\nVehicle must not be dispatched.',300),
 ('prop','MEDIUM','Maintenance SLA at risk','MNT-2292 front gate motor — contractor has not confirmed arrival.','9 Sunset Ln — Milnerton','SLA risk','Property Admin','Chase contractor',E'\U0001F7E1 SLA AT RISK\nMNT-2292 front gate motor.\nContractor has not confirmed arrival.',48),
 ('prop','CRITICAL','Rent 7 days overdue','Riaan van Wyk, 7 Protea Rd — penalty applied, third reminder sent.','7 Protea Rd — Durbanville','Overdue ladder','Property Admin','Send demand',E'Good morning Riaan \U0001F44B\nYour July rent of R 15 800 for 7 Protea Rd is 7 days overdue.\nA late fee of R 790 has been added.\nPay now: pay.cellularciti.co.za/inv-4412\nReply HELP to arrange a payment plan.',180)
) as v(module,sev,title,detail,loc,rule,rcpt,act,wa,mins);

insert into trigger_rules (tenant_id, module, name, description, tone, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('jk','Outside GPS zone','Clock-in blocked, Site Manager notified on WhatsApp.','warn',0),
 ('jk','30 min after shift start','Punctuality alert to Site Manager.','warn',1),
 ('jk','Selfie missing or rejected','Uniform warning flag on the daily shift report.','warn',2),
 ('jk','Checklist not in by T−15','Critical alert to Site Manager and HQ Admin.','bad',3),
 ('jk','Checklist item failed','Maintenance job auto-created, HQ Repairs notified.','info',4),
 ('fleet','07:00 daily','Start of day log — opening km.','info',0),
 ('fleet','17:00 daily','End of day log, fuel/toll/work slips.','info',1),
 ('fleet','Friday 08:00','Car wash reminder, receipt required.','ok',2),
 ('fleet','Last working day','Monthly digital inspection form.','ok',3),
 ('fleet','30 days before expiry','Licence and disc renewal notices.','warn',4),
 ('fleet','Within 24 h of incident','Accident log to HR, fleet manager, insurer.','bad',5),
 ('prop','Invoice on the 25th','Email and WhatsApp with a one-click payment link.','info',0),
 ('prop','Overdue ladder','Day 3 reminder, day 7 penalty, day 14 escalation.','bad',1),
 ('prop','Fault logged','Auto-dispatch to the team for that category.','ok',2),
 ('prop','Lease expiry','Renewal offer 60 days before the end date.','warn',3),
 ('prop','Birthday & festive','Optional greeting on the dates captured at onboarding.','grey',4)
) as v(module,name,description,tone,sort_order);
