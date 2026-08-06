set search_path = "ManagementSystem", extensions, public;

do $$
declare
  tid uuid := (select id from tenants where slug='cellular-citi');
  tpl uuid;
begin
  insert into checklist_templates (tenant_id, module, name, scope, sort_order)
  values (tid,'fleet','Daily roadworthiness','all vehicles',0) returning id into tpl;
  insert into checklist_items (tenant_id, template_id, label, kind, required, sort_order) values
   (tid,tpl,'Tyres & tread depth','Pass / fail',true,0),
   (tid,tpl,'Lights, indicators & hazards','Pass / fail',true,1),
   (tid,tpl,'Brakes & handbrake','Pass / fail',true,2),
   (tid,tpl,'Oil, coolant & water levels','Pass / fail',true,3),
   (tid,tpl,'Windscreen & wipers','Pass / fail',true,4),
   (tid,tpl,'Spare wheel, jack & triangle','Pass / fail',true,5),
   (tid,tpl,'Odometer photo','Photo',true,6),
   (tid,tpl,'Damage noted since last trip','Text',false,7);

  insert into checklist_templates (tenant_id, module, name, scope, sort_order)
  values (tid,'fleet','Weekly cleanliness','all vehicles',1) returning id into tpl;
  insert into checklist_items (tenant_id, template_id, label, kind, required, sort_order) values
   (tid,tpl,'Exterior washed','Photo',true,0),
   (tid,tpl,'Interior vacuumed','Photo',true,1),
   (tid,tpl,'Windows & mirrors clean','Pass / fail',true,2),
   (tid,tpl,'Branding decals intact','Pass / fail',true,3),
   (tid,tpl,'Wash receipt attached','Upload',true,4),
   (tid,tpl,'Cab clutter removed','Pass / fail',false,5),
   (tid,tpl,'Notes for fleet manager','Text',false,6);

  insert into checklist_templates (tenant_id, module, name, scope, sort_order)
  values (tid,'fleet','Monthly inspection','cars & vans',2) returning id into tpl;
  insert into checklist_items (tenant_id, template_id, label, kind, required, sort_order) values
   (tid,tpl,'Service book up to date','Pass / fail',true,0),
   (tid,tpl,'Licence disc valid','Photo',true,1),
   (tid,tpl,'Tyre pressures recorded','Number',true,2),
   (tid,tpl,'Battery terminals clean','Pass / fail',true,3),
   (tid,tpl,'Bodywork damage survey','Photo',true,4),
   (tid,tpl,'Fire extinguisher in date','Pass / fail',true,5),
   (tid,tpl,'First aid kit complete','Pass / fail',false,6),
   (tid,tpl,'Driver comments','Text',false,7);

  insert into checklist_templates (tenant_id, module, name, scope, sort_order)
  values (tid,'fleet','Trailer & LED screen','trailers',3) returning id into tpl;
  insert into checklist_items (tenant_id, template_id, label, kind, required, sort_order) values
   (tid,tpl,'Coupling & safety chains','Pass / fail',true,0),
   (tid,tpl,'Trailer lights working','Pass / fail',true,1),
   (tid,tpl,'LED screen powers on','Pass / fail',true,2),
   (tid,tpl,'Correct campaign playing','Photo',true,3),
   (tid,tpl,'Screen brightness & pixels','Pass / fail',true,4),
   (tid,tpl,'Generator fuel level','Number',true,5),
   (tid,tpl,'Campaign end date confirmed','Text',false,6);

  insert into checklist_templates (tenant_id, module, name, scope, sort_order)
  values (tid,'fleet','Vehicle handover','all vehicles',4) returning id into tpl;
  insert into checklist_items (tenant_id, template_id, label, kind, required, sort_order) values
   (tid,tpl,'Odometer at handover','Number',true,0),
   (tid,tpl,'Fuel level','Number',true,1),
   (tid,tpl,'Existing damage photos','Photo',true,2),
   (tid,tpl,'Accessories & tools present','Pass / fail',true,3),
   (tid,tpl,'Keys & remotes handed over','Number',true,4),
   (tid,tpl,'Outgoing driver signature','Signature',true,5),
   (tid,tpl,'Incoming driver signature','Signature',true,6);
end $$;
