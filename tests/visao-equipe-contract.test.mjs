import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const nav = fs.readFileSync(
  new URL("../src/layouts/navigation.ts", import.meta.url),
  "utf8",
);
const appLayout = fs.readFileSync(
  new URL("../src/layouts/AppLayout.tsx", import.meta.url),
  "utf8",
);
const dashboard = fs.readFileSync(
  new URL("../src/views/dashboard/DashboardView.tsx", import.meta.url),
  "utf8",
);
const readOptional = (path) =>
  fs.existsSync(new URL(path, import.meta.url))
    ? fs.readFileSync(new URL(path, import.meta.url), "utf8")
    : "";
const visao = readOptional("../src/views/visao3d/Visao3DView.tsx");
const mapa3d = readOptional("../src/views/visao3d/ThreeOperationalMap.tsx");
const equipe = readOptional("../src/views/equipe/EquipeView.tsx");
const meuSetor = readOptional("../src/views/equipe/MeuSetorView.tsx");
const minhasTarefas = readOptional("../src/modules/workforce/components/MyTasks.tsx");
const resumoFuncionario = readOptional("../src/modules/workforce/components/PersonalWorkSummary.tsx");
const editorAcesso = readOptional("../src/modules/workforce/components/EmployeeAccessEditor.tsx");
const fichasFuncionario = readOptional("../src/modules/workforce/components/MyServiceSheets.tsx");
const notificacoesFuncionario = readOptional("../src/modules/workforce/components/WorkNotifications.tsx");
const gerenciadorDispositivos = readOptional("../src/components/DeviceManager.tsx");
const acessoWorkforce = readOptional("../src/modules/workforce/context/WorkforceAccessContext.tsx");
const workforceEvents = readOptional("../src/modules/workforce/lib/events.ts");
const agendaFuncionario = readOptional("../src/modules/workforce/components/AgendaPanel.tsx");
const historicoFuncionario = readOptional("../src/modules/workforce/components/MyActivityHistory.tsx");
const detalheTarefa = readOptional("../src/modules/workforce/components/TaskDetails.tsx");
const fichaTecnica = readOptional("../src/modules/workforce/components/ServiceTechnicalSheet.tsx");
const formularioFichaTecnica = readOptional("../src/modules/workforce/components/TechnicalSheetForm.tsx");
const technicalSheetService = readOptional("../src/modules/workforce/services/technical-sheet.service.ts");
const ocorrencias = readOptional("../src/modules/workforce/components/SheetIncidents.tsx");
const anexos = readOptional("../src/modules/workforce/components/SheetAttachments.tsx");
const aceiteInstalacao = readOptional("../src/modules/workforce/components/InstallationAcceptanceForm.tsx");
const solicitacaoMaterial = readOptional("../src/modules/workforce/components/MaterialRequestPanel.tsx");
const registroProducao = readOptional("../src/modules/workforce/components/ProductionLog.tsx");
const controleSecagem = readOptional("../src/modules/workforce/components/FinishingDryingControl.tsx");
const inboxMateriais = readOptional("../src/modules/workforce/components/MaterialRequestInbox.tsx");
const criacaoTarefa = readOptional("../src/modules/workforce/components/TaskCreationForm.tsx");
const atribuicaoFicha = readOptional("../src/modules/workforce/components/SheetAssignmentEditor.tsx");
const fluxoProducao = readOptional("../src/modules/workforce/components/ServicePipelineEditor.tsx");
const editorFuncionario = readOptional("../src/modules/workforce/components/EmployeeAccessEditor.tsx");
const fichaOperacional = readOptional("../src/modules/workforce/components/ServiceTechnicalSheet.tsx");
const ocorrenciasFuncionario = readOptional("../src/modules/workforce/components/SheetIncidents.tsx");

test("rotas autenticadas incluem Visão 3D e Equipe", () => {
  assert.match(app, /path="visao-3d"/);
  assert.match(app, /path="equipe"/);
});

test("menu lateral aponta para Visão 3D e Equipe", () => {
  assert.match(nav, /path: '\/visao-3d'/);
  assert.match(nav, /path: '\/equipe'/);
});

test("funcionário não recebe links administrativos de configurações", () => {
  assert.match(appLayout, /const employeeProfilePath = work\.context && !work\.context\.proprietario \? '\/meu-setor#perfil' : '\/configuracoes'/);
  assert.match(appLayout, /work\.context\?\.proprietario && <NavLink/);
  assert.match(appLayout, /to=\{employeeProfilePath\}/);
});

test("sino do funcionário abre a central de notificações do painel", () => {
  assert.match(appLayout, /to="\/meu-setor#notificacoes"/);
  assert.match(appLayout, /aria-label="Abrir notificações do funcionário"/);
  assert.match(appLayout, /work\.context && !work\.context\.proprietario && hasPermission\(work\.context, 'notificacoes'\) \? <NavLink/);
  assert.match(appLayout, /work\.context\?\.proprietario \? <button/);
});

test("cabeçalho acompanha o estado real da conexão", () => {
  assert.match(appLayout, /useState\(\(\) => typeof navigator === 'undefined' \|\| navigator\.onLine\)/);
  assert.match(appLayout, /addEventListener\('online', updateConnection\)/);
  assert.match(appLayout, /addEventListener\('offline', updateConnection\)/);
  assert.match(appLayout, /\{online \? 'Sistema online' : 'Sem conexão'\}/);
});

test("sino não inventa contador de notificações", () => {
  assert.doesNotMatch(appLayout, /bg-rose-500/);
});

test("perfil fecha o menu móvel ao navegar", () => {
  assert.match(appLayout, /to=\{employeeProfilePath\}\s*onClick=\{\(\) => setMobileMenuOpen\(false\)\}/);
});

test("atalho de recursos também fecha o menu móvel", () => {
  assert.match(appLayout, /to="\/configuracoes"\s*onClick=\{\(\) => setMobileMenuOpen\(false\)\}/);
});

test("visão operacional não incorpora os números demonstrativos do protótipo", () => {
  assert.doesNotMatch(visao, /R\$\s*10\.550|MDF 18mm \(chapa\).*6 de 10/);
  assert.match(visao, /estoque_itens|projetosService/);
});

test("Visão 3D usa renderização WebGL real com fallback", () => {
  assert.match(mapa3d, /WebGLRenderer/);
  assert.match(mapa3d, /OrbitControls/);
  assert.match(mapa3d, /activeWorkers/);
  assert.match(mapa3d, /workerName/);
  assert.match(mapa3d, /onSectorSelect/);
  assert.match(mapa3d, /O modo 3D não está disponível neste navegador/);
  assert.match(mapa3d, /setClearColor\(0xffffff, 1\)/);
  assert.doesNotMatch(mapa3d, /Modo 3D ativo/);
});

test("Visão 3D carrega o mapa pesado sob demanda", () => {
  assert.match(visao, /lazy\(\(\) => import\("\.\/ThreeOperationalMap"\)\)/);
  assert.match(visao, /Carregando visão 3D/);
  assert.match(visao, /<Suspense/);
});

test("Visão 3D mantém o painel lateral com alertas e equipe sem inventar presença", () => {
  assert.match(
    visao,
    /setores\.filter\(\(setor\) => setor\.estado === "critico"\)/,
  );
  assert.match(visao, /Equipe/);
  assert.match(visao, /Presença diária não registrada/);
  assert.match(visao, /value="nao-registrada"/);
  assert.match(visao, /onSectorSelect={abrirSetor}/);
});

test("equipe consulta profiles do tenant e explicita presença não registrada", () => {
  assert.match(equipe, /from\(["']profiles["']\)/);
  assert.match(equipe, /Presença não registrada/);
  assert.match(equipe, /Setor/);
});

test("dashboard oferece resumo para Visão 3D e Equipe", () => {
  assert.match(dashboard, /to="\/visao-3d"/);
  assert.match(dashboard, /to="\/equipe"/);
});

test("painel do funcionário mantém ações rápidas e dados reais do setor", () => {
  assert.match(meuSetor, /Painel do funcionário/);
  assert.match(meuSetor, /Ações rápidas/);
  assert.match(meuSetor, /hasPermission\(context, 'tarefas'\)/);
  assert.match(meuSetor, /meu_setor_projetos/);
  assert.match(meuSetor, /formatPrazo/);
  assert.match(meuSetor, /additionalSectors/);
  assert.match(meuSetor, /Tentar novamente/);
  assert.match(meuSetor, /aria-live="polite"/);
  assert.match(meuSetor, /atualizadoEm/);
  assert.match(meuSetor, /Atualizado às/);
});

test("painel não transforma carregamento ou erro de projetos em zero", () => {
  assert.match(meuSetor, /carregando \? '…' : erro \? 'Indisponível'/);
});

test("painel mantém projetos visíveis durante nova consulta", () => {
  assert.match(meuSetor, /carregando && !projetos\.length/);
  assert.match(meuSetor, /Atualizando projetos…/);
});

test("painel limpa o alerta após atualizar projetos com sucesso", () => {
  assert.match(meuSetor, /setErro\(''\);\s*setProjetos\(normalizeProjects\(data\)\)/);
});

test("painel nomeia a atualização dos projetos", () => {
  assert.match(meuSetor, /aria-label=\{carregando \? 'Atualizando painel' : !online \? 'Sem conexão para atualizar painel' : 'Atualizar painel'\}/);
  assert.match(meuSetor, /aria-label=\{`\$\{p\.titulo\} · \$\{formatPrazo\(p\.prazo\)\}\$\{status \? ` · \$\{status\}` : ''\}`\}/);
  assert.match(meuSetor, /<h3 className="min-w-0 break-words text-slate-900">\{p\.titulo\}<\/h3>/);
  assert.match(meuSetor, /<time className=\{`mt-2 block text-sm/);
  assert.match(meuSetor, /role="status" aria-live="polite" className="rounded-lg border border-dashed/);
});

test("ações administrativas da equipe têm nomes acessíveis", () => {
  const equipeView = readOptional("../src/views/equipe/EquipeView.tsx");
  assert.match(equipeView, /aria-label="Cadastrar novo funcionário"/);
  assert.match(equipeView, /aria-label=\{carregando \? 'Atualizando equipe' : 'Atualizar equipe'\}/);
  assert.match(equipeView, /aria-label="Encaminhar projeto para o setor selecionado"/);
  assert.match(equipeView, /aria-label="Tentar carregar projetos novamente"/);
});

test("busca de colaboradores anuncia a quantidade de resultados", () => {
  const equipeView = readOptional("../src/views/equipe/EquipeView.tsx");
  assert.match(equipeView, /role="status" aria-live="polite">\{busca \? `\$\{filtrados\.length\}/);
  assert.match(equipeView, /\$\{perfis\.length\} \$\{perfis\.length === 1 \? 'colaborador disponível' : 'colaboradores disponíveis'\}/);
});

test("busca de colaboradores usa campo de pesquisa controlado", () => {
  const equipeView = readOptional("../src/views/equipe/EquipeView.tsx");
  assert.match(equipeView, /<input\s+type="search"\s+aria-label="Buscar colaborador"\s+aria-controls="team-list-results"\s+maxLength=\{120\}\s+autoComplete="off"/);
});

test("busca de colaboradores limpa com Escape", () => {
  const equipeView = readOptional("../src/views/equipe/EquipeView.tsx");
  assert.match(equipeView, /event\.key === 'Escape'.*setBusca\('\'\)/);
});

test("cadastro informa o motivo quando o limite do plano bloqueia", () => {
  const equipeView = readOptional("../src/views/equipe/EquipeView.tsx");
  assert.match(equipeView, /title=\{!limits \? 'Carregando limite do plano' : limits\.sublogins_available <= 0 \? 'Limite de sublogins atingido' : undefined\}/);
});

test("busca da equipe aponta para sua lista de resultados", () => {
  const equipeView = readOptional("../src/views/equipe/EquipeView.tsx");
  assert.match(equipeView, /aria-label="Buscar colaborador"\s+aria-controls="team-list-results"/);
  assert.match(equipeView, /<section id="team-list-results" className="card overflow-hidden p-5"/);
});

test("solicitação de material relaciona bloqueio à mensagem de estoque vazio", () => {
  assert.match(solicitacaoMaterial, /id=\{`\$\{fieldPrefix\}-no-materials`\} role="status"/);
  assert.match(solicitacaoMaterial, /aria-describedby=\{!options\.length \? `\$\{fieldPrefix\}-no-materials` : undefined\}/);
});

test("histórico de materiais quebra textos longos sem deslocar ações", () => {
  assert.match(solicitacaoMaterial, /<span className="min-w-0 break-words"><strong>\{requestItem\.item_nome\}/);
  assert.match(solicitacaoMaterial, /<span className="flex shrink-0 items-center gap-2">/);
});

test("ficha técnica acomoda título longo junto do recarregamento", () => {
  assert.match(fichaTecnica, /<h3 className="min-w-0 break-words font-semibold">\{sheet\.modelo\.titulo\}<\/h3>/);
  assert.match(fichaTecnica, /<button type="button" className="btn-secondary shrink-0" aria-label="Recarregar ficha técnica"/);
});

test("painel não consulta projetos quando a validação de acesso falha", () => {
  assert.match(meuSetor, /if \(accessLoading \|\| accessError \|\| !context\)/);
  assert.match(meuSetor, /\[accessLoading, accessError, context,/);
});

test("painel de projetos participa da atualização global", () => {
  assert.match(meuSetor, /workforceRefreshEvent/);
  assert.match(meuSetor, /addEventListener\(workforceRefreshEvent, refreshPanel\)/);
  assert.match(meuSetor, /onClick=\{\(\) => requestWorkforceRefresh\(\)\}/);
});

test("painel remove projetos antigos quando a autorização é revogada", () => {
  assert.match(meuSetor, /if \(accessError\) \{\s*setProjetos\(\[\]\);\s*setAtualizadoEm\(null\);/);
});

test("painel anuncia sincronização global para tecnologia assistiva", () => {
  assert.match(meuSetor, /className="space-y-6" aria-busy=\{carregando \|\| accessLoading\}/);
});

test("painel informa conexão offline e retoma sincronização ao voltar", () => {
  assert.match(meuSetor, /window\.addEventListener\('online'/);
  assert.match(meuSetor, /window\.addEventListener\('offline'/);
  assert.match(meuSetor, /if \(isOnline\) requestWorkforceRefresh\(\)/);
  assert.match(meuSetor, /Sem conexão com a internet/);
  assert.match(meuSetor, /!online/);
});

test("gerenciador de dispositivos rejeita dados inconsistentes", () => {
  assert.match(gerenciadorDispositivos, /isDateString/);
  assert.match(gerenciadorDispositivos, /new Set\(devices\.map\(\(device: Device\) => device\.id\)\)/);
  assert.match(gerenciadorDispositivos, /length > data\.limit/);
});

test("revalidação do funcionário preserva contexto válido durante o carregamento", () => {
  assert.match(acessoWorkforce, /setContext\(current => current && current\.empresa_id===tenantId && current\.funcionario\.id===userId \? current : null\)/);
});

test("revalidação ignora respostas antigas após troca de identidade", () => {
  assert.match(acessoWorkforce, /const generation=useRef\(0\)/);
  assert.match(acessoWorkforce, /const request=\+\+generation\.current/);
  assert.match(acessoWorkforce, /request===generation\.current&&identity\.current\.userId===userId&&identity\.current\.tenantId===tenantId/);
  assert.match(acessoWorkforce, /useEffect\(\(\)=>\(\)=>\{generation\.current\+\+;\},\[\]\)/);
});

test("atualização do painel sincroniza os blocos de trabalho", () => {
  assert.match(workforceEvents, /workforceRefreshEvent/);
  assert.match(workforceEvents, /typeof window === 'undefined'/);
  assert.match(meuSetor, /requestWorkforceRefresh\(\)/);
  assert.match(minhasTarefas, /workforceRefreshEvent/);
  assert.match(notificacoesFuncionario, /workforceRefreshEvent/);
  assert.match(agendaFuncionario, /workforceRefreshEvent/);
  assert.match(historicoFuncionario, /workforceRefreshEvent/);
  assert.match(fichasFuncionario, /workforceRefreshEvent/);
  assert.match(resumoFuncionario, /workforceRefreshEvent/);
});

test("painel exibe perfil somente quando a permissão foi concedida", () => {
  assert.match(meuSetor, /hasPermission\(context,'perfil'\)/);
  assert.match(meuSetor, /id="perfil"/);
  assert.match(meuSetor, /employee-profile-title/);
  assert.match(meuSetor, /context\.funcionario\.ultimo_acesso/);
  assert.match(meuSetor, /Setores autorizados/);
});

test("ações rápidas possuem foco visível no teclado", () => {
  assert.match(meuSetor, /focus:ring-2 focus:ring-cyan-500/);
});

test("painel oferece atalho de teclado para as ações rápidas", () => {
  assert.match(meuSetor, /quickActions\.length > 0 && <a href="#quick-actions"/);
  assert.match(meuSetor, /href="#quick-actions"/);
  assert.match(meuSetor, /Pular para as ações rápidas/);
  assert.match(meuSetor, /id="quick-actions" tabIndex=\{-1\}/);
  assert.match(meuSetor, /!quickActions\.length && <p role="status" aria-live="polite"/);
});

test("saltos das ações rápidas devolvem foco à seção de destino", () => {
  assert.match(meuSetor, /window\.addEventListener\('hashchange', focusHashTarget\)/);
  assert.match(meuSetor, /window\.requestAnimationFrame\(focusHashTarget\)/);
  assert.match(meuSetor, /window\.cancelAnimationFrame\(frame\)/);
  assert.match(meuSetor, /lastFocusedHash\.current === id && document\.activeElement === target/);
  assert.match(meuSetor, /\}, \[accessRenderKey\]\)/);
  assert.match(meuSetor, /target\.setAttribute\('tabindex', '-1'\); target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(meuSetor, /id="tarefas" tabIndex=\{-1\}/);
  assert.match(meuSetor, /id="agenda" tabIndex=\{-1\}/);
});

test("painel preserva a última atualização durante nova consulta", () => {
  assert.match(meuSetor, /const contextKey = context \? `\$\{context\.empresa_id\}:\$\{context\.funcionario\.id\}` : '';\s*if \(contextKey !== lastContextKey\.current\)/);
  assert.match(meuSetor, /if \(accessError\) \{\s*setProjetos\(\[\]\);\s*setAtualizadoEm\(null\);/);
});

test("tarefas do funcionário permitem recuperar falhas de carregamento", () => {
  assert.match(minhasTarefas, /Tentar novamente/);
  assert.match(minhasTarefas, /aria-live="polite"/);
  assert.match(minhasTarefas, /setRefresh\(n=>n\+1\)/);
});

test("tarefas refletem imediatamente status e progresso selecionados", () => {
  assert.match(minhasTarefas, /aria-label=\{`Tarefa \$\{task\.titulo\} · \$\{formatTaskStatus\(displayedStatus\)\} · \$\{formatTaskSector\(task\.setor\)\} · Prioridade \$\{formatPriority\(task\.prioridade\)\} · \$\{task\.prazo\?`Prazo \$\{formatTaskDeadline\(task\.prazo\)\}`:'Sem prazo'\}\$\{overdue\?' · Atrasada':''\}`\}/);
  assert.match(minhasTarefas, /dateTime=\{safeTaskDateTime\(task\.prazo\)\}/);
  assert.match(minhasTarefas, /aria-describedby=\{`\$\{id\}-progress-help`\}/);
  assert.match(minhasTarefas, /aria-describedby=\{`\$\{id\}-notes-help`\}/);
  assert.match(minhasTarefas, /displayedStatus=final\?task\.status:status/);
  assert.match(minhasTarefas, /displayedProgress=displayedStatus==='concluida'\?100:progress/);
  assert.match(minhasTarefas, /type="number" inputMode="numeric" required min=\{0\} max=\{100\} step=\{1\}/);
  assert.match(minhasTarefas, /aria-valuetext=\{`\$\{safeDisplayedProgress\}% concluído`\}/);
});

test("tarefas destacam a prioridade com cores semânticas", () => {
  assert.match(minhasTarefas, /const priorityTone=/);
  assert.match(minhasTarefas, /urgente:'bg-rose-100 text-rose-800'/);
  assert.match(minhasTarefas, /priorityBadgeTone\(task\.prioridade\)/);
});

test("tarefas vencidas recebem destaque visual e acessível", () => {
  assert.match(minhasTarefas, /overdue\?'border-rose-200 bg-rose-50\/40':'border-slate-200'/);
  assert.match(minhasTarefas, /overdue\?' · Atrasada':''/);
  assert.match(minhasTarefas, /bg-rose-100 text-rose-800/);
});

test("tarefas próximas do prazo recebem aviso relativo", () => {
  assert.match(minhasTarefas, /function deadlineHint\(value:string\)/);
  assert.match(minhasTarefas, /Vence hoje/);
  assert.match(minhasTarefas, /Vence amanhã/);
  assert.match(minhasTarefas, /Vence em \$\{days\} dias/);
});

test("serviço de tarefas exige progresso inteiro", () => {
  const tarefasService = readOptional("../src/modules/workforce/services/tasks.service.ts");
  assert.match(tarefasService, /Number\.isInteger\(row\.progresso\)/);
  assert.match(tarefasService, /Number\.isInteger\(\(value as Record<string,unknown>\)\.progresso\)/);
});

test("painel quebra títulos longos em telas estreitas", () => {
  assert.match(minhasTarefas, /min-w-0 break-words font-semibold/);
  assert.match(minhasTarefas, /break-words whitespace-pre-wrap text-sm text-slate-600/);
  assert.match(agendaFuncionario, /min-w-0 flex-1/);
  assert.match(agendaFuncionario, /shrink-0 text-sm font-semibold/);
  assert.match(resumoFuncionario, /min-w-0 break-words/);
});

test("blocos operacionais quebram conteúdo longo no celular", () => {
  assert.match(ocorrencias, /min-w-0 space-y-2 rounded-lg/);
  assert.match(ocorrencias, /break-words whitespace-pre-wrap text-sm/);
  assert.match(fichasFuncionario, /min-w-0"><p className="break-words font-medium/);
  assert.match(inboxMateriais, /min-w-0 rounded-xl border/);
  assert.match(inboxMateriais, /break-words text-sm/);
});

test("tarefas informam a última atualização da lista", () => {
  assert.match(minhasTarefas, /updatedAt/);
  assert.match(minhasTarefas, /Última atualização às/);
  assert.match(minhasTarefas, /aria-busy=\{loading\}/);
});

test("tarefas limpam o horário anterior durante nova sincronização", () => {
  assert.match(minhasTarefas, /setData\(null\);setUpdatedAt\(null\)/);
});

test("tarefas preservam a lista durante nova sincronização", () => {
  assert.match(minhasTarefas, /setLoading\(true\);setError\('\'\);/);
  assert.match(minhasTarefas, /workTasks\.list\(page,filter\|\|null\)/);
  assert.match(minhasTarefas, /data \? 'Atualizando tarefas…' : 'Carregando tarefas…'/);
});

test("tarefas bloqueiam o filtro durante sincronização", () => {
  assert.match(minhasTarefas, /className=\"input-field mt-1\" disabled=\{loading\} value=\{filter\}/);
});

test("tarefas permitem limpar o filtro sem depender da lista vazia", () => {
  assert.match(minhasTarefas, /filter&&<button type=\"button\" className=\"btn-secondary\"/);
  assert.match(minhasTarefas, /aria-label=\"Limpar filtro de tarefas\"/);
  assert.match(minhasTarefas, /setFilter\(''\);setPage\(0\)/);
});

test("tarefas não enviam atualização sem mudança", () => {
  assert.match(minhasTarefas, /const dirty=status!==task\.status/);
  assert.match(minhasTarefas, /!dirty \|\| !hasPermission/);
});

test("tarefas informam a quantidade visível e a existência de mais páginas", () => {
  assert.match(minhasTarefas, /data&&!loading&&<p className="text-xs text-slate-500" role="status" aria-live="polite">/);
  assert.match(minhasTarefas, /data\.itens\.length===1\?'tarefa visível':'tarefas visíveis'/);
  assert.match(minhasTarefas, /data\.tem_mais\?' · Há mais tarefas disponíveis\.':''/);
});

test("tarefas identificam a paginação para tecnologia assistiva", () => {
  assert.match(minhasTarefas, /aria-label="Paginação de tarefas"/);
  assert.match(minhasTarefas, /aria-current="page"/);
});

test("tarefas ocultam paginação quando a primeira página está vazia", () => {
  assert.match(minhasTarefas, /data && \(data\.itens\.length \|\| page>0 \|\| data\.tem_mais\) && <nav aria-label="Paginação de tarefas"/);
});

test("tarefas atualizam ao retornar à aba", () => {
  assert.match(minhasTarefas, /addEventListener\('focus',refreshOnReturn\)/);
  assert.match(minhasTarefas, /addEventListener\('visibilitychange',refreshOnReturn\)/);
  assert.match(minhasTarefas, /removeEventListener\('focus',refreshOnReturn\)/);
  assert.match(minhasTarefas, /lastReturnRefresh/);
  assert.match(minhasTarefas, />1000/);
});

test("tarefas não consultam dados sem vínculo validado", () => {
  assert.match(minhasTarefas, /if\(accessLoading\)\{setData\(null\);setUpdatedAt\(null\);return/);
  assert.match(minhasTarefas, /if\(accessError\|\|!context\)\{setData\(null\);setUpdatedAt\(null\);setLoading\(false\)/);
  assert.match(minhasTarefas, /\[page,filter,refresh,accessLoading,accessError,context\?\.funcionario\.id,context\?\.funcionario\.versao\]/);
});

test("resumo do funcionário usa cores semânticas nos indicadores", () => {
  assert.match(resumoFuncionario, /function cardTone/);
  assert.match(resumoFuncionario, /Atrasadas/);
  assert.match(resumoFuncionario, /Concluídas/);
  assert.match(resumoFuncionario, /Em andamento/);
});

test("resumo informa atualização no botão durante carregamento", () => {
  assert.match(resumoFuncionario, /aria-label=\{loading\?'Atualizando indicadores':'Atualizar indicadores'\}/);
  assert.match(resumoFuncionario, /\{loading\?'Atualizando…':'Atualizar indicadores'\}/);
});

test("resumo preserva indicadores durante nova sincronização", () => {
  assert.match(resumoFuncionario, /setLoading\(true\);setError\('\'\);/);
  assert.match(resumoFuncionario, /Promise\.resolve\(\)\.then\(\(\)=>supabase\.rpc\('meu_resumo_operacional'\)/);
  assert.match(resumoFuncionario, /summary \? 'Atualizando indicadores…' : 'Carregando indicadores…'/);
});

test("resumo não consulta dados sem vínculo de funcionário validado", () => {
  assert.match(resumoFuncionario, /if\(accessLoading\)\{setSummary\(null\);setUpdatedAt\(null\);return/);
  assert.match(resumoFuncionario, /if\(accessError\|\|!context\)\{setSummary\(null\);setUpdatedAt\(null\);setLoading\(false\)/);
  assert.match(resumoFuncionario, /setSummary\(null\);setUpdatedAt\(null\);setLoading\(false\)/);
  assert.match(resumoFuncionario, /\[accessLoading,accessError,context\?\.funcionario\.id,context\?\.funcionario\.versao,retry\]/);
});

test("resumo nomeia cada indicador para acessibilidade", () => {
  assert.match(resumoFuncionario, /role="group"/);
  assert.match(resumoFuncionario, /card border p-4/);
  assert.match(resumoFuncionario, /aria-label=\{.*label.*value.*\}/);
});

test("resumo encaminha prazos para a lista quando a tarefa não está carregada", () => {
  assert.match(resumoFuncionario, /function focusTask\(taskId:string\)/);
  assert.match(resumoFuncionario, /scrollIntoView\(\{behavior:'smooth',block:'start'\}\)/);
  assert.match(resumoFuncionario, /aria-label=\{`Abrir a tarefa/);
});

test("indicadores de tarefas oferecem atalho acessível para a lista", () => {
  assert.match(resumoFuncionario, /function focusTaskList\(event\?:React\.MouseEvent<HTMLAnchorElement>\)/);
  assert.match(resumoFuncionario, /href="#tarefas" data-task-filter=\{taskFilter\|\|undefined\} onClick=\{focusTaskList\}/);
  assert.match(resumoFuncionario, /Abrir minhas tarefas/);
});

test("indicadores de status filtram a lista de tarefas", () => {
  assert.match(resumoFuncionario, /taskFilterEvent='gestio:filter-workforce-tasks'/);
  assert.match(resumoFuncionario, /data-task-filter=\{taskFilter\|\|undefined\}/);
  assert.match(minhasTarefas, /window\.addEventListener\(taskFilterEvent,applyFilter\)/);
  assert.match(minhasTarefas, /setFilter\(status as TaskStatus\);setPage\(0\)/);
});

test("resumo destaca urgência dos próximos prazos", () => {
  assert.match(resumoFuncionario, /function deadlineStatus\(value:string\)/);
  assert.match(resumoFuncionario, /Vence hoje/);
  assert.match(resumoFuncionario, /Vence amanhã/);
  assert.match(resumoFuncionario, /Vence em \$\{difference\} dias/);
  assert.match(resumoFuncionario, /status==='Atrasado'/);
});

test("editor de acesso permite repetir o carregamento", () => {
  assert.match(editorAcesso, /const \[retry,setRetry\]/);
  assert.match(editorAcesso, /\},\[userId,retry\]\)/);
  assert.match(editorAcesso, /aria-label="Recarregar o acesso do funcionário"/);
  assert.match(editorAcesso, /Tentar novamente/);
});

test("editor de acesso informa catálogo de permissões vazio", () => {
  assert.match(editorAcesso, /!catalog\.length/);
  assert.match(editorAcesso, /Nenhuma permissão está disponível para configuração/);
});

test("equipe recarrega após a sessão e o tenant ficarem disponíveis", () => {
  assert.match(equipe, /\}, \[administrador, usuario\?\.tenantId\]\)/);
});

test("equipe oferece retry contextual e anuncia o carregamento da lista", () => {
  assert.match(equipe, /Tentar novamente/);
  assert.match(equipe, /aria-busy=\{carregando\}/);
  assert.match(equipe, /role="status" aria-live="polite"/);
  assert.match(equipe, /role="status" aria-live="polite" className="rounded-xl/);
});

test("fichas de serviço expõem carregamento e paginação acessíveis", () => {
  assert.match(fichasFuncionario, /aria-busy=\{loading\}/);
  assert.match(fichasFuncionario, /aria-live="polite"/);
  assert.match(fichasFuncionario, /aria-label="Paginação de fichas de serviço"/);
  assert.match(fichasFuncionario, /aria-current="page"/);
  assert.match(fichasFuncionario, /Tentar novamente/);
});

test("fichas não consultam dados sem vínculo validado", () => {
  assert.match(fichasFuncionario, /if \(accessLoading\) \{ setList\(null\); setSelected\(null\); setUpdatedAt\(null\); return/);
  assert.match(fichasFuncionario, /if \(accessError \|\| !context\) \{ setList\(null\); setSelected\(null\); setUpdatedAt\(null\); setLoading\(false\)/);
  assert.match(fichasFuncionario, /\[page, query, refresh, accessLoading, accessError, context\?\.funcionario\.id, context\?\.funcionario\.versao\]/);
});

test("fichas exibem a última atualização recebida", () => {
  assert.match(fichasFuncionario, /formatSheetUpdate/);
  assert.match(fichasFuncionario, /dateTime=\{safeSheetDateTime\(item\.atualizado_em\)\}/);
});

test("fichas de serviço nomeiam título, setor e atualização", () => {
  assert.match(fichasFuncionario, /aria-label=\{`Ficha \$\{item\.titulo\} · \$\{isSetor\(item\.setor\) \? setores\[item\.setor\] : item\.setor\} · \$\{formatSheetUpdate\(item\.atualizado_em\)\}`\}/);
});

test("fichas informam a quantidade visível e a existência de mais páginas", () => {
  assert.match(fichasFuncionario, /list\.itens\.length === 1 \? 'ficha visível' : 'fichas visíveis'/);
  assert.match(fichasFuncionario, /list\.tem_mais \? ' · Há mais fichas disponíveis\.' : ''/);
});

test("fichas diferenciam carga inicial de sincronização", () => {
  assert.match(fichasFuncionario, /list \? 'Atualizando fichas…' : 'Carregando fichas…'/);
});

test("pesquisa de fichas informa o estado do botão", () => {
  assert.match(fichasFuncionario, /aria-label=\{loading\?'Pesquisando fichas':'Pesquisar fichas'\}/);
  assert.match(fichasFuncionario, /\{loading\?'Pesquisando…':'Pesquisar'\}/);
  assert.match(fichasFuncionario, /<input type="search" className="input-field"/);
});

test("notificações permitem retry e paginação acessível", () => {
  assert.match(notificacoesFuncionario, /aria-live="polite"/);
  assert.match(notificacoesFuncionario, /Tentar novamente/);
  assert.match(notificacoesFuncionario, /aria-label="Paginação de notificações"/);
  assert.match(notificacoesFuncionario, /aria-current="page"/);
});

test("notificações ocultam paginação quando vazias", () => {
  assert.match(notificacoesFuncionario, /data && \(data\.itens\.length \|\| page>0 \|\| data\.tem_mais\) && <nav aria-label="Paginação de notificações"/);
});

test("notificações atualizam ao retornar à aba", () => {
  assert.match(notificacoesFuncionario, /addEventListener\('focus',refreshOnReturn\)/);
  assert.match(notificacoesFuncionario, /addEventListener\('visibilitychange',refreshOnReturn\)/);
  assert.match(notificacoesFuncionario, /removeEventListener\('visibilitychange',refreshOnReturn\)/);
  assert.match(notificacoesFuncionario, /lastReturnRefresh/);
  assert.match(notificacoesFuncionario, />1000/);
});

test("agenda do funcionário informa carregamento, valida período e permite retry", () => {
  assert.match(agendaFuncionario, /aria-busy=\{loading\}/);
  assert.match(agendaFuncionario, /aria-live="polite"/);
  assert.match(agendaFuncionario, /required disabled=\{loading\}/);
  assert.match(agendaFuncionario, /Tentar novamente/);
  assert.match(agendaFuncionario, /!start\|\|!end/);
  assert.match(agendaFuncionario, /max=\{end\|\|undefined\}/);
  assert.match(agendaFuncionario, /min=\{start\|\|undefined\}/);
  assert.match(agendaFuncionario, /aria-invalid=\{invalidRange\|\|undefined\}/);
  assert.match(agendaFuncionario, /aria-label=\{`\$\{item\.titulo\|\|'Atividade sem título'\} · \$\{formatAgendaDate\(item\.inicio\)\} · \$\{formatAgendaStatus\(item\.status\)\}/);
});

test("agenda informa atualização no botão", () => {
  assert.match(agendaFuncionario, /aria-label=\{loading\?'Atualizando agenda':'Atualizar agenda'\}/);
  assert.match(agendaFuncionario, /\{loading\?'Atualizando…':'Atualizar'\}/);
});

test("agenda destaca urgência das atividades", () => {
  assert.match(agendaFuncionario, /const agendaTiming=\(value:string,status:string\)=>/);
  assert.match(agendaFuncionario, /'Atrasada'/);
  assert.match(agendaFuncionario, /'Hoje'/);
  assert.match(agendaFuncionario, /'Amanhã'/);
  assert.match(agendaFuncionario, /`Em \$\{days\} dias`/);
});

test("histórico do funcionário oferece retry e paginação acessível", () => {
  assert.match(historicoFuncionario, /aria-busy=\{loading\}/);
  assert.match(historicoFuncionario, /aria-live="polite"/);
  assert.match(historicoFuncionario, /Tentar novamente/);
  assert.match(historicoFuncionario, /aria-label="Paginação do histórico de atividades"/);
  assert.match(historicoFuncionario, /aria-current="page"/);
  assert.match(historicoFuncionario, /aria-label=\{`\$\{labels\[item\.acao\]\|\|'Atividade registrada'\}/);
});

test("histórico informa atualização no botão", () => {
  assert.match(historicoFuncionario, /aria-label=\{loading\?'Atualizando histórico':'Atualizar histórico'\}/);
  assert.match(historicoFuncionario, /\{loading\?'Atualizando…':'Atualizar histórico'\}/);
});

test("histórico diferencia carga inicial de sincronização", () => {
  assert.match(historicoFuncionario, /data \? 'Atualizando histórico…' : 'Carregando histórico…'/);
});

test("histórico informa a quantidade visível e a existência de mais páginas", () => {
  assert.match(historicoFuncionario, /data\.itens\.length===1\?'atividade visível':'atividades visíveis'/);
  assert.match(historicoFuncionario, /data\.tem_mais\?' · Há mais atividades disponíveis\.':''/);
});

test("histórico e fichas ocultam paginação quando vazios", () => {
  assert.match(historicoFuncionario, /data && \(data\.itens\.length \|\| page>0 \|\| data\.tem_mais\) && <nav aria-label="Paginação do histórico de atividades"/);
  assert.match(fichasFuncionario, /list && \(list\.itens\.length \|\| page>0 \|\| list\.tem_mais\) && <nav aria-label="Paginação de fichas de serviço"/);
});

test("paginação do funcionário quebra em telas estreitas", () => {
  assert.match(minhasTarefas, /aria-label="Paginação de tarefas"[^>]*className="flex flex-wrap items-center gap-3"/);
  assert.match(historicoFuncionario, /aria-label="Paginação do histórico de atividades"[^>]*className="flex flex-wrap items-center gap-3"/);
  assert.match(fichasFuncionario, /aria-label="Paginação de fichas de serviço"[^>]*className="flex flex-wrap items-center gap-3"/);
  assert.match(notificacoesFuncionario, /aria-label="Paginação de notificações"[^>]*className="flex flex-wrap items-center gap-3"/);
});

test("busca de fichas e atalhos da agenda têm semântica acessível", () => {
  assert.match(fichasFuncionario, /<form className="flex flex-wrap gap-2" role="search" aria-label="Pesquisar fichas de serviço"/);
  assert.match(agendaFuncionario, /role="group" aria-label="Atalhos de período"/);
});

test("agenda relaciona datas inválidas à mensagem de erro", () => {
  assert.match(agendaFuncionario, /id="agenda-start-date"[^>]*aria-describedby=\{invalidRange\?'agenda-range-error':undefined\}/);
  assert.match(agendaFuncionario, /id="agenda-end-date"[^>]*aria-describedby=\{invalidRange\?'agenda-range-error':undefined\}/);
  assert.match(agendaFuncionario, /<span id="agenda-range-error" className="sr-only">\{invalidRange \? error : ''\}<\/span>/);
});

test("histórico não consulta dados sem vínculo de funcionário validado", () => {
  assert.match(historicoFuncionario, /if\(accessLoading\)\{setData\(null\);setUpdatedAt\(null\);return/);
  assert.match(historicoFuncionario, /if\(accessError\|\|!context\)\{setData\(null\);setUpdatedAt\(null\);setLoading\(false\)/);
  assert.match(historicoFuncionario, /\[page,refresh,accessLoading,accessError,context\?\.funcionario\.id,context\?\.funcionario\.versao\]/);
});

test("histórico reinicia a paginação ao trocar de funcionário", () => {
  assert.match(historicoFuncionario, /useEffect\(\(\)=>\{setPage\(0\);\},\[context\?\.funcionario\.id,context\?\.funcionario\.versao\]\)/);
});

test("listas do funcionário reiniciam filtros e paginação ao trocar de contexto", () => {
  assert.match(notificacoesFuncionario, /useEffect\(\(\)=>\{setPage\(0\);\},\[context\?\.funcionario\.id,context\?\.funcionario\.versao\]\)/);
  assert.match(minhasTarefas, /useEffect\(\(\)=>\{setPage\(0\);setFilter\(''\);\},\[context\?\.funcionario\.id,context\?\.funcionario\.versao\]\)/);
  assert.match(fichasFuncionario, /useEffect\(\(\) => \{ setPage\(0\); setSearch\(''\); setQuery\(''\); \}, \[context\?\.funcionario\.id, context\?\.funcionario\.versao\]\)/);
});

test("notificação limpa erro antigo ao abrir um registro", () => {
  assert.match(notificacoesFuncionario, /setError\('\'\);openerRef\.current=event\.currentTarget;setSelected\(item\)/);
  assert.match(notificacoesFuncionario, /ficha_atribuida:'Ficha atribuída'/);
});

test("notificações preservam a lista e o detalhe durante nova sincronização", () => {
  assert.match(notificacoesFuncionario, /setLoading\(true\);setError\('\'\);/);
  assert.doesNotMatch(notificacoesFuncionario, /setLoading\(true\);setError\('\'\);setSelected\(null\)/);
  assert.match(notificacoesFuncionario, /data \? 'Atualizando notificações…' : 'Carregando notificações…'/);
});

test("notificação anuncia leitura em andamento no item correto", () => {
  assert.match(notificacoesFuncionario, /<li key=\{item\.id\} className="space-y-2 py-3" aria-busy=\{busy===item\.id\}/);
});

test("agenda usa datas locais para não deslocar o período no fuso horário", () => {
  assert.match(agendaFuncionario, /const isoDate=\(date:Date\)=>/);
  assert.doesNotMatch(agendaFuncionario, /Date\.now\(\)\+30\*86400000/);
  assert.doesNotMatch(agendaFuncionario, /new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
});

test("agenda limpa o erro ao corrigir o período", () => {
  assert.match(agendaFuncionario, /setStart\(event\.target\.value\);setError\('\'\)/);
  assert.match(agendaFuncionario, /setEnd\(event\.target\.value\);setError\('\'\)/);
});

test("detalhes abertos oferecem fechamento explícito", () => {
  assert.match(notificacoesFuncionario, /onClick=\{\(\)=>\{returnFocus\.current=true;setSelected\(null\);\}\}>Fechar detalhe/);
  assert.match(notificacoesFuncionario, /aria-label="Fechar detalhe da notificação"/);
  assert.match(notificacoesFuncionario, /selectedRef\.current\?\.focus\(\)/);
  assert.match(notificacoesFuncionario, /openerRef\.current\?\.focus\(\)/);
  assert.match(fichasFuncionario, /onClick=\{\(\) => \{ returnFocus\.current = true; setSelected\(null\); \}\}>Fechar ficha/);
  assert.match(fichasFuncionario, /aria-label="Fechar ficha aberta"/);
  assert.match(fichasFuncionario, /selectedRef\.current\?\.focus\(\)/);
  assert.match(fichasFuncionario, /tabIndex=\{-1\}[^>]*aria-label=\{`Ficha aberta:/);
  assert.match(fichasFuncionario, /returnFocus\.current = true; setSelected\(null\)/);
  assert.match(fichasFuncionario, /openerRef\.current\?\.focus\(\)/);
});

test("produção e secagem usam estado explícito para mensagens acessíveis", () => {
  assert.match(registroProducao, /messageKind === 'status' \? 'status' : 'alert'/);
  assert.match(controleSecagem, /messageKind === 'status' \? 'status' : 'alert'/);
});

test("resumo do funcionário atualiza ao retornar à aba", () => {
  assert.match(resumoFuncionario, /lastReturnRefresh=useRef\(0\)/);
  assert.match(resumoFuncionario, /addEventListener\('focus',refreshOnReturn\)/);
  assert.match(resumoFuncionario, /addEventListener\('visibilitychange',refreshOnReturn\)/);
});

test("projetos do setor atualizam ao retornar à aba", () => {
  assert.match(meuSetor, /lastReturnRefresh = useRef\(0\)/);
  assert.match(meuSetor, /addEventListener\('focus', refreshOnReturn\)/);
  assert.match(meuSetor, /addEventListener\('visibilitychange', refreshOnReturn\)/);
});

test("projetos do setor rejeitam duplicidades e ordenam prazos válidos", () => {
  assert.match(meuSetor, /new Set\(projects\.map\(project => project\.id\)\)\.size !== projects\.length/);
  assert.match(meuSetor, /!\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(prazo\)/);
  assert.match(meuSetor, /return projects\.sort\(\(a, b\) =>/);
});

test("edição de acesso limpa erro ao alterar escopo de permissão", () => {
  assert.match(editorAcesso, /setGrants\(current=>current\.map\(g=>g===grant\?\{\.\.\.g,escopo:e\.target\.value as RecordScope\}:g\)\);clearError\(\)/);
});

test("anexos reiniciam paginação e arquivo ao trocar de contexto", () => {
  assert.match(anexos, /useEffect\(\(\)=>\{setPage\(0\);setFile\(null\);setMessage\('\'\);receipt\.current=null/);
});

test("pesquisa de fichas limpa erro ao editar o termo", () => {
  assert.match(fichasFuncionario, /setSearch\(event\.target\.value\); setError\('\'\)/);
});

test("fichas de serviço atualizam ao retornar à aba", () => {
  assert.match(fichasFuncionario, /lastReturnRefresh = useRef\(0\)/);
  assert.match(fichasFuncionario, /addEventListener\('focus', refreshOnReturn\)/);
  assert.match(fichasFuncionario, /addEventListener\('visibilitychange', refreshOnReturn\)/);
});

test("contador de notificações anuncia mudanças", () => {
  assert.match(notificacoesFuncionario, /Notificações <span aria-live="polite">/);
  assert.match(notificacoesFuncionario, /Tudo lido/);
  assert.match(notificacoesFuncionario, /notificações não lidas/);
});

test("anexos atualizam ao retornar à aba", () => {
  assert.match(anexos, /lastReturnRefresh=useRef\(0\)/);
  assert.match(anexos, /addEventListener\('focus',refreshOnReturn\)/);
  assert.match(anexos, /addEventListener\('visibilitychange',refreshOnReturn\)/);
});

test("agenda atualiza ao retornar à aba", () => {
  assert.match(agendaFuncionario, /lastReturnRefresh=useRef\(0\)/);
  assert.match(agendaFuncionario, /addEventListener\('focus',refreshOnReturn\)/);
  assert.match(agendaFuncionario, /void load\(\)/);
});

test("histórico atualiza ao retornar à aba", () => {
  assert.match(historicoFuncionario, /lastReturnRefresh=useRef\(0\)/);
  assert.match(historicoFuncionario, /addEventListener\('visibilitychange',refreshOnReturn\)/);
});

test("ocorrências reiniciam página e atualizam ao retornar à aba", () => {
  assert.match(ocorrencias, /setPage\(0\);\},\[serviceId,sector,context\?\.funcionario\.id,context\?\.funcionario\.versao\]\)/);
  assert.match(ocorrencias, /lastReturnRefresh=useRef\(0\)/);
  assert.match(ocorrencias, /addEventListener\('visibilitychange',refreshOnReturn\)/);
});

test("detalhe de tarefa oferece retry contextual e estado de carregamento acessível", () => {
  assert.match(detalheTarefa, /aria-busy=\{loading\}/);
  assert.match(detalheTarefa, /aria-live="polite"/);
  assert.match(detalheTarefa, /Tentar novamente/);
  assert.match(detalheTarefa, /Recarregar tarefa/);
});

test("detalhe de tarefa informa recarregamento no botão", () => {
  assert.match(detalheTarefa, /aria-label=\{loading\?\(task\?'Atualizando tarefa':'Carregando tarefa'\):'Recarregar tarefa'\}/);
  assert.match(detalheTarefa, /\{loading\?\(task\?'Atualizando…':'Carregando…'\):'Recarregar tarefa'\}/);
});

test("detalhe de tarefa preserva a ficha durante sincronização", () => {
  assert.match(detalheTarefa, /task \? 'Atualizando tarefa…' : 'Carregando tarefa…'/);
  assert.doesNotMatch(detalheTarefa, /setLoading\(true\);setError\(''\);setTask\(null\);setUpdatedAt\(null\)/);
});

test("ficha técnica anuncia carregamento e operações em andamento", () => {
  assert.match(fichaTecnica, /role="status" aria-live="polite">Carregando ficha técnica/);
  assert.match(fichaTecnica, /aria-busy=\{saving \|\| checklistBusy \|\| loading\}/);
});

test("ficha técnica anuncia ausência de anexo vinculado", () => {
  assert.match(formularioFichaTecnica, /role=\{current \? undefined : 'status'\}/);
});

test("ficha técnica preserva o conteúdo durante sincronização", () => {
  assert.match(fichaTecnica, /if \(loading && !sheet\) return/);
  assert.match(fichaTecnica, /Atualizando ficha técnica…/);
  assert.match(fichaTecnica, /setSheet\(null\); setValues\(\{\}\)/);
});

test("ficha técnica bloqueia edição e ações durante sincronização", () => {
  assert.match(fichaTecnica, /disabled=\{loading \|\| saving \|\| checklistBusy/);
  assert.match(fichaTecnica, /disabled=\{loading \|\| !sheet\.pode_editar/);
  assert.match(fichaTecnica, /disabled=\{loading \|\| saving \|\| checklistBusy \|\| sheet\.status\s*===\s*'concluida'\}/);
});

test("ocorrências e anexos expõem retry e paginação acessível", () => {
  assert.match(ocorrencias, /aria-busy=\{loading \|\| busy\}/);
  assert.match(ocorrencias, /aria-label="Paginação de ocorrências"/);
  assert.match(ocorrencias, /role="status" aria-live="polite" className="text-sm text-slate-500">Nenhuma ocorrência disponível nesta página/);
  assert.match(ocorrencias, /aria-label=\{`Ocorrência \$\{incidentTitle\} · \$\{formatIncidentSeverity\(item\.gravidade\)\} · \$\{incidentStatus\}`\}/);
  assert.match(ocorrencias, /Tentar novamente/);
  assert.match(anexos, /aria-busy=\{loading \|\| busy \|\| !!linkBusy\}/);
  assert.match(anexos, /aria-label="Paginação de anexos"/);
  assert.match(anexos, /aria-label=\{`Anexo \$\{attachmentName\} · \$\{attachmentSize\}`\}/);
  assert.match(anexos, /Tentar novamente/);
  assert.match(anexos, /Nenhum anexo validado nesta página/);
});

test("ocorrências e anexos ocultam paginação quando vazios", () => {
  assert.match(ocorrencias, /\(items\.length \|\| page>0 \|\| more\) && <nav aria-label="Paginação de ocorrências"/);
  assert.match(anexos, /\(items\.length \|\| page>0 \|\| more\) && <nav aria-label="Paginação de anexos"/);
});

test("ocorrências informam atualização no botão", () => {
  assert.match(ocorrenciasFuncionario, /aria-label=\{loading \|\| busy\?'Aguarde a atualização das ocorrências':'Atualizar ocorrências'\}/);
  assert.match(ocorrenciasFuncionario, /\{loading \|\| busy\?'Aguarde…':'Atualizar ocorrências'\}/);
});

test("ocorrências limpam feedback ao editar", () => {
  assert.match(ocorrenciasFuncionario, /const clearFeedback=\(\)=>\{setError\(''\);setMessage\(''\);\}/);
  assert.match(ocorrenciasFuncionario, /setTitle\(event\.target\.value\);clearFeedback\(\)/);
  assert.match(ocorrenciasFuncionario, /setDescription\(event\.target\.value\);clearFeedback\(\)/);
});

test("anexos e ocorrências diferenciam carga inicial de sincronização", () => {
  assert.match(anexos, /items\.length \? 'Atualizando anexos…' : 'Carregando anexos…'/);
  assert.match(ocorrenciasFuncionario, /items\.length\?'Atualizando ocorrências…':'Carregando ocorrências…'/);
  assert.match(anexos, /setItems\(\[\]\);setLinks\(\{\}\);onListed\?\.\(\[\]\)/);
  assert.match(ocorrenciasFuncionario, /setItems\(\[\]\);setMore\(false\)/);
});

test("ocorrências resetam o formulário ao trocar de contexto", () => {
  assert.match(ocorrenciasFuncionario, /useEffect\(\(\)=>\{setTitle\(''\);setDescription\(''\);setType\('outro'\);setSeverity\('atencao'\);setMessage\(''\);receipt\.current=null;\},\[serviceId,sector\]\)/);
});

test("aceite da instalação sinaliza salvamento e bloqueia envio concorrente", () => {
  assert.match(aceiteInstalacao, /aria-busy=\{busy\}/);
  assert.match(aceiteInstalacao, /disabled=\{!attachments\.length \|\| disabled \|\| busy\}/);
  assert.match(aceiteInstalacao, /!attachments\.length&&<p role="status" aria-live="polite"/);
  assert.match(aceiteInstalacao, /type="checkbox" required checked=\{confirmed\}/);
});

test("aceite libera o identificador após confirmação", () => {
  assert.match(aceiteInstalacao, /await onRegister\(\{\.\.\.data,request:receipt\.current\.id\}\);receipt\.current=null/);
});

test("aceite limpa erro ao corrigir campos", () => {
  assert.match(aceiteInstalacao, /const clearError=\(\)=>setError\(''\)/);
  assert.match(aceiteInstalacao, /setName\(event\.target\.value\);clearError\(\)/);
  assert.match(aceiteInstalacao, /setProof\(event\.target\.value\);clearError\(\)/);
  assert.match(aceiteInstalacao, /id=\{`\$\{id\}-name`\}[^>]*autoComplete="name"/);
  assert.match(aceiteInstalacao, /aria-describedby=\{`\$\{id\}-proof-help`\}/);
});

test("produção e estoque sinalizam operações e mensagens ao funcionário", () => {
  assert.match(solicitacaoMaterial, /aria-busy=\{busy\}/);
  assert.match(solicitacaoMaterial, /aria-live="polite"/);
  assert.match(registroProducao, /aria-busy=\{busy\}/);
  assert.match(registroProducao, /dateTime=\{safeEntryDateTime\(item\.criado_em\)\}/);
  assert.match(registroProducao, /aria-live="polite"/);
  assert.match(registroProducao, /Nenhum evento de produção registrado nesta ficha/);
  assert.match(registroProducao, /aria-label=\{`Evento \$\{formatType\(item\.tipo\)\} · \$\{formatQuantity\(item\.quantidade\)\} \$\{item\.unidade\} · \$\{formatEntryDate\(item\.criado_em\)\}`\}/);
});

test("registros operacionais liberam o identificador após sucesso", () => {
  assert.match(registroProducao, /await onRegister\(\{\s*\.\.\.data, request: request\.current\.id\s*\}\); request\.current = null/);
  assert.match(solicitacaoMaterial, /await onCreate\(\{\s*\.\.\.data, request: request\.current\.id\s*\}\); request\.current = null/);
});

test("produção limpa o feedback ao editar novo evento", () => {
  assert.match(registroProducao, /setQuantity\(event\.target\.value\); setMessage\(''\)/);
});

test("produção valida observação antes do envio", () => {
  assert.match(registroProducao, /description\.trim\(\)\.length < 3/);
  assert.match(registroProducao, /Informe uma observação com pelo menos 3 caracteres/);
  assert.match(registroProducao, /minLength=\{3\} maxLength=\{1000\} required/);
  assert.match(registroProducao, /id=\{`\$\{id\}-quantity`\}[^>]*required min=/);
  assert.match(registroProducao, /id=\{`\$\{id\}-unit`\}[^>]*required maxLength=\{40\}/);
  assert.match(registroProducao, /id=\{`\$\{id\}-quantity`\}[^>]*inputMode="decimal"/);
});

test("solicitação de material limpa feedback ao editar", () => {
  assert.match(solicitacaoMaterial, /setQuantity\(event\.target\.value\); setMessage\(''\)/);
  assert.match(solicitacaoMaterial, /canRequest && !options\.length && <p id=\{`\$\{fieldPrefix\}-no-materials`\} role="status" aria-live="polite"/);
  assert.match(solicitacaoMaterial, /id=\{`\$\{fieldPrefix\}-item`\}[^>]*required/);
  assert.match(solicitacaoMaterial, /id=\{`\$\{fieldPrefix\}-quantity`\}[^>]*required min=/);
  assert.match(solicitacaoMaterial, /id=\{`\$\{fieldPrefix\}-reason`\}[^>]*required minLength=\{3\}/);
  assert.match(solicitacaoMaterial, /id=\{`\$\{fieldPrefix\}-quantity`\}[^>]*inputMode="decimal"/);
});

test("secagem, inbox de estoque e resumo anunciam estados de operação", () => {
  assert.match(controleSecagem, /aria-busy=\{busy\}/);
  assert.match(controleSecagem, /aria-live="polite"/);
  assert.match(inboxMateriais, /aria-busy=\{loading \|\| !!actionBusy\}/);
  assert.match(inboxMateriais, /Tentar novamente/);
  assert.match(inboxMateriais, /aria-live="polite"/);
  assert.match(inboxMateriais, /actionBusy/);
  assert.match(inboxMateriais, /aria-label=\{`Solicitação de \$\{item\.item_nome\} · \$\{formatQuantity\(item\.quantidade\)\} \$\{item\.unidade\} · \$\{formatStatus\(item\.status\)\}`\}/);
  assert.match(inboxMateriais, /disabled=\{loading\|\|!!actionBusy\}/);
  assert.match(resumoFuncionario, /aria-busy=\{loading\}/);
});

test("secagem e produção informam atualização nos botões", () => {
  assert.match(controleSecagem, /aria-label=\{busy\?'Aguarde a atualização da secagem':'Atualizar horário do servidor'\}/);
  assert.match(registroProducao, /aria-label=\{busy\?'Aguarde a atualização dos registros':'Atualizar registros'\}/);
});

test("secagem limpa feedback ao editar o prazo", () => {
  assert.match(controleSecagem, /setMinutes\(event\.target\.value\); setMessage\(''\)/);
  assert.match(controleSecagem, /type="number" inputMode="numeric" required min=\{1\} max=\{10080\}/);
  assert.match(controleSecagem, /type="number" inputMode="numeric" required min=\{1\}/);
});

test("cartão de solicitação informa atualização no botão", () => {
  assert.match(solicitacaoMaterial, /aria-label=\{busy\?'Atualizando solicitações':'Atualizar solicitações'\}/);
  assert.match(solicitacaoMaterial, /\{busy\?'Atualizando…':'Atualizar'\}/);
});

test("cartão de solicitação preserva o horário durante sincronização", () => {
  assert.doesNotMatch(solicitacaoMaterial, /setBusy\(true\); setMessage\(''\); setUpdatedAt\(null\)/);
  assert.match(solicitacaoMaterial, /busy\?'Atualizando solicitações…':updatedAt/);
});

test("cancelamento de material confirma sucesso", () => {
  assert.match(solicitacaoMaterial, /aria-label=\{`Solicitação de \$\{requestItem\.item_nome\} · \$\{formatQuantity\(requestItem\.quantidade\)\} \$\{requestItem\.unidade\} · \$\{formatStatus\(requestItem\.status\)\}`\}/);
  assert.match(solicitacaoMaterial, /await onCancel\(requestItem\); setMessageKind\('status'\); setMessage\('Solicitação cancelada\.'\)/);
  assert.match(solicitacaoMaterial, /messageKind,\s*setMessageKind\].*useState<'status' \| 'error'>\('status'\)/);
  assert.match(solicitacaoMaterial, /setMessageKind\('status'\);\s*setMessage\('Solicitação cancelada\.'\)/);
  assert.match(solicitacaoMaterial, /role=\{messageKind === 'status' \? 'status' : 'alert'\}/);
});

test("inbox de estoque informa atualização no botão", () => {
  assert.match(inboxMateriais, /aria-label=\{loading \|\| !!actionBusy\?'Aguarde a atualização das solicitações':'Atualizar solicitações'\}/);
  assert.match(inboxMateriais, /\{loading \|\| !!actionBusy\?'Aguarde…':'Atualizar'\}/);
  assert.match(inboxMateriais, /aria-busy=\{loading \|\| !!actionBusy\}/);
});

test("inbox de estoque participa da atualização global", () => {
  assert.match(inboxMateriais, /workforceRefreshEvent/);
  assert.match(inboxMateriais, /addEventListener\(workforceRefreshEvent,refreshPanel\)/);
  assert.match(inboxMateriais, /void load\(false\)/);
});

test("inbox limpa confirmação antes de nova ação", () => {
  assert.match(inboxMateriais, /setActionBusy\(item\.id\);setError\(''\);setMessage\(''\)/);
});

test("editores operacionais anunciam carregamento e bloqueiam estados concorrentes", () => {
  assert.match(criacaoTarefa, /aria-busy=\{loading \|\| busy\}/);
  assert.match(criacaoTarefa, /aria-live="polite"/);
  assert.match(atribuicaoFicha, /aria-busy=\{loading \|\| busy\}/);
  assert.match(atribuicaoFicha, /aria-live="polite"/);
  assert.match(fluxoProducao, /aria-busy=\{loading \|\| busy\}/);
  assert.match(fluxoProducao, /aria-live="polite"/);
});

test("fluxo informa as ações de salvar e recarregar", () => {
  assert.match(fluxoProducao, /aria-label=\{busy\?'Salvando fluxo':flow\.configurado\?'Salvar sequência':'Configurar fluxo'\}/);
  assert.match(fluxoProducao, /aria-label=\{loading\?'Carregando fluxo':'Recarregar fluxo'\}/);
});

test("fluxo preserva a configuração durante sincronização", () => {
  assert.match(fluxoProducao, /flow \? 'Atualizando fluxo…' : 'Carregando fluxo…'/);
  assert.doesNotMatch(fluxoProducao, /setLoading\(true\);setError\(''\);setFlow\(null\)/);
  assert.match(fluxoProducao, /useEffect\(\(\)=>\{setFlow\(null\);setSelected\(\[\]\);\},\[serviceId,context\?\.proprietario\]\)/);
});

test("fluxo limpa feedback ao alterar a sequência", () => {
  assert.match(fluxoProducao, /setMessage\(''\);setError\(''\);setSelected/);
});

test("criação de tarefa informa carregamento dos responsáveis", () => {
  assert.match(criacaoTarefa, /aria-label=\{loading\?'Carregando responsáveis':busy\?'Criando tarefa':'Criar tarefa'\}/);
  assert.match(criacaoTarefa, /\{loading\?'Carregando…':busy\?'Criando…':'Criar tarefa'\}/);
  assert.match(criacaoTarefa, /candidates\.length \? 'Atualizando responsáveis…' : 'Carregando responsáveis…'/);
  assert.match(criacaoTarefa, /!loading && !error && !candidates\.length && <p role="status" aria-live="polite"/);
  assert.match(criacaoTarefa, /type="datetime-local" autoComplete="off" aria-describedby=\{`\$\{id\}-deadline-help`\} value=\{deadline\}/);
  assert.match(criacaoTarefa, /autoComplete="off" aria-describedby=\{`\$\{id\}-deadline-help`\}/);
  assert.match(criacaoTarefa, /O horário será salvo conforme o fuso local deste dispositivo/);
});

test("criação de tarefa limpa feedback ao trocar o contexto", () => {
  assert.match(criacaoTarefa, /setCandidates\(\[\]\);setEmployee\(''\);setTitle\(''\);setDescription\(''\);setDeadline\(''\);setPriority\('normal'\);setMandatory\(false\);receipt\.current=null/);
  assert.doesNotMatch(criacaoTarefa, /setLoading\(true\);setError\(''\);setMessage\(''\);setCandidates\(\[\]\)/);
});

test("criação de tarefa limpa validação ao corrigir campos", () => {
  assert.match(criacaoTarefa, /setTitle\(event\.target\.value\);setError\(''\);setMessage\(''\)/);
  assert.match(criacaoTarefa, /setEmployee\(event\.target\.value\);setError\(''\);setMessage\(''\)/);
  assert.match(criacaoTarefa, /const clearFeedback=\(\)=>\{setError\(''\);setMessage\(''\);\}/);
  assert.match(criacaoTarefa, /setDescription\(event\.target\.value\);clearFeedback\(\)/);
  assert.match(criacaoTarefa, /setDeadline\(event\.target\.value\);clearFeedback\(\)/);
});

test("criação de tarefa valida descrição antes do envio", () => {
  assert.match(criacaoTarefa, /id=\{`\$\{id\}-title`\}[^>]*required minLength=\{2\} maxLength=\{200\}/);
  assert.match(criacaoTarefa, /description\.trim\(\)\.length<2/);
  assert.match(criacaoTarefa, /Informe uma descrição com pelo menos 2 caracteres/);
  assert.match(criacaoTarefa, /minLength=\{2\} maxLength=\{10000\} required/);
});

test("editor de acesso anuncia carregamento e bloqueia salvamento", () => {
  assert.match(editorFuncionario, /aria-busy=\{busy \|\| loading\}/);
  assert.match(editorFuncionario, /busy&&<p role="status" aria-live="polite">Salvando acesso do funcionário…<\/p>/);
  assert.match(editorFuncionario, /role="status" aria-live="polite"/);
  assert.match(editorFuncionario, /employee\?'Atualizando acesso…':'Carregando acesso…'/);
  assert.match(editorFuncionario, /disabled=\{busy\}/);
  assert.match(editorFuncionario, /dateTime=\{safeEmployeeDateTime\(employee\.created_at\)\}/);
  assert.match(editorFuncionario, /type="button" className="btn-secondary" disabled=\{busy\} onClick=\{onCancel\} aria-label="Fechar edição do funcionário"/);
  assert.match(editorFuncionario, /const clearError=\(\)=>setError\(''\)/);
  assert.match(editorFuncionario, /setName\(e\.target\.value\);clearError\(\)/);
  assert.match(editorFuncionario, /id=\{`\$\{fieldId\}-name`\}[^>]*autoComplete="name"/);
  assert.match(editorFuncionario, /id=\{`\$\{fieldId\}-job`\}[^>]*autoComplete="organization-title"/);
});

test("responsável limpa feedback ao recarregar candidatos", () => {
  assert.match(atribuicaoFicha, /setLoading\(true\);setError\(''\);setMessage\(''\)/);
  assert.match(atribuicaoFicha, /candidates\.length \? 'Atualizando funcionários autorizados…' : 'Carregando funcionários autorizados…'/);
  assert.match(atribuicaoFicha, /useEffect\(\(\)=>\{setCandidates\(\[\]\);\},\[serviceId,sector\]\)/);
});

test("responsável limpa feedback quando a ficha muda externamente", () => {
  assert.match(atribuicaoFicha, /setSelected\(current \|\| ''\);setMessage\(''\)/);
});

test("ficha técnica e resolução de ocorrência anunciam estados críticos", () => {
  assert.match(fichaTecnica, /\{error && <p role="alert"/);
  assert.match(fichaOperacional, /role="status" aria-live="polite"/);
  assert.match(ocorrenciasFuncionario, /<form className="space-y-2" aria-busy=\{busy\}/);
  assert.match(ocorrenciasFuncionario, /rows=\{3\} required minLength=\{10\} maxLength=\{5000\}/);
});

test("ficha técnica ignora respostas antigas de secagem e produção", () => {
  assert.match(fichaTecnica, /const result = await technicalSheets\.dryingLoad\(serviceId\); if \(request === generation\.current\) setDrying\(result\)/);
  assert.match(fichaTecnica, /const result = await technicalSheets\.productionLoad\(serviceId, sector\); if \(request === generation\.current\) setProduction\(result\)/);
});

test("cartão de tarefa sinaliza atualização concorrente", () => {
  assert.match(minhasTarefas, /<form className="grid gap-3 sm:grid-cols-2" aria-busy=\{busy\}/);
});

test("cartão de tarefa informa o estado do salvamento", () => {
  assert.match(minhasTarefas, /aria-label=\{busy\?'Salvando tarefa':dirty\?'Atualizar tarefa':'Sem alterações'\}/);
  assert.match(minhasTarefas, /\{busy && <p role="status" aria-live="polite" className="text-sm text-cyan-700 sm:col-span-2">Salvando tarefa…<\/p>\}/);
});

test("cartão de tarefa limpa erro ao editar", () => {
  assert.match(minhasTarefas, /const clearError=\(\)=>setError\(''\)/);
  assert.match(minhasTarefas, /setStatus\(event\.target\.value as TaskStatus\);clearError\(\)/);
  assert.match(minhasTarefas, /setProgress\(event\.target\.value===''\?NaN:Number\(event\.target\.value\)\);clearError\(\)/);
});

test("notificações sinalizam leitura e bloqueiam abertura concorrente", () => {
  assert.match(notificacoesFuncionario, /aria-busy=\{loading \|\| !!busy\}/);
  assert.match(notificacoesFuncionario, /disabled=\{!!busy\}/);
  assert.match(notificacoesFuncionario, /\{busy && <p role="status" aria-live="polite">Salvando leitura da notificação…<\/p>\}/);
  assert.match(notificacoesFuncionario, /setMessage\('Notificação marcada como lida\.'\)/);
});

test("notificações expõem o estado de leitura semanticamente", () => {
  assert.match(notificacoesFuncionario, /aria-label=\{`\$\{item\.lida_em\?'Notificação lida':'Notificação não lida'\}/);
  assert.match(notificacoesFuncionario, /aria-label=\{`Marcar como lida: \$\{notificationLabels\[item\.evento\]\|\|'Atualização da operação'\}`\}/);
});

test("notificações informam atualização no botão", () => {
  assert.match(notificacoesFuncionario, /aria-label=\{loading \|\| !!busy\?'Aguarde a atualização das notificações':'Atualizar notificações'\}/);
  assert.match(notificacoesFuncionario, /\{loading \|\| !!busy\?'Aguarde…':'Atualizar notificações'\}/);
});

test("notificações destacam cada item não lido", () => {
  assert.match(notificacoesFuncionario, /!item\.lida_em&&<span className="rounded-full bg-cyan-100/);
  assert.match(notificacoesFuncionario, />Não lida<\/span>/);
});

test("fichas bloqueiam abertura e paginação durante sincronização", () => {
  assert.match(fichasFuncionario, /disabled=\{loading\} onClick=\{\(\) =>/);
  assert.match(fichasFuncionario, /disabled=\{loading \|\| page === 0\}/);
  assert.match(fichasFuncionario, /disabled=\{loading \|\| !list\.tem_mais\}/);
});

test("pesquisa de fichas não cria nova carga durante sincronização", () => {
  assert.match(fichasFuncionario, /aria-busy=\{loading\} onSubmit=\{event => \{ event\.preventDefault\(\); if \(loading\) return;/);
  assert.match(fichasFuncionario, /disabled=\{loading\} value=\{search\}/);
});

test("operações de produção e secagem sinalizam o formulário em andamento", () => {
  assert.match(registroProducao, /<form className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2" aria-busy=\{busy\}/);
  assert.match(controleSecagem, /<form className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3" aria-busy=\{busy\}/);
});

test("ações de execução da ficha informam salvamento", () => {
  assert.match(fichaOperacional, /saving\?'Salvando…'/);
  assert.match(fichaTecnica, /saving && <p role="status" aria-live="polite">Salvando alterações da ficha técnica…<\/p>/);
  assert.match(fichaTecnica, /<span role="status" aria-live="polite" className="text-sm font-medium">Situação:/);
});

test("ficha técnica limpa erros ao editar um campo", () => {
  assert.match(readOptional("../src/modules/workforce/components/TechnicalSheetForm.tsx"), /setMessage\(''\);\s*setIssues\(\[\]\);\s*change/);
});

test("serviço de fichas valida checklist e dados da resposta", () => {
  assert.match(technicalSheetService, /hasUniqueKeys\(checklistItems\) &&\s+!!row\.checklist/);
  assert.doesNotMatch(technicalSheetService, /hasUniqueKeys\(checklistItems\);\s+!!row\.checklist/);
});

test("serviço de fichas rejeita timestamps inválidos", () => {
  assert.match(technicalSheetService, /isDateOrNull\(row\.iniciada_em\) && isDateOrNull\(row\.concluida_em\)/);
  assert.match(technicalSheetService, /Number\.isFinite\(new Date\(record\.criado_em\)\.getTime\(\)\)/);
});

test("registro de secagem valida datas retornadas", () => {
  assert.match(technicalSheetService, /!isDateOrNull\(result\.prevista_ate\)/);
  assert.match(technicalSheetService, /!isDateOrNull\(result\.servidor_agora\)/);
  assert.match(controleSecagem, /dateTime=\{safeServerDateTime\(state\?\.iniciada_em \?\? null\)\}/);
});

test("liberação da ficha bloqueia duplo clique", () => {
  assert.match(fichaOperacional, /disabled=\{loading\}/);
  assert.match(fichaOperacional, /if \(mutation\.current\) return;/);
  assert.match(fichaOperacional, /loading \? 'Liberando…' : 'Liberar ficha deste setor'/);
});

test("agenda ignora respostas de requisições antigas", () => {
  assert.match(agendaFuncionario, /const generation=useRef\(0\)/);
  assert.match(agendaFuncionario, /if\(request===generation\.current\)setItems/);
  assert.match(agendaFuncionario, /return\(\)=>\{generation\.current\+\+;\}/);
});

test("agenda limpa atividades anteriores antes de nova consulta", () => {
  assert.match(agendaFuncionario, /useEffect\(\(\)=>\{setItems\(\[\]\);setUpdatedAt\(null\);\},\[start,end,context\?\.funcionario\.id,context\?\.funcionario\.versao\]\)/);
  assert.match(agendaFuncionario, /setLoading\(true\);setError\(''\);try/);
});

test("agenda preserva eventos durante nova sincronização", () => {
  assert.match(agendaFuncionario, /items\.length\?'Atualizando agenda…':'Carregando agenda…'/);
});

test("agenda oferece atalhos de período", () => {
  assert.match(agendaFuncionario, /function setPreset\(days:number\)/);
  assert.match(agendaFuncionario, /aria-label="Atalhos de período"/);
  assert.match(agendaFuncionario, /Próximos 7 dias/);
  assert.match(agendaFuncionario, /Próximos 30 dias/);
});

test("agenda informa a quantidade de atividades do período", () => {
  assert.match(agendaFuncionario, /items\.length===1\?'atividade encontrada':'atividades encontradas'/);
  assert.match(agendaFuncionario, /no período\.<\/p>/);
});

test("agenda marca o atalho de período selecionado", () => {
  assert.match(agendaFuncionario, /const presetActive=\(days:number\)=>/);
  assert.match(agendaFuncionario, /aria-pressed=\{presetActive\(7\)\}/);
});

test("agenda limpa atividades quando o período é inválido", () => {
  assert.match(agendaFuncionario, /if\(!start\|\|!end\)\{setItems\(\[\]\);setError/);
  assert.match(agendaFuncionario, /if\(end<start\)\{setItems\(\[\]\);setError/);
});

test("anexos bloqueiam geração simultânea de links temporários", () => {
  assert.match(anexos, /linkBusy/);
  assert.match(anexos, /disabled=\{busy \|\| !!linkBusy\}/);
  assert.match(anexos, /itemBusy\?'Gerando…'/);
});

test("anexos bloqueiam envio enquanto o link temporário é gerado", () => {
  assert.match(anexos, /if\(lock\.current \|\| !!linkBusy \|\| !file\)return/);
  assert.match(anexos, /disabled=\{busy \|\| !!linkBusy\}/);
  assert.match(anexos, /disabled=\{busy \|\| !!linkBusy \|\| !file\}/);
});

test("anexos orientam formatos e tamanho do arquivo", () => {
  assert.match(anexos, /aria-describedby=\{`\$\{id\}-help`\}/);
  assert.match(anexos, /Formatos aceitos: JPEG, PNG, WebP ou PDF\. Tamanho máximo: 10 MB\./);
});

test("inbox de estoque ignora respostas de filtros antigos", () => {
  assert.match(inboxMateriais, /const generation=useRef\(0\)/);
  assert.match(inboxMateriais, /if\(request===generation\.current\)setItems/);
  assert.match(inboxMateriais, /return\(\)=>\{generation\.current\+\+;\}/);
});

test("inbox de estoque preserva dados durante nova consulta", () => {
  assert.doesNotMatch(inboxMateriais, /setLoading\(true\);setError\(''\);if\(clearMessage\)setMessage\(''\);setItems\(\[\]\)/);
  assert.match(inboxMateriais, /items\.length\?'Atualizando solicitações…':'Carregando solicitações…'/);
  assert.match(inboxMateriais, /useEffect\(\(\)=>\{setItems\(\[\]\);setUpdatedAt\(null\);\},\[status,allowed/);
});

test("inbox preserva feedback após ação concluída", () => {
  assert.match(inboxMateriais, /async function load\(clearMessage=true\)/);
  assert.match(inboxMateriais, /setMessage\('Solicitação aprovada\.'\);await load\(false\)/);
});

test("ficha técnica diferencia erro de sucesso na mensagem acessível", () => {
  const formularioTecnico = readOptional("../src/modules/workforce/components/TechnicalSheetForm.tsx");
  assert.match(formularioTecnico, /role=\{message\.startsWith\('Não foi'\) \|\| message\.startsWith\('Revise'\) \? 'alert' : 'status'\}/);
});

test("formulário de ocorrência sinaliza o envio em andamento", () => {
  assert.match(ocorrenciasFuncionario, /<form className="grid gap-3 sm:grid-cols-2" aria-busy=\{busy\}/);
});

test("histórico bloqueia paginação durante carregamento", () => {
  assert.match(historicoFuncionario, /disabled=\{loading \|\| page===0\}/);
  assert.match(historicoFuncionario, /disabled=\{loading \|\| !data\.tem_mais\}/);
});

test("tarefas bloqueiam paginação durante carregamento", () => {
  assert.match(minhasTarefas, /disabled=\{loading \|\| page===0\}/);
  assert.match(minhasTarefas, /disabled=\{loading \|\| !data\.tem_mais\}/);
});

test("tarefas informam atualização no botão durante carregamento", () => {
  assert.match(minhasTarefas, /aria-label=\{loading\?'Atualizando tarefas':'Atualizar tarefas'\}/);
  assert.match(minhasTarefas, /\{loading\?'Atualizando…':'Atualizar tarefas'\}/);
});

test("tarefas exibem um único bloco de carregamento e erro", () => {
  assert.equal((minhasTarefas.match(/Carregando tarefas…/g) || []).length, 1);
  assert.equal((minhasTarefas.match(/role=\"alert\" className=\"flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50/g) || []).length, 1);
});
