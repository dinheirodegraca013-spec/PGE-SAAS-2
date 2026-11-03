BEGIN;

-- Sector employees need project reads for financial links, never project management.
-- Restrictive command policies remain effective alongside legacy FOR ALL policies.
CREATE POLICY employee_projects_no_insert ON public.projetos_marcenaria
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_employee_sector()) IS NULL);

CREATE POLICY employee_projects_no_update ON public.projetos_marcenaria
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.current_employee_sector()) IS NULL)
  WITH CHECK ((SELECT private.current_employee_sector()) IS NULL);

CREATE POLICY employee_projects_no_delete ON public.projetos_marcenaria
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.current_employee_sector()) IS NULL);

COMMIT;
