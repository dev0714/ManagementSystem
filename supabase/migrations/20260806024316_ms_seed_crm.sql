set search_path = "ManagementSystem", extensions, public;

insert into contacts (tenant_id, name, initials, type, phone, whatsapp, email, linked_to, status, tone, role_line)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Naledi Mahlangu','NM','Tenant','+27 82 555 0134','+27 82 555 0134','naledi.m@outlook.com','18 Kloof St, Unit 4B','Active','ok','Tenant since April 2024 · Gardens'),
 ('Cape Plumbing Co','CP','Supplier','+27 21 447 9021','+27 82 118 4409','info@capeplumbing.co.za','4 open jobs','Preferred','info','Plumbing contractor · 4 h response SLA'),
 ('Masjid Al-Noor Trust','MN','Client','+27 21 696 4412','+27 83 224 7781','trust@alnoor.co.za','Athlone facility','Contract','ok','Prayer facility client · 3-year contract'),
 ('Riaan van Wyk','RV','Tenant','+27 83 441 7720','+27 83 441 7720','riaan.vw@gmail.com','7 Protea Rd','7 days overdue','bad','Tenant since October 2022 · Durbanville'),
 ('Athlone Toyota','AT','Supplier','+27 21 637 2200','+27 82 771 0034','byron@athlonetoyota.co.za','6 vehicles serviced','Approved','info','Fleet service partner'),
 ('Shoprite Checkers','SC','Prospect','+27 21 980 4000',null,'m.barnard@shoprite.co.za','Mobile screen campaign','Proposal out','warn','Marketing trailer / LED screen prospect'),
 ('Faheem Adams','FA','Staff','+27 76 330 1187','+27 76 330 1187','faheem@cellularciti.co.za','Masjid As-Salaam','Flagged','warn','Cleaner · Rylands site'),
 ('Volt Masters','VM','Supplier','+27 21 555 8890','+27 84 220 9917','ashwin@voltmasters.co.za','2 open jobs','Approved','info','Electrical contractor · 4 h response SLA')
) as v(name,initials,type,phone,whatsapp,email,linked_to,status,tone,role_line);

insert into contact_fields (tenant_id, contact_id, label, value, sort_order)
select c.tenant_id, c.id, f.label, f.value, f.ord
from contacts c
join (values
 ('Naledi Mahlangu','Email','naledi.m@outlook.com',0),('Naledi Mahlangu','WhatsApp','+27 82 555 0134',1),('Naledi Mahlangu','Account','Up to date',2),('Naledi Mahlangu','Lifetime value','R 347 200',3),('Naledi Mahlangu','Owner','Lauren Pillay',4),('Naledi Mahlangu','Lease ends','31 Mar 2027',5),
 ('Cape Plumbing Co','Contact','Sipho Ndlovu',0),('Cape Plumbing Co','WhatsApp','+27 82 118 4409',1),('Cape Plumbing Co','Rate card','R 650 / hr',2),('Cape Plumbing Co','Spend YTD','R 184 300',3),('Cape Plumbing Co','SLA hit rate','94%',4),('Cape Plumbing Co','Insurance','Valid to Mar 2027',5),
 ('Masjid Al-Noor Trust','Primary contact','Imam Sedick Davids',0),('Masjid Al-Noor Trust','WhatsApp','+27 83 224 7781',1),('Masjid Al-Noor Trust','Contract value','R 486 000 / yr',2),('Masjid Al-Noor Trust','Renewal','01 Mar 2028',3),('Masjid Al-Noor Trust','Owner','Aadil Kader',4),('Masjid Al-Noor Trust','Sites','1 of 12',5),
 ('Riaan van Wyk','Email','riaan.vw@gmail.com',0),('Riaan van Wyk','WhatsApp','+27 83 441 7720',1),('Riaan van Wyk','Account','R 15 800 overdue',2),('Riaan van Wyk','Penalty','R 790 applied',3),('Riaan van Wyk','Owner','Lauren Pillay',4),('Riaan van Wyk','Lease ends','30 Sep 2026',5),
 ('Athlone Toyota','Contact','Byron Meyer',0),('Athlone Toyota','WhatsApp','+27 82 771 0034',1),('Athlone Toyota','Spend YTD','R 96 400',2),('Athlone Toyota','Avg turnaround','1.4 days',3),('Athlone Toyota','Owner','Tania Naidoo',4),('Athlone Toyota','Contract','Renews Jan 2027',5),
 ('Shoprite Checkers','Contact','Michelle Barnard',0),('Shoprite Checkers','Email','m.barnard@shoprite.co.za',1),('Shoprite Checkers','Deal value','R 240 000',2),('Shoprite Checkers','Stage','Proposal',3),('Shoprite Checkers','Owner','Zaid Hendricks',4),('Shoprite Checkers','Close date','15 Aug 2026',5),
 ('Faheem Adams','Email','faheem@cellularciti.co.za',0),('Faheem Adams','WhatsApp','+27 76 330 1187',1),('Faheem Adams','Shift','04:30 — 12:30',2),('Faheem Adams','Compliance','82% this month',3),('Faheem Adams','Manager','Yusuf Ebrahim',4),('Faheem Adams','Started','Feb 2023',5),
 ('Volt Masters','Contact','Ashwin Petersen',0),('Volt Masters','WhatsApp','+27 84 220 9917',1),('Volt Masters','Rate card','R 720 / hr',2),('Volt Masters','Spend YTD','R 71 900',3),('Volt Masters','SLA hit rate','88%',4),('Volt Masters','Insurance','Valid to Nov 2026',5)
) as f(cname,label,value,ord) on f.cname = c.name
where c.tenant_id = (select id from tenants where slug='cellular-citi');

-- contact timelines (cross-system)
insert into activity_events (tenant_id, module, severity, title, who, contact_id, occurred_at)
select c.tenant_id, e.module, 'info', e.title, e.whenlabel, c.id, now() - (e.ord || ' hours')::interval
from contacts c
join (values
 ('Naledi Mahlangu','prop','Fault MNT-2291 logged via WhatsApp — burst geyser pipe','Today 07:12',1),
 ('Naledi Mahlangu','prop','July invoice paid by direct debit','01 Jul',2),
 ('Naledi Mahlangu','crm','Renewal call logged by Lauren Pillay','18 Jun',3),
 ('Naledi Mahlangu','prop','Lease renewal offer accepted','14 Jun',4),
 ('Naledi Mahlangu','crm','Birthday greeting sent on WhatsApp','14 Sep 2025',5),
 ('Cape Plumbing Co','prop','Dispatched to MNT-2291 — 18 Kloof St','Today 07:19',1),
 ('Cape Plumbing Co','crm','Rate card renegotiated for 2026/27','02 Jul',2),
 ('Cape Plumbing Co','prop','Signed off MNT-2285 — leaking basin trap','24 Jun',3),
 ('Masjid Al-Noor Trust','jk','Asr checklist submitted — 1 item flagged','Today 15:41',1),
 ('Masjid Al-Noor Trust','jk','Job #4412 opened — wudu tap 3 leaking','Today 15:44',2),
 ('Masjid Al-Noor Trust','crm','Quarterly service review booked','20 Jul',3),
 ('Riaan van Wyk','prop','Third overdue reminder sent on WhatsApp','Yesterday 08:00',1),
 ('Riaan van Wyk','prop','Late fee of R 790 raised','08 Jul',2),
 ('Riaan van Wyk','crm','Payment plan discussed — call logged','05 Jul',3),
 ('Athlone Toyota','fleet','Service booking requested for CA 418-772','Today 09:02',1),
 ('Athlone Toyota','fleet','CA 559-903 service completed','19 May',2),
 ('Shoprite Checkers','crm','Proposal sent — 6 month LED campaign','22 Jul',1),
 ('Shoprite Checkers','crm','Site visit with 2 trailers','11 Jul',2),
 ('Shoprite Checkers','crm','Inbound enquiry via website','02 Jul',3),
 ('Faheem Adams','jk','Asr checklist not submitted — critical alert','Today 16:02',1),
 ('Faheem Adams','jk','Uniform selfie approved','Today 04:31',2),
 ('Faheem Adams','crm','Coaching note added by Site Manager','18 Jul',3),
 ('Volt Masters','prop','Signed off MNT-2288 — DB board trip','21 Jul',1),
 ('Volt Masters','crm','Added to preferred supplier list','01 Apr',2)
) as e(cname,module,title,whenlabel,ord) on e.cname = c.name
where c.tenant_id = (select id from tenants where slug='cellular-citi');

-- global activity feed
insert into activity_events (tenant_id, module, severity, title, who, occurred_at)
select (select id from tenants where slug='cellular-citi'), v.module, v.sev, v.title, v.who, now() - (v.ord || ' minutes')::interval
from (values
 ('jk','critical','Critical alert sent on WhatsApp — Asr checklist missing','Masjid As-Salaam · Faheem Adams · 16:02',2),
 ('jk','success','Asr readiness checklist submitted, 1 item flagged','Masjid Al-Noor · Ridwaan Peters · 15:41',24),
 ('prop','info','Job MNT-2291 dispatched to Cape Plumbing Co','18 Kloof St · Lauren Pillay · 07:19',60),
 ('prop','info','Fault logged via WhatsApp with 2 photos','18 Kloof St · Naledi Mahlangu · 07:12',67),
 ('fleet','info','Start of day log submitted — 128 412 km','CA 418-772 · Marius Botha · 06:41',98),
 ('crm','info','Proposal opened twice by the client','Shoprite Checkers · Zaid Hendricks · Yesterday',1500),
 ('fleet','medium','Expense claim held — fuel slip missing','S. Petersen · Derek Solomons · Yesterday',1600),
 ('prop','success','Lease renewal signed','Chantal Adams · Lauren Pillay · Yesterday',1700),
 ('fleet','critical','Accident logged and sent to insurer','CA 776-410 · Rehana Isaacs · 14 Jul',30000),
 ('jk','success','Uniform selfie approved','Masjid An-Nur · Zainab Hendricks · 04:31',200)
) as v(module,sev,title,who,ord);

insert into deals (tenant_id, title, client, stage, value, owner_initials, source_module, age_label)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Two-unit block, Observatory','Kaap Property Trust','enquiry',180000,'ZH','prop','3 d'),
 ('Branded trailer hire — 3 months','Bidvest Events','enquiry',130000,'TN','fleet','6 d'),
 ('Facility contract — 4 masjids, Bo-Kaap','Bo-Kaap Trust Council','qualified',420000,'AK','jk','11 d'),
 ('LED screen campaign — 6 months','Shoprite Checkers','proposal',240000,'ZH','fleet','7 d'),
 ('Managed letting — 8 units','Sunhill Investments','proposal',150000,'LP','prop','19 d'),
 ('Renewal — Masjid Al-Noor Trust','Masjid Al-Noor Trust','contract',486000,'AK','jk','2 d'),
 ('Managed letting — 4 units, Claremont','Belvedere Body Corporate','won',272000,'LP','prop','Jul'),
 ('Fleet servicing agreement 2026/27','Athlone Toyota','won',240000,'TN','fleet','Jun')
) as v(title,client,stage,value,owner_initials,source_module,age_label);

insert into tasks (tenant_id, title, meta, due_label, tone, is_done, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Approve PO-2291 — floor detergent','Masjid Ops · R 1 840','Today','bad',false,0),
 ('Call Riaan van Wyk about arrears','Property · R 15 800 overdue','Today','bad',false,1),
 ('Sign off Shoprite LED proposal','CRM · R 240 000','Tomorrow','warn',false,2),
 ('Renew CA 776-410 licence disc','Fleet · expired 4 Jul','Overdue','bad',false,3),
 ('Review Faheem Adams compliance','Masjid Ops · 82% this month','Fri','warn',false,4),
 ('Countersign Nkosi lease','Property · awaiting landlord','Done','ok',true,5)
) as v(title,meta,due_label,tone,is_done,sort_order);
