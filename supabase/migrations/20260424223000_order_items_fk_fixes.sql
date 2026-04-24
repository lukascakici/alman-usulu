-- =====================================================================
-- order_items denormalize kolonlarına FK ekle
-- (initial migration'da unutulmuştu — PostgREST embed'leri için şart)
-- =====================================================================

alter table order_items
  add constraint order_items_table_session_fk
  foreign key (table_session_id) references table_sessions(id) on delete restrict;

alter table order_items
  add constraint order_items_tenant_fk
  foreign key (tenant_id) references tenants(id) on delete restrict;

alter table order_items
  add constraint order_items_branch_fk
  foreign key (branch_id) references branches(id) on delete restrict;

-- bill_claims'te de tenant/branch denormalize, FK ekle
alter table bill_claims
  add constraint bill_claims_tenant_fk
  foreign key (tenant_id) references tenants(id) on delete restrict;

alter table bill_claims
  add constraint bill_claims_branch_fk
  foreign key (branch_id) references branches(id) on delete restrict;

notify pgrst, 'reload schema';
