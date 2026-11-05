-- Financial access must use financial_record_access per row.
-- A sector-level ALL policy would allow a financial employee to bypass that scope.
drop policy if exists employee_sector_boundary on public.financeiro_lancamentos;
drop policy if exists employee_sector_boundary on public.financeiro_baixas;

