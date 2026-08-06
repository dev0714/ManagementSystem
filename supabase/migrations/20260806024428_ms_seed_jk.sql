set search_path = "ManagementSystem", extensions, public;

insert into prayer_times (tenant_id, name, hour, minute, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values ('Fajr',5,12,0),('Dhuhr',12,48,1),('Asr',16,12,2),('Maghrib',17,52,3),('Isha',19,8,4)) as v(name,hour,minute,sort_order);

insert into sites (tenant_id, name, suburb, lat, lng, manager_id)
select (select id from tenants where slug='cellular-citi'), v.name, v.suburb, v.lat, v.lng,
       (select id from users where email='yusuf@cellularciti.co.za')
from (values
 ('Masjid Al-Noor','Athlone',-33.9700,18.5100),
 ('Masjid As-Salaam','Rylands',-33.9670,18.5400),
 ('Masjid An-Nur','Gatesville',-33.9620,18.5230),
 ('Masjid Al-Ansaar','Lansdowne',-34.0000,18.4900),
 ('Masjid Al-Furqaan','Mitchells Plain',-34.0400,18.6200),
 ('Masjid Ar-Rahmah','Grassy Park',-34.0400,18.4900)
) as v(name,suburb,lat,lng);

insert into shifts (tenant_id, site_id, cleaner_name, clock_in_at, selfie_status, checklist_state, status, tone, user_id)
select s.tenant_id, s.id, v.cleaner, v.clockin, v.selfie, v.checklist, v.status, v.tone,
       case when v.cleaner = 'Ridwaan Peters' then (select id from users where email='ridwaan@cellularciti.co.za') end
from sites s
join (values
 ('Masjid Al-Noor','Ridwaan Peters','04:26','approved','Submitted · 1 flag','Ready','ok'),
 ('Masjid As-Salaam','Faheem Adams','04:31','approved','Not submitted','Overdue','bad'),
 ('Masjid An-Nur','Zainab Hendricks','05:04','approved','Complete','Late clock-in','warn'),
 ('Masjid Al-Ansaar','Shireen Jacobs','04:22','rejected','Complete','Uniform flag','warn'),
 ('Masjid Al-Furqaan','Moegamat Davids','04:18','approved','Complete','Ready','ok'),
 ('Masjid Ar-Rahmah','Nuraan Abrahams','04:29','approved','Complete','Ready','ok')
) as v(site,cleaner,clockin,selfie,checklist,status,tone) on v.site = s.name
where s.tenant_id = (select id from tenants where slug='cellular-citi');

with tpl as (
  insert into checklist_templates (tenant_id, module, name, scope, sort_order)
  values ((select id from tenants where slug='cellular-citi'),'jk','Salaah readiness','all sites',0)
  returning id, tenant_id
)
insert into checklist_items (tenant_id, template_id, label, kind, required, sort_order)
select tpl.tenant_id, tpl.id, v.label, 'Pass / fail', true, v.ord from tpl,
(values
 ('Wudu area washed & drains clear',0),
 ('Prayer mats straightened and vacuumed',1),
 ('Water taps running, no leaks',2),
 ('Soap, tissue & sanitiser stocked',3),
 ('Lights, fans & aircon on',4),
 ('Mic and speaker tested',5),
 ('Floors dry, bins emptied',6)
) as v(label,ord);

insert into maintenance_jobs (tenant_id, ref, fault, site_label, owner, repeat_flag, age_label, sla_label, tone, site_id)
select (select id from tenants where slug='cellular-citi'), v.ref, v.fault, v.site, v.owner, v.rep, v.age, v.sla, v.tone,
       (select id from sites where name = v.fullsite and tenant_id = (select id from tenants where slug='cellular-citi'))
from (values
 ('#4388','Geyser element failed','Al-Furqaan','T. Salie','Repeat ×3','51 h','Breached','bad','Masjid Al-Furqaan'),
 ('#4412','Wudu tap 3 leaking','Al-Noor','Unassigned',null,'18 m','47 h left','ok','Masjid Al-Noor'),
 ('#4401','Speaker distortion','An-Nur','K. Fortuin','Repeat ×2','31 h','17 h left','warn','Masjid An-Nur'),
 ('#4396','Extractor fan noisy','Al-Ansaar','T. Salie',null,'26 h','22 h left','warn','Masjid Al-Ansaar'),
 ('#4380','Carpet steamer down','Ar-Rahmah','K. Fortuin',null,'9 h','39 h left','ok','Masjid Ar-Rahmah')
) as v(ref,fault,site,owner,rep,age,sla,tone,fullsite);

insert into stock_items (tenant_id, name, level_pct, note, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Floor detergent (5 L)',11,'PO-2291 awaiting HQ approval',0),
 ('Carpet shampoo',38,'Reorder point 30%',1),
 ('Hand soap refill',12,'PO-2292 awaiting HQ approval',2),
 ('Paper tissue rolls',64,'Healthy',3),
 ('Air freshener',27,'Consumption 31% above average',4)
) as v(name,level_pct,note,sort_order);

insert into asset_reviews (tenant_id, name, site_label, fails, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values
 ('Geyser element — wudu block','Masjid Al-Furqaan','3 fails / 30 d',0),
 ('Ceiling speaker (rear)','Masjid An-Nur','2 fails / 30 d',1),
 ('Carpet steamer CS-04','Masjid Ar-Rahmah','2 fails / 30 d',2)
) as v(name,site_label,fails,sort_order);

insert into prayer_compliance (tenant_id, prayer, on_time_pct, late_pct, sort_order)
select (select id from tenants where slug='cellular-citi'), v.*
from (values ('Fajr',82,12,0),('Dhuhr',94,5,1),('Asr',88,9,2),('Maghrib',96,3,3),('Isha',91,6,4)) as v(prayer,on_time_pct,late_pct,sort_order);
