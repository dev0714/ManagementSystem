set search_path = "ManagementSystem", extensions, public;

insert into vehicles (tenant_id, icon, plate, model, vehicle_group, driver_name, odometer_label, service_label, service_pct, disc_expiry, disc_tone, inspection, wash, status, tone, driver_id)
select (select id from tenants where slug='cellular-citi'), v.icon, v.plate, v.model, v.grp, v.driver, v.odo, v.svc, v.pct, v.disc, v.dtone, v.insp, v.wash, v.status, v.tone,
  case when v.plate = 'CA 418-772' then (select id from users where email='marius@cellularciti.co.za') end
from (values
 ('🚐','CA 418-772','Toyota Quantum 2.5','Vans','M. Botha','128 412 km','840 km',82,'31 Aug 2026','ok','Submitted','Fri 24 Jul','On road','ok'),
 ('🚗','CA 201-556','VW Polo Vivo 1.4','Cars','L. Mokoena','64 190 km','2 300 km',44,'12 Aug 2026','warn','Submitted','Fri 24 Jul','On road','ok'),
 ('🚚','CA 776-410','Isuzu NPR 275','Trucks','S. Petersen','211 806 km','Overdue',100,'04 Jul 2026','bad','Missing','Overdue','In workshop','bad'),
 ('🚗','CA 330-118','Suzuki Swift GL','Cars','A. Fisher','38 004 km','5 100 km',22,'19 Nov 2026','ok','Submitted','Fri 24 Jul','On road','ok'),
 ('🚛','TRL 09-221','Marketing trailer + LED screen','Trailers','Shared','n/a','Screen check due',68,'28 Feb 2027','ok','Submitted','Fri 17 Jul','Campaign live','info'),
 ('🚐','CA 559-903','Hyundai H100','Vans','D. Julies','97 335 km','1 450 km',61,'09 Sep 2026','ok','Submitted','Missed','Wash overdue','warn')
) as v(icon,plate,model,grp,driver,odo,svc,pct,disc,dtone,insp,wash,status,tone);

insert into drivers (tenant_id, name, code, licence_expiry, prdp_expiry, status, tone, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Marius Botha','EB + PrDP','04 Mar 2029','18 Jan 2027','Valid','ok',0),
 ('Lerato Mokoena','B','12 Aug 2026','—','Renew in 14 d','warn',1),
 ('Shaun Petersen','EC + PrDP','22 Nov 2027','29 Aug 2026','PrDP due','warn',2),
 ('Ashley Fisher','B','07 Jun 2030','—','Valid','ok',3),
 ('Denver Julies','C1 + PrDP','15 Feb 2028','15 Feb 2028','Valid','ok',4),
 ('Nomsa Khumalo','B','03 Oct 2029','—','Valid','ok',5)
) as v(name,code,licence_expiry,prdp_expiry,status,tone,sort_order);

insert into expense_claims (tenant_id, driver_name, vehicle_plate, km, fuel, toll, status, tone, period_label, user_id)
select (select id from tenants where slug='cellular-citi'), v.driver, v.plate, v.km, v.fuel, v.toll, v.status, v.tone, '20 — 26 Jul',
  case when v.driver = 'M. Botha' then (select id from users where email='marius@cellularciti.co.za') end
from (values
 ('M. Botha','CA 418-772',842,3120,340,'Ready','ok'),
 ('L. Mokoena','CA 201-556',611,1980,120,'Ready','ok'),
 ('S. Petersen','CA 776-410',388,2640,610,'Slip missing','bad'),
 ('A. Fisher','CA 330-118',502,1410,0,'Ready','ok'),
 ('D. Julies','CA 559-903',719,2870,285,'Km variance 12%','warn'),
 ('N. Khumalo','CA 884-336',463,1660,95,'Approved','info')
) as v(driver,plate,km,fuel,toll,status,tone);

insert into incidents (tenant_id, title, detail, vehicle_plate, when_label, stage, sla_label, tone, dot_color)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Rear-end collision — N2 Borcherds Quarry','CA 776-410, driver S. Petersen. No injuries. Third-party details captured, photos attached.','CA 776-410','14 Jul','With insurer','Claim ref MIB-88214','warn','#FFC107'),
 ('Windscreen chip','CA 201-556 — repair booked with Glassfit for Thursday.','CA 201-556','21 Jul','Repair booked','No SLA risk','info','#007BFF'),
 ('Trailer coupling damage','TRL 09-221 reported on weekly check. Workshop assessment pending 34 h.','TRL 09-221','26 Jul','SLA at risk','Escalates at 36 h','bad','#DC3545'),
 ('Kerb strike — alloy damage','CA 330-118. Excess recovered from driver allowance, case closed.','CA 330-118','02 Jul','Closed','Resolved in 3 d','ok','#28A745')
) as v(title,detail,vehicle_plate,when_label,stage,sla_label,tone,dot_color);

insert into fleet_events (tenant_id, title, detail, when_label, day_of_month, color, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Weekly car wash','All 14 drivers · receipts required','Fri 08:00',31,'#28A745',0),
 ('Repair SLA escalation','CA 776-410 workshop delay — 36 h mark','Today 16:20',29,'#DC3545',1),
 ('Vehicle disc renewal','CA 776-410 expired 4 Jul · renew urgently','Overdue',14,'#DC3545',2),
 ('Driver licence expiry','L. Mokoena — 30 day notice sent','12 Aug',6,'#FFC107',3),
 ('Monthly inspection','Last working day · digital form','Fri 31 Jul',31,'#007BFF',4),
 ('Expense claim summary','Week 20–26 Jul to line managers','Mon 08:00',27,'#007BFF',5),
 ('Weekly car wash','All drivers · receipts required','Fri 08:00',3,'#28A745',6),
 ('Weekly car wash','All drivers · receipts required','Fri 08:00',10,'#28A745',7),
 ('Weekly car wash','All drivers · receipts required','Fri 08:00',17,'#28A745',8),
 ('Weekly car wash','All drivers · receipts required','Fri 08:00',24,'#28A745',9),
 ('Service booking','CA 559-903 · 1 450 km to service','Tue',20,'#FFC107',10)
) as v(title,detail,when_label,day_of_month,color,sort_order);

insert into expiries (tenant_id, item, who, due_label, status, tone, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Vehicle licence disc','CA 776-410','04 Jul 2026','Expired','bad',0),
 ('Driver licence','L. Mokoena','12 Aug 2026','14 days','warn',1),
 ('PrDP permit','S. Petersen','29 Aug 2026','31 days','warn',2),
 ('Vehicle licence disc','CA 418-772','31 Aug 2026','33 days','info',3),
 ('Service due','CA 559-903','1 450 km','Book now','warn',4),
 ('Trailer roadworthy','TRL 09-221','28 Feb 2027','Valid','ok',5)
) as v(item,who,due_label,status,tone,sort_order);

insert into claim_history (tenant_id, month, fuel_k, toll_k, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values ('Feb',74,12,0),('Mar',81,15,1),('Apr',78,11,2),('May',96,18,3),('Jun',88,14,4),('Jul',101,17,5)) as v(month,fuel_k,toll_k,sort_order);

insert into documents (tenant_id, module, owner_type, name, linked_to, uploaded_label, expires_label, status, tone, sort_order)
select (select id from tenants where slug='cellular-citi'), 'fleet', 'vehicle', v.*
from (values
 ('Licence disc — CA 418-772.pdf','CA 418-772','02 Sep 2025','31 Aug 2026','Valid','ok',0),
 ('Licence disc — CA 776-410.pdf','CA 776-410','05 Jul 2025','04 Jul 2026','Expired','bad',1),
 ('Driver licence — L. Mokoena.jpg','L. Mokoena','13 Aug 2021','12 Aug 2026','Renew','warn',2),
 ('Insurance schedule 2026.pdf','Whole fleet','11 Jan 2026','31 Dec 2026','Valid','ok',3),
 ('Service record — CA 559-903.pdf','CA 559-903','19 May 2026','—','Filed','info',4),
 ('Handover — CA 330-118.pdf','A. Fisher','01 Jun 2026','—','Signed','info',5),
 ('Accident report — 14 Jul.pdf','CA 776-410','14 Jul 2026','—','With insurer','warn',6)
) as v(name,linked_to,uploaded_label,expires_label,status,tone,sort_order);
