set search_path = "ManagementSystem", extensions, public;

insert into kpis (tenant_id, board, label, value, delta, tone, sort_order)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('group','Live alerts','2','1 high','warn',0),
 ('group','Staff on shift','9','All clocked in','ok',1),
 ('group','Compliance today','97%','Checklists + logs','ok',2),
 ('group','Cash collected','R 118 400','98.1% of billed','ok',3),
 ('group','Open jobs','3','None past SLA','ok',4),
 ('fleet','Vehicles','6','6 on road','ok',0),
 ('fleet','Logs today','6 / 6','All in','ok',1),
 ('fleet','Expiring in 30 days','1','1 disc','warn',2),
 ('fleet','Open repairs','0','—','ok',3),
 ('fleet','Claims this month','R 41 200','−3% vs June','ok',4),
 ('prop','Properties','8','8 occupied · 0 vacant','ok',0),
 ('prop','Tenants','8','None onboarding','info',1),
 ('prop','Collected in July','R 118 400','98.1% of billed','ok',2),
 ('prop','Overdue','R 2 300','1 tenant','warn',3),
 ('prop','Open faults','1','None breaching SLA','ok',4),
 ('prop_invoicing','Billed July','R 120 700','8 invoices issued','info',0),
 ('prop_invoicing','Collected','R 118 400','98.1%','ok',1),
 ('prop_invoicing','Overdue','R 2 300','1 tenant','warn',2),
 ('prop_invoicing','Penalties raised','R 0','—','ok',3),
 ('pipeline','Open pipeline','R 260 000','3 deals','info',0),
 ('pipeline','Weighted forecast','R 130 000','Close by Oct','ok',1),
 ('pipeline','Won this quarter','R 95 000','1 deal','ok',2),
 ('pipeline','Avg deal age','21 days','−4 vs Q1','ok',3),
 ('users','Total users','3','3 roles','info',0),
 ('users','Signed in today','2','67% of staff','ok',1),
 ('users','Temporary access','0','—','ok',2),
 ('users','Access reviews due','0','Quarterly POPIA review','ok',3),
 ('fleet_claims','Awaiting my approval','1','R 2 140 total','warn',0),
 ('fleet_claims','Approved this week','4','R 8 900','ok',1),
 ('fleet_claims','Flagged variances','0','—','ok',2),
 ('fleet_claims','Month to date','R 41 200','−3% vs June','ok',3)
) as v(board,label,value,delta,tone,sort_order);

insert into contacts (tenant_id, name, initials, type, phone, email, linked_to, status, tone, role_line)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('Pieter Kruger','PK','Tenant','+27 82 411 6620','p.kruger@gmail.com','14 Loerie Str','Active','ok','Tenant since Jan 2025 · Stellenbosch'),
 ('Bosch Electrical','BE','Supplier','+27 21 887 3300','info@boschelec.co.za','1 open job','Approved','info','Electrical contractor · next-day SLA'),
 ('Winelands Logistics','WL','Prospect','+27 21 880 1100','ops@winelandslog.co.za','Fleet servicing tender','Proposal out','warn','Fleet servicing prospect')
) as v(name,initials,type,phone,email,linked_to,status,tone,role_line);

insert into contact_fields (tenant_id, contact_id, label, value, sort_order)
select c.tenant_id, c.id, f.label, f.value, f.ord
from contacts c join (values
 ('Pieter Kruger','Email','p.kruger@gmail.com',0),('Pieter Kruger','Account','Up to date',1),('Pieter Kruger','Owner','Ilse du Toit',2),('Pieter Kruger','Lease ends','31 Dec 2026',3),
 ('Bosch Electrical','Contact','Hannes Bosch',0),('Bosch Electrical','Rate card','R 590 / hr',1),('Bosch Electrical','Spend YTD','R 24 100',2),('Bosch Electrical','SLA hit rate','97%',3),
 ('Winelands Logistics','Contact','Renier Smit',0),('Winelands Logistics','Deal value','R 160 000',1),('Winelands Logistics','Stage','Proposal',2),('Winelands Logistics','Owner','Nadia Petersen',3)
) as f(cname,label,value,ord) on f.cname = c.name
where c.tenant_id = (select id from tenants where slug='atlas-group');

insert into deals (tenant_id, title, client, stage, value, owner_initials, source_module, age_label)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('Fleet servicing tender','Winelands Logistics','proposal',160000,'NP','fleet','9 d'),
 ('Managed letting — 3 units','Kruger Family Trust','qualified',100000,'ID','prop','14 d'),
 ('Depot cleaning contract','Atlas Depot Park','won',95000,'NP','prop','Jun')
) as v(title,client,stage,value,owner_initials,source_module,age_label);

insert into activity_events (tenant_id, module, severity, title, who, occurred_at)
select (select id from tenants where slug='atlas-group'), v.module, v.sev, v.title, v.who, now() - (v.ord||' minutes')::interval
from (values
 ('prop','success','Pieter Kruger paid R 9 400 by EFT','14 Loerie Str · Ilse du Toit · 08:40',30),
 ('fleet','info','All six start-of-day logs submitted','Depot · Bongani Zulu · 07:02',120),
 ('prop','info','Fault ATL-114 dispatched to Bosch Electrical','7 Dennehof · Ilse du Toit · Yesterday',1500),
 ('crm','info','Fleet servicing proposal sent','Winelands Logistics · Nadia Petersen · 2 days',3000)
) as v(module,sev,title,who,ord);

insert into tasks (tenant_id, title, meta, due_label, tone, is_done, sort_order)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('Chase Winelands tender feedback','CRM · R 160 000','Tomorrow','warn',false,0),
 ('Renew CJ 118-442 disc','Fleet · due 22 Aug','Fri','warn',false,1),
 ('File July collection report','Property · 98.1%','Done','ok',true,2)
) as v(title,meta,due_label,tone,is_done,sort_order);

insert into alerts (tenant_id, module, severity, title, detail, location, rule, recipients, primary_action, whatsapp_body, created_at)
select (select id from tenants where slug='atlas-group'), v.module, v.severity, v.title, v.detail, v.location, v.rule, v.recipients, v.primary_action, v.whatsapp_body, now() - (v.mins||' minutes')::interval
from (values
 ('fleet','HIGH','Licence disc expiring','CJ 118-442 disc expires 22 Aug — book renewal.','CJ 118-442','Expiry','Fleet Manager','Renew disc',E'\U0001F7E0 DISC EXPIRING\nCJ 118-442 expires 22 Aug.',90),
 ('prop','MEDIUM','Rent 2 days overdue','Unit 3 Dennehof — R 2 300 outstanding.','7 Dennehof','Overdue ladder','Property Admin','Send reminder',E'\U0001F7E1 RENT OVERDUE\nR 2 300 outstanding, 2 days.',400)
) as v(module,severity,title,detail,location,rule,recipients,primary_action,whatsapp_body,mins);

insert into trigger_rules (tenant_id, module, name, description, tone, sort_order)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('fleet','07:00 daily','Start of day log — opening km.','info',0),
 ('fleet','30 days before expiry','Licence and disc renewal notices.','warn',1),
 ('prop','Invoice on the 25th','Email and WhatsApp with a payment link.','info',0),
 ('prop','Overdue ladder','Day 3 reminder, day 7 penalty, day 14 escalation.','bad',1)
) as v(module,name,description,tone,sort_order);

insert into vehicles (tenant_id, icon, plate, model, vehicle_group, driver_name, odometer_label, service_label, service_pct, disc_expiry, disc_tone, inspection, wash, status, tone)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('🚗','CJ 118-442','Toyota Corolla Cross','Cars','R. Smit','44 210 km','3 200 km',31,'22 Aug 2026','warn','Submitted','Fri 24 Jul','On road','ok'),
 ('🚐','CJ 204-118','Ford Transit','Vans','J. Adams','88 640 km','1 900 km',54,'14 Mar 2027','ok','Submitted','Fri 24 Jul','On road','ok'),
 ('🚗','CJ 552-006','Hyundai i20','Cars','M. Louw','21 880 km','6 400 km',18,'02 Feb 2027','ok','Submitted','Fri 24 Jul','On road','ok')
) as v(icon,plate,model,vehicle_group,driver_name,odometer_label,service_label,service_pct,disc_expiry,disc_tone,inspection,wash,status,tone);

insert into drivers (tenant_id, name, code, licence_expiry, prdp_expiry, status, tone, sort_order)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('Renier Smit','B','19 Apr 2029','—','Valid','ok',0),
 ('Jaco Adams','C1 + PrDP','08 Jul 2028','08 Jul 2028','Valid','ok',1),
 ('Marlize Louw','B','30 Jan 2030','—','Valid','ok',2)
) as v(name,code,licence_expiry,prdp_expiry,status,tone,sort_order);

insert into expense_claims (tenant_id, driver_name, vehicle_plate, km, fuel, toll, status, tone, period_label)
select (select id from tenants where slug='atlas-group'), v.driver_name, v.vehicle_plate, v.km, v.fuel, v.toll, v.status, v.tone, '20 — 26 Jul'
from (values
 ('R. Smit','CJ 118-442',488,1740,120,'Ready','ok'),
 ('J. Adams','CJ 204-118',702,2410,260,'Approved','info'),
 ('M. Louw','CJ 552-006',311,980,0,'Ready','ok')
) as v(driver_name,vehicle_plate,km,fuel,toll,status,tone);

insert into expiries (tenant_id, item, who, due_label, status, tone, sort_order)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('Vehicle licence disc','CJ 118-442','22 Aug 2026','16 days','warn',0),
 ('Driver licence','J. Adams','08 Jul 2028','Valid','ok',1)
) as v(item,who,due_label,status,tone,sort_order);

insert into claim_history (tenant_id, month, fuel_k, toll_k, sort_order)
select (select id from tenants where slug='atlas-group'), v.*
from (values ('Feb',28,4,0),('Mar',31,5,1),('Apr',29,4,2),('May',35,6,3),('Jun',33,5,4),('Jul',34,7,5)) as v(month,fuel_k,toll_k,sort_order);

insert into fleet_events (tenant_id, title, detail, when_label, day_of_month, color, sort_order)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('Weekly car wash','All 3 drivers · receipts required','Fri 08:00',31,'#28A745',0),
 ('Disc renewal','CJ 118-442 expires 22 Aug','22 Aug',22,'#FFC107',1)
) as v(title,detail,when_label,day_of_month,color,sort_order);

insert into properties (tenant_id, icon, address, area, suburb, rent, lease_label, occupancy, status, tone)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('🏠','14 Loerie Str','Stellenbosch','Stellenbosch',9400,'Ends 31 Dec 2026','Occupied','Occupied','ok'),
 ('🏢','7 Dennehof, Unit 3','Paarl','Paarl',7800,'Ends 30 Jun 2027','Occupied','Rent overdue','warn'),
 ('🏠','22 Vergelegen Way','Somerset West','Somerset West',12100,'Ends 28 Feb 2027','Occupied','Occupied','ok')
) as v(icon,address,area,suburb,rent,lease_label,occupancy,status,tone);

insert into property_tenants (tenant_id, name, initials, phone, property_label, area, lease_end, account, tone, since_label, fields, property_id)
select (select id from tenants where slug='atlas-group'), v.name, v.ini, v.phone, v.plabel, v.area, v.lease, v.acct, v.tone, v.since, v.fields::jsonb,
 (select id from properties p where p.address = v.plabel and p.tenant_id=(select id from tenants where slug='atlas-group'))
from (values
 ('Pieter Kruger','PK','+27 82 411 6620','14 Loerie Str','Stellenbosch','31 Dec 2026','Up to date','ok','Jan 2025','[["Email","p.kruger@gmail.com"],["Birthday","9 August"],["Employer","Distell"],["Next of kin","Anja Kruger (spouse)"]]'),
 ('Sanele Mthembu','SM','+27 78 220 4417','7 Dennehof, Unit 3','Paarl','30 Jun 2027','2 days overdue','warn','Jul 2025','[["Email","s.mthembu@work.co.za"],["Birthday","3 January"],["Employer","PPC Cement"],["Next of kin","Zanele Mthembu (sister)"]]'),
 ('Elmien Botha','EB','+27 83 900 5512','22 Vergelegen Way','Somerset West','28 Feb 2027','Up to date','ok','Mar 2024','[["Email","elmien.b@icloud.com"],["Birthday","27 May"],["Employer","Mediclinic"],["Next of kin","Kobus Botha (father)"]]')
) as v(name,ini,phone,plabel,area,lease,acct,tone,since,fields);

insert into invoices (tenant_id, tenant_name, property_label, amount, due_label, method, status, tone, needs_chase)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('Pieter Kruger','14 Loerie Str',9400,'01 Jul','EFT','Paid','ok',false),
 ('Sanele Mthembu','7 Dennehof 3',7800,'01 Jul','Payment link','2 days overdue','warn',true),
 ('Elmien Botha','22 Vergelegen Way',12100,'01 Jul','Direct debit','Paid','ok',false)
) as v(tenant_name,property_label,amount,due_label,method,status,tone,needs_chase);

insert into leases (tenant_id, tenant_name, property_label, ends_label, rent, status, tone)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('Pieter Kruger','14 Loerie Str','31 Dec 2026',9400,'Not yet due','grey'),
 ('Elmien Botha','22 Vergelegen Way','28 Feb 2027',12100,'Not yet due','grey')
) as v(tenant_name,property_label,ends_label,rent,status,tone);

insert into fault_jobs (tenant_id, ref, category, title, property_label, team, team_initials, stage, sla_label, tone, tenant_label)
select (select id from tenants where slug='atlas-group'), v.*
from (values
 ('ATL-114','Electrical','Outside light circuit tripping','7 Dennehof, Unit 3','Bosch Electrical','BE','In progress','On site','info','Sanele Mthembu')
) as v(ref,category,title,property_label,team,team_initials,stage,sla_label,tone,tenant_label);

insert into collection_history (tenant_id, month, pct, sort_order)
select (select id from tenants where slug='atlas-group'), v.*
from (values ('Feb',99,0),('Mar',97,1),('Apr',98,2),('May',96,3),('Jun',99,4),('Jul',98,5)) as v(month,pct,sort_order);

insert into documents (tenant_id, module, owner_type, name, linked_to, uploaded_label, expires_label, status, tone, sort_order)
select (select id from tenants where slug='atlas-group'), 'fleet', 'vehicle', v.*
from (values
 ('Licence disc — CJ 118-442.pdf','CJ 118-442','23 Aug 2025','22 Aug 2026','Renew','warn',0),
 ('Insurance schedule 2026.pdf','Whole fleet','04 Jan 2026','31 Dec 2026','Valid','ok',1)
) as v(name,linked_to,uploaded_label,expires_label,status,tone,sort_order);
