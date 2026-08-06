set search_path = "ManagementSystem", extensions, public;

insert into properties (tenant_id, icon, address, area, suburb, rent, lease_label, occupancy, status, tone)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('🏢','18 Kloof St, Unit 4B','Gardens, Cape Town','Gardens',12400,'Ends 31 Mar 2027','Occupied','Occupied','ok'),
 ('🏠','7 Protea Rd','Durbanville, Cape Town','Durbanville',15800,'Ends 30 Sep 2026','Occupied','Rent overdue','bad'),
 ('🏢','25 Belvedere Ave, Unit 12','Claremont, Cape Town','Claremont',10950,'Ends 31 Jan 2027','Occupied','Occupied','ok'),
 ('🏠','3 Rooikrans Cl','Table View, Cape Town','Table View',13600,'Ends 31 Aug 2026','Occupied','Renewal due','warn'),
 ('🏢','12 Loop St, Unit 806','CBD, Cape Town','CBD',11900,'Starts 01 Sep 2026','Vacant','Onboarding','info'),
 ('🏠','9 Sunset Ln','Milnerton, Cape Town','Milnerton',14200,'Available now','Vacant','Vacant','grey')
) as v(icon,address,area,suburb,rent,lease_label,occupancy,status,tone);

insert into property_tenants (tenant_id, name, initials, phone, property_label, area, lease_end, account, tone, since_label, fields, property_id, contact_id, user_id)
select (select id from tenants where slug='cellular-citi'), v.name, v.initials, v.phone, v.plabel, v.area, v.lease_end, v.account, v.tone, v.since, v.fields::jsonb,
  (select id from properties p where p.address = v.plabel and p.tenant_id=(select id from tenants where slug='cellular-citi')),
  (select id from contacts c where c.name = v.name and c.tenant_id=(select id from tenants where slug='cellular-citi')),
  case when v.name='Naledi Mahlangu' then (select id from users where email='naledi.m@outlook.com') end
from (values
 ('Naledi Mahlangu','NM','+27 82 555 0134','18 Kloof St, Unit 4B','Gardens, Cape Town','31 Mar 2027','Up to date','ok','Apr 2024',
  '[["Email","naledi.m@outlook.com"],["WhatsApp","+27 82 555 0134"],["Birthday","14 September"],["Holidays observed","Christmas, Easter"],["Employer","Sanlam — Bellville"],["Work contact","+27 21 947 0000"],["Next of kin","Thabo Mahlangu (brother)"],["Kin contact","+27 71 208 4412"]]'),
 ('Riaan van Wyk','RV','+27 83 441 7720','7 Protea Rd','Durbanville, Cape Town','30 Sep 2026','7 days overdue','bad','Oct 2022',
  '[["Email","riaan.vw@gmail.com"],["WhatsApp","+27 83 441 7720"],["Birthday","2 February"],["Holidays observed","Christmas"],["Employer","Bidvest — Epping"],["Work contact","+27 21 531 8800"],["Next of kin","Elmarie van Wyk (spouse)"],["Kin contact","+27 82 990 1187"]]'),
 ('Fatima Ismail','FI','+27 84 662 3391','25 Belvedere Ave, Unit 12','Claremont, Cape Town','31 Jan 2027','Up to date','ok','Feb 2025',
  '[["Email","f.ismail@mweb.co.za"],["WhatsApp","+27 84 662 3391"],["Birthday","30 June"],["Holidays observed","Eid al-Fitr, Eid al-Adha"],["Employer","Groote Schuur Hospital"],["Work contact","+27 21 404 9111"],["Next of kin","Yusuf Ismail (father)"],["Kin contact","+27 82 337 5510"]]'),
 ('Sizwe Dlamini','SD','+27 79 114 8802','3 Rooikrans Cl','Table View, Cape Town','31 Aug 2026','Renewal due','warn','Sep 2023',
  '[["Email","sizwe.d@icloud.com"],["WhatsApp","+27 79 114 8802"],["Birthday","11 December"],["Holidays observed","Christmas, Heritage Day"],["Employer","Discovery — Century City"],["Work contact","+27 21 526 3000"],["Next of kin","Ayanda Dlamini (sister)"],["Kin contact","+27 76 552 3319"]]'),
 ('Chantal Adams','CA','+27 81 703 2265','44 Main Rd, Unit 2','Muizenberg, Cape Town','30 Nov 2026','Up to date','ok','Dec 2024',
  '[["Email","chantal.a@gmail.com"],["WhatsApp","+27 81 703 2265"],["Birthday","5 May"],["Holidays observed","Christmas, Easter"],["Employer","Woolworths — Cavendish"],["Work contact","+27 21 674 4900"],["Next of kin","Rowena Adams (mother)"],["Kin contact","+27 72 118 6604"]]'),
 ('Themba Nkosi','TN','+27 73 889 4471','12 Loop St, Unit 806','CBD, Cape Town','28 Feb 2027','Onboarding','info','Aug 2026',
  '[["Email","themba.nkosi@work.co.za"],["WhatsApp","+27 73 889 4471"],["Birthday","23 March"],["Holidays observed","Christmas"],["Employer","Cellular Citi Group"],["Work contact","+27 21 000 1200"],["Next of kin","Lindiwe Nkosi (mother)"],["Kin contact","+27 82 445 9902"]]')
) as v(name,initials,phone,plabel,area,lease_end,account,tone,since,fields);

insert into documents (tenant_id, module, owner_type, owner_id, name, linked_to, status, tone, sort_order)
select pt.tenant_id, 'prop', 'property_tenant', pt.id, d.name, pt.name, d.status, d.tone, d.ord
from property_tenants pt
join (values
 ('Naledi Mahlangu','Signed lease agreement.pdf','Signed','ok',0),('Naledi Mahlangu','ID copy.pdf','Verified','ok',1),('Naledi Mahlangu','Proof of address.pdf','Verified','ok',2),('Naledi Mahlangu','Bank statement — 3 months.pdf','Verified','ok',3),('Naledi Mahlangu','Deposit receipt.pdf','Filed','info',4),('Naledi Mahlangu','Entry inspection.pdf','Filed','info',5),
 ('Riaan van Wyk','Signed lease agreement.pdf','Signed','ok',0),('Riaan van Wyk','ID copy.pdf','Verified','ok',1),('Riaan van Wyk','Proof of address.pdf','Expired','warn',2),('Riaan van Wyk','Bank statement — 3 months.pdf','Verified','ok',3),('Riaan van Wyk','Late payment notice.pdf','Sent','bad',4),
 ('Fatima Ismail','Signed lease agreement.pdf','Signed','ok',0),('Fatima Ismail','Passport copy.pdf','Verified','ok',1),('Fatima Ismail','Proof of address.pdf','Verified','ok',2),('Fatima Ismail','Bank statement — 3 months.pdf','Verified','ok',3),
 ('Sizwe Dlamini','Signed lease agreement.pdf','Signed','ok',0),('Sizwe Dlamini','ID copy.pdf','Verified','ok',1),('Sizwe Dlamini','Renewal offer.pdf','Awaiting signature','warn',2),('Sizwe Dlamini','Bank statement — 3 months.pdf','Verified','ok',3),
 ('Chantal Adams','Signed lease agreement.pdf','Signed','ok',0),('Chantal Adams','ID copy.pdf','Verified','ok',1),('Chantal Adams','Proof of address.pdf','Verified','ok',2),('Chantal Adams','Bank statement — 3 months.pdf','Verified','ok',3),
 ('Themba Nkosi','Draft lease agreement.pdf','Awaiting signature','warn',0),('Themba Nkosi','ID copy.pdf','Verified','ok',1),('Themba Nkosi','Proof of address.pdf','Outstanding','bad',2),('Themba Nkosi','Bank statement — 3 months.pdf','Verified','ok',3)
) as d(tname,name,status,tone,ord) on d.tname = pt.name
where pt.tenant_id = (select id from tenants where slug='cellular-citi');

insert into invoices (tenant_id, tenant_name, property_label, amount, due_label, method, status, tone, needs_chase, property_tenant_id)
select (select id from tenants where slug='cellular-citi'), v.*,
  (select id from property_tenants pt where pt.name = v.tname and pt.tenant_id=(select id from tenants where slug='cellular-citi'))
from (values
 ('Naledi Mahlangu','18 Kloof St 4B',12400,'01 Aug','Direct debit','Scheduled','info',false),
 ('Riaan van Wyk','7 Protea Rd',15800,'01 Jul','Payment link','7 days overdue','bad',true),
 ('Fatima Ismail','25 Belvedere 12',10950,'01 Jul','Direct debit','Paid','ok',false),
 ('Sizwe Dlamini','3 Rooikrans Cl',13600,'01 Jul','EFT','Paid','ok',false),
 ('Chantal Adams','44 Main Rd 2',9850,'01 Jul','Direct debit','Paid','ok',false),
 ('Themba Nkosi','12 Loop St 806',11900,'01 Sep','Direct debit','Pending lease','grey',false),
 ('M. Petersen','9 Sunset Ln',3200,'01 Jul','Payment link','2 days overdue','warn',true)
) as v(tname,property_label,amount,due_label,method,status,tone,needs_chase);

insert into leases (tenant_id, tenant_name, property_label, ends_label, rent, status, tone)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Sizwe Dlamini','3 Rooikrans Cl','31 Aug 2026',13600,'Offer sent','warn'),
 ('Riaan van Wyk','7 Protea Rd','30 Sep 2026',15800,'60-day notice','info'),
 ('Chantal Adams','44 Main Rd, Unit 2','30 Nov 2026',9850,'Not yet due','grey'),
 ('Fatima Ismail','25 Belvedere Ave','31 Jan 2027',10950,'Not yet due','grey')
) as v(tenant_name,property_label,ends_label,rent,status,tone);

insert into fault_jobs (tenant_id, ref, category, title, property_label, team, team_initials, stage, sla_label, tone, tenant_label, property_id)
select (select id from tenants where slug='cellular-citi'), v.ref, v.cat, v.title, v.plabel, v.team, v.ini, v.stage, v.sla, v.tone, v.tlabel,
  (select id from properties p where p.address = v.plabel and p.tenant_id=(select id from tenants where slug='cellular-citi'))
from (values
 ('MNT-2294','Electrical','Kitchen plug points dead','3 Rooikrans Cl','Unassigned','—','Logged','New','bad','Sizwe Dlamini'),
 ('MNT-2293','Other','Request: install shelving','25 Belvedere Ave, Unit 12','Unassigned','—','Logged','Quote','grey','Fatima Ismail'),
 ('MNT-2292','General Maintenance','Front gate motor sticking','9 Sunset Ln','Handy Fix SA','HF','Dispatched','18 h left','warn',null),
 ('MNT-2291','Plumbing','Burst geyser pipe, main bathroom','18 Kloof St, Unit 4B','Cape Plumbing Co','CP','In progress','On site','info','Naledi Mahlangu'),
 ('MNT-2288','Electrical','DB board trip replaced','7 Protea Rd','Volt Masters','VM','Completed','Signed off','ok','Riaan van Wyk'),
 ('MNT-2285','Plumbing','Leaking basin trap','25 Belvedere Ave, Unit 12','Cape Plumbing Co','CP','Completed','Signed off','ok','Fatima Ismail'),
 ('MNT-2296','Plumbing','Low water pressure — kitchen','44 Main Rd, Unit 2','Cape Plumbing Co','CP','Logged','New','bad','Chantal Adams')
) as v(ref,cat,title,plabel,team,ini,stage,sla,tone,tlabel);

insert into job_messages (tenant_id, job_id, direction, body, meta, created_at)
select j.tenant_id, j.id, m.dir, m.body, m.meta, now() - (m.ord || ' minutes')::interval
from fault_jobs j
join (values
 ('MNT-2291','in','Water is coming through the bathroom ceiling, I switched the geyser off.','Naledi · 07:12',400),
 ('MNT-2291','out','Thanks Naledi — job MNT-2291 logged. Cape Plumbing is on the way, ETA 09:30.','Head office · 07:19',393),
 ('MNT-2291','in','On site. Pipe joint failed, replacing 1.2 m of copper. Photos uploaded.','Sipho, Cape Plumbing · 09:41',251),
 ('MNT-2291','out','Approved to proceed. Please upload the invoice and after photo when done.','Head office · 09:44',248)
) as m(ref,dir,body,meta,ord) on m.ref = j.ref
where j.tenant_id = (select id from tenants where slug='cellular-citi');

insert into collection_history (tenant_id, month, pct, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values ('Feb',96,0),('Mar',92,1),('Apr',98,2),('May',91,3),('Jun',97,4),('Jul',95,5)) as v(month,pct,sort_order);

insert into onboarding_applications (tenant_id, applicant, property_label, current_step, status, data)
values ((select id from tenants where slug='cellular-citi'),'Themba Nkosi','12 Loop St, Unit 806',0,'In progress',
'{"Province":"Western Cape","City":"Cape Town","Suburb":"CBD","Full physical address":"12 Loop Street, Unit 806","Lease start":"01 Sep 2026","Lease end":"28 Feb 2027","Monthly rent":"R 11 900","Deposit":"R 23 800","Name":"Themba","Surname":"Nkosi","Contact number":"+27 73 889 4471","WhatsApp number":"+27 73 889 4471","Email address":"themba.nkosi@work.co.za","Birthday":"23 March 1993","Festive holidays celebrated":"Christmas, New Year","Place of work":"Cellular Citi Group","Position":"Regional Sales Lead","Work contact number":"+27 21 000 1200","Work email":"tnkosi@cellularciti.co.za","Gross monthly income":"R 42 000","Bank statement (3 months)":"Uploaded ✓","ID / passport number":"930323 5412 08 7","Document type":"SA ID","ID / passport copy":"Uploaded ✓","Proof of physical address":"Outstanding","Previous address":"9 Rose Street, Woodstock","Full name":"Lindiwe Nkosi","Relationship":"Mother","Alternative number":"+27 21 447 8891","Physical address":"9 Rose Street, Woodstock","Tenant":"Themba Nkosi","Property":"12 Loop St, Unit 806","Lease term":"01 Sep 2026 — 28 Feb 2027","Monthly rent (review)":"R 11 900","Documents complete":"3 of 4","Lease template":"Residential — 6 month"}'::jsonb);
