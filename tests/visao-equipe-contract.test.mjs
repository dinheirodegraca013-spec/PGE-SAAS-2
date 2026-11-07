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
const acessoService = readOptional("../src/modules/workforce/services/access.service.ts");
const fichaOperacional = readOptional("../src/modules/workforce/components/ServiceTechnicalSheet.tsx");
const ocorrenciasFuncionario = readOptional("../src/modules/workforce/components/SheetIncidents.tsx");
const estoqueView = readOptional("../src/views/estoque/EstoqueView.tsx");
const financeiroView = readOptional("../src/views/financeiro/FinanceiroEmpresaView.tsx");

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

test("Visão 3D bloqueia acesso direto de funcionários antes das consultas", () => {
  assert.match(visao, /useWorkforceAccess/);
  assert.match(visao, /const acessoPermitido = Boolean\(context\?\.proprietario\)/);
  assert.match(visao, /if \(accessLoading \|\| accessError \|\| !acessoPermitido\)/);
  assert.match(visao, /Visão 3D está disponível apenas para o administrador/);
  assert.match(visao, /Validando acesso à Visão 3D/);
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
  assert.match(meuSetor, /carregando \? projetos\.length \? `\$\{projetos\.length\} \$\{projetos\.length === 1 \? 'projeto' : 'projetos'\} · atualizando` : '…' : erro \? 'Indisponível'/);
});

test("painel mantém projetos visíveis durante nova consulta", () => {
  assert.match(meuSetor, /carregando && !projetos\.length/);
  assert.match(meuSetor, /Atualizando projetos…/);
});

test("painel limpa o alerta após atualizar projetos com sucesso", () => {
  assert.match(meuSetor, /setErro\(''\);\s*setProjetos\(normalizeProjects\(data\)\)/);
});

test("painel nomeia a atualização dos projetos", () => {
  assert.match(meuSetor, /aria-label=\{accessLoading \? 'Validando acesso antes de atualizar painel' : carregando \? 'Atualizando painel' : !online \? 'Sem conexão para atualizar painel' : 'Atualizar painel'\}/);
  assert.match(meuSetor, /aria-label=\{`\$\{p\.titulo\} · \$\{formatPrazo\(p\.prazo\)\}\$\{status \? ` · \$\{status\}` : ''\}`\}/);
  assert.match(meuSetor, /<h3 className="min-w-0 break-words text-slate-900">\{p\.titulo\}<\/h3>/);
  assert.match(meuSetor, /<time className=\{`mt-2 block text-sm/);
  assert.match(meuSetor, /role="status" aria-live="polite" className="rounded-lg border border-dashed/);
});

test("ações administrativas da equipe têm nomes acessíveis", () => {
  const equipeView = readOptional("../src/views/equipe/EquipeView.tsx");
  assert.match(equipeView, /aria-label="Cadastrar novo funcionário"/);
  assert.match(equipeView, /className="btn-primary w-full sm:w-auto"/);
  assert.match(equipeView, /className="btn-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"/);
  assert.match(equipeView, /className="flex flex-col gap-2 sm:flex-row"/);
  assert.match(equipeView, /className="btn-primary w-full sm:w-auto sm:self-end"/);
  assert.match(equipeView, /aria-label=\{carregando \|\| salvando \|\| encaminhando \? 'Aguarde a operação em andamento' : 'Atualizar equipe'\}/);
  assert.match(equipeView, /aria-label=\{encaminhando \? 'Encaminhando projeto para o setor selecionado' : salvando \? 'Aguarde a operação em andamento' : 'Encaminhar projeto para o setor selecionado'\}/);
  assert.match(equipeView, /aria-busy=\{encaminhando\}/);
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
  assert.match(equipeView, /title=\{salvando \|\| encaminhando \? 'Aguarde a operação em andamento' : !limits \? 'Carregando limite do plano' : limits\.sublogins_available <= 0 \? 'Limite de sublogins atingido' : undefined\}/);
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
  assert.match(solicitacaoMaterial, /<span className="flex min-w-0 w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">/);
});

test("ficha técnica acomoda título longo junto do recarregamento", () => {
  assert.match(fichaTecnica, /<h3 className="min-w-0 break-words font-semibold">\{sheet\.modelo\.titulo\}<\/h3>/);
  assert.match(fichaTecnica, /<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Recarregar ficha técnica"/);
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

test("contagem de projetos é anunciada durante a sincronização", () => {
  assert.match(meuSetor, /className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600" aria-live="polite" aria-atomic="true"/);
  assert.match(meuSetor, /· atualizando/);
});

test("projetos do setor anunciam carregamento na própria seção", () => {
  assert.match(meuSetor, /<section className="card p-5" aria-labelledby="sector-projects-title" aria-busy=\{carregando\}>/);
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

test("perfil destaca semanticamente o status do acesso", () => {
  assert.match(meuSetor, /employeeStatusTone/);
  assert.match(meuSetor, /aria-label=\{`Status do acesso: \$\{employeeStatusLabels\[context\.funcionario\.status\] \|\| 'Indisponível'\}`\}/);
});

test("ações rápidas possuem foco visível no teclado", () => {
  assert.match(meuSetor, /focus:ring-2 focus:ring-cyan-500/);
});

test("painel do funcionário evita estouro de textos dinâmicos no celular", () => {
  assert.match(meuSetor, /className="min-w-0 break-words text-slate-300"/);
  assert.match(meuSetor, /className="min-w-0 break-words text-slate-400"/);
  assert.match(meuSetor, /className="min-w-0 break-words">\{erro\}<\/span>/);
  assert.match(meuSetor, /className="min-w-0 break-words">\{accessError\}<\/span>/);
  assert.match(meuSetor, /className="card group min-w-0 p-4/);
  assert.match(meuSetor, /className="mt-1 block break-words text-xs text-slate-500"/);
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

test("ações da tarefa permanecem legíveis no mobile", () => {
  assert.match(minhasTarefas, /className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{busy \|\| !dirty/);
  assert.match(minhasTarefas, /className="min-w-0 break-words text-sm text-slate-500"/);
  assert.match(minhasTarefas, /className="btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?" disabled=\{loading\}/);
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

test("resumo de trabalho preserva prazo e status no mobile", () => {
  assert.match(resumoFuncionario, /<span className="flex (?:min-w-0 )?(?:w-full )?shrink-0 flex-wrap items-center justify-(?:start|end) gap-2(?: sm:w-auto sm:justify-end)?"><time className=\{status==='Atrasado'\?'shrink-0 font-semibold text-rose-700':status\?'shrink-0 font-semibold text-amber-700':'shrink-0 text-slate-600'\}/);
  assert.match(resumoFuncionario, /className=\{`shrink-0 rounded-full px-2 py-1 text-xs font-semibold/);
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
  assert.match(minhasTarefas, /filter&&<button type=\"button\" className=\"btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?\"/);
  assert.match(minhasTarefas, /aria-label=\"Limpar filtro de tarefas\"/);
  assert.match(minhasTarefas, /setFilter\(''\);setPage\(0\)/);
});

test("tarefas não enviam atualização sem mudança", () => {
  assert.match(minhasTarefas, /const dirty=status!==task\.status/);
  assert.match(minhasTarefas, /!dirty \|\| !hasPermission/);
});

test("tarefas informam a quantidade visível e a existência de mais páginas", () => {
  assert.match(minhasTarefas, /data&&<p className="text-xs text-slate-500" role="status" aria-live="polite">/);
  assert.match(minhasTarefas, /data\.itens\.length===1\?'tarefa visível':'tarefas visíveis'/);
  assert.match(minhasTarefas, /loading\?' · atualizando':data\.tem_mais/);
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
  assert.match(resumoFuncionario, /card min-w-0 border p-4/);
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
  assert.match(editorAcesso, /aria-label=\{loading \|\| busy\?'Aguarde o carregamento do acesso':'Recarregar o acesso do funcionário'\}/);
  assert.match(editorAcesso, /Tentar novamente/);
  assert.match(editorAcesso, /disabled=\{loading \|\| busy\} aria-label=\{loading \|\| busy\?'Aguarde o carregamento do acesso':'Recarregar o acesso do funcionário'\}/);
});

test("editor de acesso informa catálogo de permissões vazio", () => {
  assert.match(editorAcesso, /!catalog\.length/);
  assert.match(editorAcesso, /Nenhuma permissão está disponível para configuração/);
});

test("grupos de permissões são acessíveis por teclado e toque", () => {
  assert.match(editorAcesso, /<summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-2 py-2 break-words font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">/);
});

test("equipe recarrega após a sessão e o tenant ficarem disponíveis", () => {
  assert.match(equipe, /void carregar\(\);\s*\n  \}, \[administrador, usuario\?\.tenantId\]\)/);
});

test("equipe não recarrega automaticamente durante operações administrativas", () => {
  assert.match(equipe, /const refreshOnReturn = \(\) => \{ if \(salvando \|\| encaminhando\) return;/);
  assert.match(equipe, /\}, \[administrador, usuario\?\.tenantId, salvando, encaminhando\]\)/);
});

test("histórico de acessos não anuncia vazio durante carregamento", () => {
  assert.match(equipe, /!carregando&&!audit\.length && <p role="status" aria-live="polite"/);
});

test("aceite não anuncia ausência de comprovante antes de carregar anexos", () => {
  assert.match(aceiteInstalacao, /attachmentsLoading/);
  assert.match(aceiteInstalacao, /!attachmentsLoading&&!attachments\.length/);
  assert.match(aceiteInstalacao, /disabled=\{attachmentsLoading \|\| !attachments\.length \|\| disabled \|\| busy\}/);
  assert.match(anexos, /onLoadingChange\?\.\(true\)/);
  assert.match(anexos, /onLoadingChange\?\.\(false\)/);
});

test("gerenciador de dispositivos anuncia carga inicial e atualização", () => {
  assert.match(gerenciadorDispositivos, /busy && <p role="status" aria-live="polite"/);
  assert.match(gerenciadorDispositivos, /devices\.length \? 'Atualizando dispositivos…' : 'Carregando dispositivos…'/);
});

test("equipe oferece retry contextual e anuncia o carregamento da lista", () => {
  assert.match(equipe, /Tentar novamente/);
  assert.match(equipe, /aria-busy=\{carregando\}/);
  assert.match(equipe, /role="status" aria-live="polite"/);
  assert.match(equipe, /role="status" aria-live="polite" className="rounded-xl/);
});

test("equipe preserva a lista durante a atualização", () => {
  assert.doesNotMatch(equipe, /setPerfis\(\[\]\);\s*\} else if/);
  assert.match(equipe, /carregando && perfis\.length > 0/);
  assert.match(equipe, /carregando && !perfis\.length/);
  assert.match(equipe, /Atualizando equipe…/);
});

test("fichas de serviço expõem carregamento e paginação acessíveis", () => {
  assert.match(fichasFuncionario, /aria-busy=\{loading\}/);
  assert.match(fichasFuncionario, /aria-live="polite"/);
  assert.match(fichasFuncionario, /aria-label="Paginação de fichas de serviço"/);
  assert.match(fichasFuncionario, /aria-current="page"/);
  assert.match(fichasFuncionario, /Tentar novamente/);
  assert.match(fichasFuncionario, /className="btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?" aria-label="Ir para a página anterior de fichas"/);
  assert.match(fichasFuncionario, /className="(?:self-center )?shrink-0 text-center text-sm(?: sm:text-left)?" aria-current="page"/);
  assert.match(fichasFuncionario, /aria-label="Fechar ficha aberta"[^>]*onClick=/);
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
  assert.match(fichasFuncionario, /list && <p role="status" aria-live="polite" className="text-xs text-slate-500">/);
  assert.match(fichasFuncionario, /list\.itens\.length === 1 \? 'ficha visível' : 'fichas visíveis'/);
  assert.match(fichasFuncionario, /loading \? ' · atualizando' : list\.tem_mais/);
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
  assert.match(notificacoesFuncionario, /className="(?:w-full )?shrink-0 whitespace-nowrap rounded-lg border border-rose-200/);
  assert.match(notificacoesFuncionario, /disabled=\{loading \|\| !!busy\} aria-label=\{loading \|\| !!busy\?'Aguarde a atualização das notificações':'Tentar carregar as notificações novamente'\}/);
  assert.match(notificacoesFuncionario, /aria-label="Paginação de notificações"/);
  assert.match(notificacoesFuncionario, /aria-current="page"/);
});

test("notificações ocultam paginação quando vazias", () => {
  assert.match(notificacoesFuncionario, /data && \(data\.itens\.length \|\| page>0 \|\| data\.tem_mais\) && <nav aria-label="Paginação de notificações"/);
  assert.match(notificacoesFuncionario, /className="btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?" aria-label="Ir para a página anterior"/);
});

test("notificações atualizam ao retornar à aba", () => {
  assert.match(notificacoesFuncionario, /addEventListener\('focus',refreshOnReturn\)/);
  assert.match(notificacoesFuncionario, /addEventListener\('visibilitychange',refreshOnReturn\)/);
  assert.match(notificacoesFuncionario, /removeEventListener\('visibilitychange',refreshOnReturn\)/);
  assert.match(notificacoesFuncionario, /lastReturnRefresh/);
  assert.match(notificacoesFuncionario, />1000/);
});

test("leitura de notificação sempre libera o bloqueio após uma resposta tardia", () => {
  assert.match(notificacoesFuncionario, /finally\{reading\.current=false;setBusy\(current=>current===item\.id\?null:current\);\}/);
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
  assert.match(agendaFuncionario, /!error&&<p role="status" aria-live="polite" className="text-xs text-slate-500">/);
  assert.match(agendaFuncionario, /loading\?' · atualizando':''/);
});

test("agenda destaca urgência das atividades", () => {
  assert.match(agendaFuncionario, /const agendaTiming=\(value:string,status:string\)=>/);
  assert.match(agendaFuncionario, /'Atrasada'/);
  assert.match(agendaFuncionario, /'Hoje'/);
  assert.match(agendaFuncionario, /'Amanhã'/);
  assert.match(agendaFuncionario, /`Em \$\{days\} dias`/);
});

test("agenda mantém atalhos e badges inteiros no mobile", () => {
  assert.match(agendaFuncionario, /className="shrink-0 text-xs font-semibold text-slate-500">Período rápido:/);
  assert.match(agendaFuncionario, /className=\{`btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto \$\{presetActive\(7\)/);
  assert.match(agendaFuncionario, /className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"/);
  assert.match(agendaFuncionario, /className=\{`shrink-0 rounded-full px-2 py-1 text-xs font-semibold/);
});

test("histórico do funcionário oferece retry e paginação acessível", () => {
  assert.match(historicoFuncionario, /aria-busy=\{loading\}/);
  assert.match(historicoFuncionario, /aria-live="polite"/);
  assert.match(historicoFuncionario, /Tentar novamente/);
  assert.match(historicoFuncionario, /aria-label="Paginação do histórico de atividades"/);
  assert.match(historicoFuncionario, /aria-current="page"/);
  assert.match(historicoFuncionario, /aria-label=\{`\$\{labels\[item\.acao\]\|\|'Atividade registrada'\}/);
  assert.match(historicoFuncionario, /className="btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?" aria-label="Ir para a página anterior do histórico"/);
  assert.match(historicoFuncionario, /className="shrink-0 text-center text-sm sm:text-left" aria-current="page"/);
});

test("histórico informa atualização no botão", () => {
  assert.match(historicoFuncionario, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading\}/);
  assert.match(historicoFuncionario, /aria-label=\{loading\?'Atualizando histórico':'Atualizar histórico'\}/);
  assert.match(historicoFuncionario, /\{loading\?'Atualizando…':'Atualizar histórico'\}/);
});

test("erro do histórico bloqueia retry durante sincronização", () => {
  assert.match(historicoFuncionario, /className="(?:w-full )?shrink-0 whitespace-nowrap rounded-lg border border-rose-200/);
  assert.match(historicoFuncionario, /disabled=\{loading\} aria-label=\{loading\?'Atualizando histórico':'Tentar carregar o histórico novamente'\}/);
  assert.match(historicoFuncionario, /\{loading\?'Atualizando…':'Tentar novamente'\}/);
});

test("histórico diferencia carga inicial de sincronização", () => {
  assert.match(historicoFuncionario, /data \? 'Atualizando histórico…' : 'Carregando histórico…'/);
});

test("histórico informa a quantidade visível e a existência de mais páginas", () => {
  assert.match(historicoFuncionario, /data&&<p role="status" aria-live="polite" className="text-xs text-slate-500">/);
  assert.match(historicoFuncionario, /data\.itens\.length===1\?'atividade visível':'atividades visíveis'/);
  assert.match(historicoFuncionario, /loading\?' · atualizando':data\.tem_mais/);
  assert.match(historicoFuncionario, /data\.tem_mais\?' · Há mais atividades disponíveis\.':''/);
});

test("histórico e fichas ocultam paginação quando vazios", () => {
  assert.match(historicoFuncionario, /data && \(data\.itens\.length \|\| page>0 \|\| data\.tem_mais\) && <nav aria-label="Paginação do histórico de atividades"/);
  assert.match(fichasFuncionario, /list && \(list\.itens\.length \|\| page>0 \|\| list\.tem_mais\) && <nav aria-label="Paginação de fichas de serviço"/);
});

test("paginação do funcionário quebra em telas estreitas", () => {
  assert.match(minhasTarefas, /aria-label="Paginação de tarefas"[^>]*className="flex (?:flex-col items-stretch|flex-wrap) gap-3/);
  assert.match(historicoFuncionario, /aria-label="Paginação do histórico de atividades"[^>]*className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"/);
  assert.match(fichasFuncionario, /aria-label="Paginação de fichas de serviço"[^>]*className="flex (?:flex-col items-stretch|flex-wrap) gap-3/);
  assert.match(notificacoesFuncionario, /aria-label="Paginação de notificações"[^>]*className="flex (?:flex-col items-stretch|flex-wrap) gap-3/);
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

test("mensagens de erro operacionais quebram texto e preservam os botões", () => {
  assert.match(editorAcesso, /className="min-w-0 break-words">\{error\}<\/span>/);
  assert.match(editorAcesso, /className="(?:w-full )?shrink-0 (?:whitespace-nowrap )?rounded-lg border border-rose-200/);
  assert.match(agendaFuncionario, /className="min-w-0 break-words">\{error\}<\/span>/);
  assert.match(agendaFuncionario, /className="w-full shrink-0 whitespace-nowrap rounded-lg border border-rose-200/);
  assert.match(ocorrenciasFuncionario, /className="min-w-0 break-words">\{error\}<\/span>/);
  assert.match(ocorrenciasFuncionario, /className="(?:w-full )?shrink-0 (?:whitespace-nowrap )?rounded-lg border border-rose-200/);
  for (const source of [resumoFuncionario, minhasTarefas, notificacoesFuncionario, fichasFuncionario, historicoFuncionario, anexos, detalheTarefa]) {
    assert.match(source, /className="min-w-0 break-words">\{error\}<\/span>/);
    assert.match(source, /className="(?:w-full )?shrink-0 (?:whitespace-nowrap )?rounded-lg border border-rose-200/);
  }
});

test("formulários operacionais quebram mensagens de validação longas", () => {
  for (const source of [aceiteInstalacao, controleSecagem, solicitacaoMaterial, fichaTecnica, criacaoTarefa, registroProducao, fluxoProducao, formularioFichaTecnica]) {
    assert.match(source, /className="(?:[^" ]+ )*break-words[^\"]*text-sm text-red-700"/);
  }
});

test("erros inline de tarefa, ocorrência e responsável quebram no mobile", () => {
  assert.match(minhasTarefas, /className="break-words text-sm text-red-700 sm:col-span-2"/);
  assert.match(ocorrenciasFuncionario, /className="break-words text-sm text-red-700">\{error\}<\/p>/);
  const assignment = readOptional("../src/modules/workforce/components/SheetAssignmentEditor.tsx");
  assert.match(assignment, /<p className="min-w-0 break-words">\{error\}<\/p>/);
});

test("ações de cabeçalho e formulários se reorganizam no mobile", () => {
  assert.match(inboxMateriais, /className="min-w-0"><h2 id="material-requests-title" className="break-words/);
  assert.match(inboxMateriais, /className="flex flex-wrap items-center gap-2"><select/);
  assert.match(editorAcesso, /className="flex flex-wrap items-center justify-between gap-3"><h2 id="employee-access-title" className="min-w-0 break-words/);
  assert.match(equipe, /<div className="flex flex-col gap-2 sm:flex-row"><button type="submit"/);
});

test("lista administrativa quebra identificadores e histórico longos", () => {
  assert.match(equipe, /<b className="break-words">\{perfil\.nome_completo/);
  assert.match(equipe, /className="break-all text-xs text-slate-500">\{perfil\.email/);
  assert.match(equipe, /className="mt-1 block break-words text-xs font-semibold/);
  assert.match(equipe, /<span className="break-words">\{perfil\.cargo/);
  assert.match(equipe, /<li key=\{a\.id\} className="break-words">/);
});

test("notificações e histórico quebram rótulos operacionais longos", () => {
  assert.match(notificacoesFuncionario, /break-words text-sm text-slate-600/);
  assert.match(notificacoesFuncionario, /items-center gap-2 break-words text-sm font-semibold/);
  assert.match(notificacoesFuncionario, /className="shrink-0 rounded-full bg-cyan-100/);
  assert.match(historicoFuncionario, /className="break-words text-sm font-medium"/);
  assert.match(historicoFuncionario, /className="break-words text-xs text-slate-500"/);
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
  assert.match(notificacoesFuncionario, /setError\('\'\);setMessage\('\'\);openerRef\.current=event\.currentTarget;setSelected\(item\)/);
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

test("editor de acesso preserva controles no mobile", () => {
  assert.match(editorAcesso, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{busy\} onClick=\{onCancel\}/);
  assert.match(editorAcesso, /className="min-w-0 max-w-full text-xs text-slate-500"/);
  assert.match(editorAcesso, /className="input-field max-w-full py-1 text-xs"/);
  assert.match(editorAcesso, /className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{busy\}/);
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
  assert.match(detalheTarefa, /aria-busy=\{loading\|\|accessLoading\}/);
  assert.match(detalheTarefa, /aria-live="polite"/);
  assert.match(detalheTarefa, /Tentar novamente/);
  assert.match(detalheTarefa, /Recarregar tarefa/);
  assert.match(detalheTarefa, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading\|\|accessLoading\}/);
  assert.match(detalheTarefa, /className="(?:w-full )?shrink-0 whitespace-nowrap rounded-lg border border-rose-200/);
  assert.match(detalheTarefa, /disabled=\{loading\|\|accessLoading\} aria-label=\{loading\|\|accessLoading\?'Atualizando tarefa':'Tentar carregar a tarefa novamente'\}/);
});

test("detalhe de tarefa informa recarregamento no botão", () => {
  assert.match(detalheTarefa, /aria-label=\{accessLoading\?'Aguardando validação do acesso':loading\?\(task\?'Atualizando tarefa':'Carregando tarefa'\):'Recarregar tarefa'\}/);
  assert.match(detalheTarefa, /\{accessLoading\?'Validando acesso…':loading\?\(task\?'Atualizando…':'Carregando…'\):'Recarregar tarefa'\}/);
});

test("detalhe de tarefa preserva a ficha durante sincronização", () => {
  assert.match(detalheTarefa, /task \? 'Atualizando tarefa…' : 'Carregando tarefa…'/);
  assert.doesNotMatch(detalheTarefa, /setLoading\(true\);setError\(''\);setTask\(null\);setUpdatedAt\(null\)/);
});

test("ficha técnica anuncia carregamento e operações em andamento", () => {
  assert.match(fichaTecnica, /role="status" aria-live="polite">Carregando ficha técnica/);
  assert.match(fichaTecnica, /disabled=\{loading\} aria-label=\{loading \? 'Carregando ficha técnica' : 'Tentar carregar a ficha técnica novamente'\}/);
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
  assert.match(anexos, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label=\{busy\?'Enviando e validando anexo'/);
  assert.match(anexos, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Ir para a página anterior de anexos"/);
  assert.match(anexos, /className="shrink-0 text-center text-sm sm:text-left" aria-current="page"/);
});

test("ocorrências e anexos ocultam paginação quando vazios", () => {
  assert.match(ocorrencias, /\(items\.length \|\| page>0 \|\| more\) && <nav aria-label="Paginação de ocorrências"/);
  assert.match(anexos, /\(items\.length \|\| page>0 \|\| more\) && <nav aria-label="Paginação de anexos"/);
});

test("ocorrências informam atualização no botão", () => {
  assert.match(ocorrenciasFuncionario, /aria-label=\{loading \|\| busy\?'Aguarde a atualização das ocorrências':'Atualizar ocorrências'\}/);
  assert.match(ocorrenciasFuncionario, /\{loading \|\| busy\?'Aguarde…':'Atualizar ocorrências'\}/);
  assert.match(ocorrenciasFuncionario, /className="(?:w-full )?shrink-0 whitespace-nowrap rounded-lg border border-rose-200/);
  assert.match(ocorrenciasFuncionario, /disabled=\{loading \|\| busy\} aria-label=\{loading \|\| busy\?'Aguarde a atualização das ocorrências':'Tentar carregar as ocorrências novamente'\}/);
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
  assert.match(aceiteInstalacao, /aria-busy=\{busy \|\| attachmentsLoading\}/);
  assert.match(aceiteInstalacao, /disabled=\{attachmentsLoading \|\| !attachments\.length \|\| disabled \|\| busy\}/);
  assert.match(aceiteInstalacao, /!attachmentsLoading&&!attachments\.length&&<p role="status" aria-live="polite"/);
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

test("produção limpa o feedback ao atualizar os registros", () => {
  assert.match(registroProducao, /onClick=\{\(\) => \{ setMessage\(''\); onRefresh\(\); \}\}/);
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
  assert.match(registroProducao, /<div className="min-w-0"><h4 id=\{`\$\{id\}-title`\} className="break-words font-semibold">/);
  assert.match(registroProducao, /className="btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?" onClick=\{\(\) => \{ setMessage\(''\); onRefresh\(\); \}\}/);
  assert.match(registroProducao, /className="btn-primary (?:w-full )?shrink-0 whitespace-nowrap sm:col-span-2(?: sm:w-auto)?"/);
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

test("inbox não libera uma ação nova por resposta tardia", () => {
  assert.match(inboxMateriais, /const releaseAction=\(\)=>setActionBusy\(current=>current===item\.id\?'':current\)/);
  assert.match(inboxMateriais, /finally\{releaseAction\(\);\}/);
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
  assert.match(fluxoProducao, /\{loading\?'Carregando…':'Recarregar fluxo'\}/);
  assert.match(fluxoProducao, /className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{disabled\}/);
  assert.match(fluxoProducao, /className="min-w-0 flex-1 break-words text-sm"/);
  assert.match(fluxoProducao, /className="btn-primary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?" disabled=\{disabled\}/);
  assert.match(fluxoProducao, /className="btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?" disabled=\{busy \|\| loading\}/);
  assert.match(fluxoProducao, /className="flex min-w-0 items-start gap-2 text-sm"><input/);
  assert.match(fluxoProducao, /<span className="min-w-0 break-words">\{label\}<\/span>/);
});

test("fluxo preserva a configuração durante sincronização", () => {
  assert.match(fluxoProducao, /flow \? 'Atualizando fluxo…' : 'Carregando fluxo…'/);
  assert.doesNotMatch(fluxoProducao, /setLoading\(true\);setError\(''\);setFlow\(null\)/);
  assert.match(fluxoProducao, /useEffect\(\(\)=>\{setFlow\(null\);setSelected\(\[\]\);\},\[serviceId,context\?\.proprietario\]\)/);
});

test("fluxo limpa feedback ao alterar a sequência", () => {
  assert.match(fluxoProducao, /setMessage\(''\);setError\(''\);setSelected/);
});

test("fluxo anuncia a nova posição e mantém alvos de toque no celular", () => {
  assert.match(fluxoProducao, /movida para a posição/);
  assert.match(fluxoProducao, /className="btn-secondary min-h-11 min-w-11 shrink-0 px-3"/);
});

test("criação de tarefa informa carregamento dos responsáveis", () => {
  assert.match(criacaoTarefa, /aria-label=\{loading\?'Carregando responsáveis':busy\?'Criando tarefa':'Criar tarefa'\}/);
  assert.match(criacaoTarefa, /\{loading\?'Carregando…':busy\?'Criando…':'Criar tarefa'\}/);
  assert.match(criacaoTarefa, /candidates\.length \? 'Atualizando responsáveis…' : 'Carregando responsáveis…'/);
  assert.match(criacaoTarefa, /!loading && !error && !candidates\.length && <p role="status" aria-live="polite"/);
  assert.match(criacaoTarefa, /type="datetime-local" autoComplete="off" aria-describedby=\{`\$\{id\}-deadline-help`\} value=\{deadline\}/);
  assert.match(criacaoTarefa, /autoComplete="off" aria-describedby=\{`\$\{id\}-deadline-help`\}/);
  assert.match(criacaoTarefa, /O horário será salvo conforme o fuso local deste dispositivo/);
  assert.match(criacaoTarefa, /className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{busy \|\| loading \|\| !candidates\.length\}/);
  assert.match(criacaoTarefa, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{busy\} onClick=/);
  assert.match(criacaoTarefa, /aria-label=\{busy\?'Aguarde a criação da tarefa':'Tentar carregar responsáveis novamente'\}/);
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
  assert.match(editorFuncionario, /type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{busy\} onClick=\{onCancel\} aria-label="Fechar edição do funcionário"/);
  assert.match(editorFuncionario, /const clearError=\(\)=>setError\(''\)/);
  assert.match(editorFuncionario, /setName\(e\.target\.value\);clearError\(\)/);
  assert.match(editorFuncionario, /id=\{`\$\{fieldId\}-name`\}[^>]*autoComplete="name"/);
  assert.match(editorFuncionario, /id=\{`\$\{fieldId\}-job`\}[^>]*autoComplete="organization-title"/);
});

test("salvamento preserva acesso suspenso automaticamente pelo plano", () => {
  assert.match(acessoService, /\['ativo','inativo','suspenso','suspenso_plano'\]\.includes\(input\.status\)/);
  assert.match(acessoService, /p_status:input\.status==='suspenso_plano'\?'ativo':input\.status/);
});

test("estoque e financeiro aguardam autorização antes de consultar dados", () => {
  assert.match(estoqueView, /const \{ context, loading: accessLoading, error: accessError \}=useWorkforceAccess\(\)/);
  assert.match(estoqueView, /if\(accessLoading\|\|accessError\|\|!allowed\)/);
  assert.match(estoqueView, /Você não tem permissão para acessar o estoque/);
  assert.match(financeiroView, /const \{ context, loading: accessLoading, error: accessError \}=useWorkforceAccess\(\)/);
  assert.match(financeiroView, /if\(accessLoading\|\|accessError\|\|!allowed\)/);
  assert.match(financeiroView, /Você não tem permissão para acessar o financeiro/);
});

test("detalhe da tarefa aguarda contexto validado antes de consultar", () => {
  assert.match(detalheTarefa, /const \{context,loading:accessLoading,error:accessError\}=useWorkforceAccess\(\)/);
  assert.match(detalheTarefa, /if\(accessLoading\|\|accessError\|\|!context\)/);
  assert.match(detalheTarefa, /Aguardando validação do acesso/);
});

test("ficha técnica aguarda contexto validado antes de consultar", () => {
  assert.match(fichaTecnica, /const \{ context, loading: accessLoading, error: accessError \} = useWorkforceAccess\(\)/);
  assert.match(fichaTecnica, /if\(accessLoading\|\|accessError\|\|!context\)/);
  assert.match(fichaTecnica, /Aguardando validação do acesso à ficha/);
});

test("responsável limpa feedback ao recarregar candidatos", () => {
  assert.match(atribuicaoFicha, /setLoading\(true\);setError\(''\);setMessage\(''\)/);
  assert.match(atribuicaoFicha, /candidates\.length \? 'Atualizando funcionários autorizados…' : 'Carregando funcionários autorizados…'/);
  assert.match(atribuicaoFicha, /useEffect\(\(\)=>\{setCandidates\(\[\]\);\},\[serviceId,sector\]\)/);
  assert.match(atribuicaoFicha, /aria-label=\{loading \|\| busy\?'Aguarde a atualização dos responsáveis':'Tentar carregar os responsáveis novamente'\}/);
  assert.match(atribuicaoFicha, /\{loading \|\| busy\?'Aguarde…':'Atualizar lista'\}/);
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
  assert.match(notificacoesFuncionario, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading \|\| !!busy\}/);
  assert.match(notificacoesFuncionario, /aria-label=\{loading \|\| !!busy\?'Aguarde a atualização das notificações':'Atualizar notificações'\}/);
  assert.match(notificacoesFuncionario, /\{loading \|\| !!busy\?'Aguarde…':'Atualizar notificações'\}/);
});

test("notificações destacam cada item não lido", () => {
  assert.match(notificacoesFuncionario, /!item\.lida_em&&<span className="shrink-0 rounded-full bg-cyan-100/);
  assert.match(notificacoesFuncionario, />Não lida<\/span>/);
});

test("fichas bloqueiam abertura e paginação durante sincronização", () => {
  assert.match(fichasFuncionario, /disabled=\{loading\} onClick=\{\(\) =>/);
  assert.match(fichasFuncionario, /disabled=\{loading \|\| page === 0\}/);
  assert.match(fichasFuncionario, /disabled=\{loading \|\| !list\.tem_mais\}/);
});

test("listas vazias não aparecem como definitivas durante sincronização", () => {
  assert.match(fichasFuncionario, /list && !loading && !list\.itens\.length/);
  assert.match(minhasTarefas, /data && !loading && !data\.itens\.length/);
  assert.match(historicoFuncionario, /data && !loading && !data\.itens\.length/);
  assert.match(notificacoesFuncionario, /data && !loading && !data\.itens\.length/);
});

test("pesquisa de fichas não cria nova carga durante sincronização", () => {
  assert.match(fichasFuncionario, /aria-busy=\{loading\} onSubmit=\{event => \{ event\.preventDefault\(\); if \(loading\) return;/);
  assert.match(fichasFuncionario, /disabled=\{loading\} value=\{search\}/);
});

test("operações de produção e secagem sinalizam o formulário em andamento", () => {
  assert.match(registroProducao, /<form className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2" aria-busy=\{busy\}/);
  assert.match(controleSecagem, /<form className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3" aria-busy=\{busy\}/);
});

test("ficha limpa erros de consultas antes de uma nova sincronização", () => {
  assert.match(fichaTecnica, /setError\(''\); setDryingError\(''\); setProductionError\(''\); setMaterialError\(''\); setLoading\(true\)/);
});

test("ações de execução da ficha informam salvamento", () => {
  assert.match(fichaOperacional, /saving\?'Salvando…'/);
  assert.match(fichaTecnica, /saving && <p role="status" aria-live="polite">Salvando alterações da ficha técnica…<\/p>/);
  assert.match(fichaTecnica, /<span role="status" aria-live="polite" className="min-w-0 break-words text-sm font-medium">Situação:/);
});

test("ficha técnica limpa erros ao editar um campo", () => {
  assert.match(readOptional("../src/modules/workforce/components/TechnicalSheetForm.tsx"), /setMessage\(''\);\s*setIssues\(\[\]\);\s*change/);
});

test("formulário técnico acomoda ações de tabela no mobile", () => {
  assert.match(formularioFichaTecnica, /className="mt-3 inline-flex w-full shrink-0 whitespace-nowrap rounded-lg border px-3 py-2 text-sm sm:w-auto"/);
  assert.match(formularioFichaTecnica, /className="inline-flex w-full shrink-0 whitespace-nowrap rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-white disabled:opacity-50 sm:w-auto"/);
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
  assert.match(agendaFuncionario, /no período\{loading\?' · atualizando':''\}\.<\/p>/);
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

test("link de anexo libera o bloqueio após resposta tardia", () => {
  assert.match(anexos, /finally\{setLinkBusy\(current=>current===item\.id\?null:current\);\}/);
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
  assert.match(formularioTecnico, /className="inline-flex (?:w-full )?shrink-0 whitespace-nowrap rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600/);
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
  assert.equal((minhasTarefas.match(/role=\"alert\" className=\"flex flex-col gap-3 rounded-lg bg-rose-50/g) || []).length, 1);
});

test("cabeçalhos do funcionário acomodam títulos e atualização no mobile", () => {
  assert.match(notificacoesFuncionario, /<div className="min-w-0"><h2 id="work-notifications-title" className="break-words text-lg font-bold"/);
  assert.match(notificacoesFuncionario, /className="btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?"/);
  assert.match(historicoFuncionario, /<div className="min-w-0"><h2 id="activity-history-title" className="break-words text-lg font-bold"/);
  assert.match(minhasTarefas, /<h2 id="my-tasks-title" className="min-w-0 break-words text-lg font-bold"/);
  assert.match(minhasTarefas, /className="shrink-0 text-xs text-slate-500"/);
  assert.match(fichasFuncionario, /<div className="min-w-0"><h2 id="service-sheets-title" className="break-words text-lg font-bold"/);
});

test("cabeçalho do painel mantém a atualização legível no mobile", () => {
  assert.match(meuSetor, /className="w-full shrink-0 whitespace-nowrap rounded-xl border border-white\/20[^\"]*sm:w-auto/);
  assert.match(meuSetor, /disabled=\{carregando \|\| accessLoading \|\| !online\}/);
  assert.match(meuSetor, /aria-label=\{accessLoading \? 'Validando acesso antes de atualizar painel' : carregando \? 'Atualizando painel' : !online \? 'Sem conexão para atualizar painel' : 'Atualizar painel'\}/);
  assert.match(meuSetor, /\{accessLoading \? 'Validando acesso…' : carregando \? 'Atualizando…' : 'Atualizar painel'\}/);
});

test("atalhos administrativos do funcionário preservam seus rótulos no mobile", () => {
  assert.match(meuSetor, /className="btn-primary inline-flex w-full shrink-0 whitespace-nowrap sm:w-auto" to="\/estoque"/);
  assert.match(meuSetor, /className="btn-primary inline-flex w-full shrink-0 whitespace-nowrap sm:w-auto" to="\/meu-financeiro"/);
});

test("erro de projetos preserva o botão de recuperação no mobile", () => {
  assert.match(meuSetor, /className="w-full shrink-0 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 sm:w-auto"/);
  assert.match(meuSetor, /disabled=\{carregando\} aria-label=\{carregando \? 'Atualizando projetos' : 'Tentar carregar os projetos novamente'\}/);
  assert.match(meuSetor, /\{carregando \? 'Atualizando…' : 'Tentar novamente'\}/);
});

test("cabeçalho e perfil do painel quebram dados longos no mobile", () => {
  assert.match(meuSetor, /<div className="min-w-0">\s*<p className="text-xs font-semibold uppercase/);
  assert.match(meuSetor, /<h1 className="mt-2 break-words text-3xl font-bold/);
  assert.match(meuSetor, /className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end"/);
  assert.match(meuSetor, /<dd className="mt-1 break-words font-semibold text-slate-900">\{context\.funcionario\.nome/);
  assert.match(meuSetor, /<dd className="mt-1 break-words text-slate-900">\{context\.funcionario\.cargo/);
  assert.match(meuSetor, /<div className="min-w-0"><h2 id="sector-projects-title" className="break-words text-lg font-bold"/);
  assert.match(meuSetor, /className="shrink-0 rounded-full bg-slate-100/);
});

test("painel bloqueia nova validação enquanto o acesso é revalidado", () => {
  assert.match(meuSetor, /className="w-full shrink-0 whitespace-nowrap rounded-lg border border-rose-200/);
  assert.match(meuSetor, /disabled=\{accessLoading\} aria-label=\{accessLoading \? 'Validando acesso do funcionário' : 'Validar acesso novamente'\}/);
  assert.match(meuSetor, /\{accessLoading \? 'Validando…' : 'Validar acesso novamente'\}/);
});

test("inbox de materiais preserva erro e retry em telas estreitas", () => {
  assert.match(inboxMateriais, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading \|\| !!actionBusy\} onClick=\{\(\)=>void load\(\)\}/);
  assert.match(inboxMateriais, /<span className="min-w-0 break-words">\{error\}<\/span>/);
  assert.match(inboxMateriais, /className="btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?" aria-label="Tentar carregar as solicitações novamente" disabled=\{loading \|\| !!actionBusy\}/);
  assert.match(inboxMateriais, /className="break-words text-sm text-emerald-700"/);
});

test("fichas de serviço preservam busca e ação de abertura no mobile", () => {
  assert.match(fichasFuncionario, /<p className="min-w-0 break-words text-sm text-slate-500">\{query \?/);
  assert.match(fichasFuncionario, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading\} onClick=\{\(\) => setRefresh\(value => value \+ 1\)\}/);
  assert.match(fichasFuncionario, /<button className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" type="submit" disabled=\{loading\}/);
  assert.match(fichasFuncionario, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading\} onClick=\{\(\) => \{ setSearch/);
  assert.match(fichasFuncionario, /<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading\} onClick=\{event =>/);
  assert.match(fichasFuncionario, /setError\('\'\);\s*openerRef\.current = event\.currentTarget;/);
  assert.match(fichasFuncionario, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Fechar ficha aberta"/);
});

test("editor de acesso quebra setores e permissões longas no mobile", () => {
  assert.match(editorFuncionario, /className="flex min-w-0 items-start gap-2 text-sm"><input type="checkbox"/);
  assert.match(editorFuncionario, /<span className="break-words">\{label\}<\/span>/);
  assert.match(editorFuncionario, /<summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-2 py-2 break-words font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">/);
  assert.match(editorFuncionario, /<span className="break-words">\{permissionLabels\[c\.operacao\]\|\|c\.operacao\}<\/span>/);
  assert.match(editorFuncionario, /<p className="break-words text-xs text-slate-500">ID da conta:/);
});

test("tarefas preservam controles de filtro e paginação no mobile", () => {
  assert.match(minhasTarefas, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading\} onClick=\{\(\)=>\{setFilter/);
  assert.match(minhasTarefas, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading\} onClick=\{\(\)=>setRefresh/);
  assert.match(minhasTarefas, /<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Ir para a página anterior de tarefas"/);
  assert.match(minhasTarefas, /<span className="shrink-0 text-center text-sm sm:text-left" aria-current="page"/);
  assert.match(minhasTarefas, /aria-label="Ir para a próxima página de tarefas" disabled=\{loading \|\| !data\.tem_mais\}/);
});

test("notificações preservam ações e paginação no mobile", () => {
  assert.match(notificacoesFuncionario, /<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{!!busy\} aria-label=\{item\.tarefa_id\?/);
  assert.match(notificacoesFuncionario, /aria-label=\{`Marcar como lida: .*?`\} onClick=\{async/);
  assert.match(notificacoesFuncionario, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{!!busy\} aria-label=\{`Marcar como lida/);
  assert.match(notificacoesFuncionario, /<span className="shrink-0 text-center text-sm sm:text-left" aria-current="page"/);
  assert.match(notificacoesFuncionario, /aria-label="Ir para a próxima página" disabled=\{!data\.tem_mais \|\| !!busy\}/);
  assert.match(notificacoesFuncionario, /<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Fechar detalhe da notificação"/);
});

test("ocorrências preservam comunicação, resolução e paginação no mobile", () => {
  assert.match(ocorrencias, /<button type="submit" className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label=\{busy\?'Registrando ocorrência':'Comunicar ocorrência'\}/);
  assert.match(ocorrencias, /<button type="submit" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label=\{busy\?'Salvando resolução da ocorrência':'Registrar resolução da ocorrência'\}/);
  assert.match(ocorrencias, /<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Ir para a página anterior de ocorrências"/);
  assert.match(ocorrencias, /<span className="self-center shrink-0 text-center text-sm sm:text-left" aria-current="page"/);
  assert.match(ocorrencias, /aria-label=\{loading \|\| busy\?'Aguarde a atualização das ocorrências':'Atualizar ocorrências'\}/);
});

test("solicitações de materiais acomodam cabeçalho e ações no mobile", () => {
  assert.match(solicitacaoMaterial, /<div className="min-w-0"><h4 id=\{`\$\{fieldPrefix\}-title`\} className="break-words font-semibold">/);
  assert.match(solicitacaoMaterial, /<p className="break-words text-sm text-slate-500">Peça materiais para esta ordem/);
  assert.match(solicitacaoMaterial, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" onClick=\{refreshRequests\}/);
  assert.match(solicitacaoMaterial, /<span className="flex min-w-0 w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">/);
  assert.match(solicitacaoMaterial, /className="shrink-0 rounded-full bg-white px-2 py-1 text-xs"/);
  assert.match(solicitacaoMaterial, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label=\{`Cancelar solicitação/);
  assert.match(solicitacaoMaterial, /className="btn-primary inline-flex w-full shrink-0 whitespace-nowrap sm:col-span-2 sm:w-auto"/);
});

test("inbox de materiais acomoda retry de erro no mobile", () => {
  assert.match(inboxMateriais, /className="flex flex-col items-stretch gap-2 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"/);
  assert.match(inboxMateriais, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Tentar carregar as solicitações novamente"/);
  assert.match(inboxMateriais, /className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"/);
  assert.match(inboxMateriais, /className="btn-primary w-full shrink-0 whitespace-nowrap text-sm sm:w-auto"/);
});

test("registros de produção quebram observações sem deslocar o horário", () => {
  assert.match(registroProducao, /<span className="min-w-0 break-words"><strong>\{formatType\(item\.tipo\)\}/);
  assert.match(registroProducao, /<time className="shrink-0 text-xs text-slate-500" dateTime=\{safeEntryDateTime\(item\.criado_em\)\}/);
  assert.match(registroProducao, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" onClick=\{\(\) => \{ setMessage\(''\); onRefresh\(\); \}\}/);
});

test("ficha técnica quebra a situação sem perder as ações", () => {
  assert.match(fichaTecnica, /<span role="status" aria-live="polite" className="min-w-0 break-words text-sm font-medium">Situação:/);
  assert.match(fichaTecnica, /<div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">/);
  assert.match(fichaTecnica, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading \|\| saving \|\| checklistBusy/);
});

test("erro de responsáveis organiza retry no mobile", () => {
  const assignment = readOptional("../src/modules/workforce/components/SheetAssignmentEditor.tsx");
  assert.match(assignment, /<div role="alert" className="flex flex-col gap-2 text-sm text-red-700 sm:flex-row sm:items-start sm:justify-between"><p className="min-w-0 break-words">\{error\}<\/p>/);
  assert.match(assignment, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label=\{loading \|\| busy\?'Aguarde a atualização dos responsáveis':'Tentar carregar os responsáveis novamente'\}/);
});

test("controle de secagem protege status e atualização no mobile", () => {
  assert.match(controleSecagem, /<div className="min-w-0">\s*<h4 id=\{`\$\{id\}-title`\}/);
  assert.match(controleSecagem, /className="break-words text-sm text-slate-500"/);
  assert.match(controleSecagem, /className=\{`shrink-0 rounded-full px-2 py-1 text-xs font-medium/);
  assert.match(controleSecagem, /className="min-w-0 text-sm"/);
  assert.match(controleSecagem, /className="input-field mt-1 w-full max-w-full sm:w-44"/);
  assert.match(controleSecagem, /className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto"/);
  assert.match(controleSecagem, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" onClick=\{refreshDrying\}/);
});

test("agenda acomoda título e atualização em telas estreitas", () => {
  assert.match(agendaFuncionario, /<div className="min-w-0"><h2 id="work-agenda-title" className="break-words text-lg font-bold">/);
  assert.match(agendaFuncionario, /<p className="break-words text-sm text-slate-500">Prazos das tarefas atribuídas a você/);
  assert.match(agendaFuncionario, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading\} onClick=\{\(\)=>void load\(\)\}/);
});

test("resumo operacional protege indicadores longos no mobile", () => {
  assert.match(resumoFuncionario, /<div className="min-w-0"><h2 id="personal-work-summary-title" className="break-words text-lg font-bold">/);
  assert.match(resumoFuncionario, /className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{loading\} onClick=\{\(\)=>setRetry\(n=>n\+1\)\}/);
  assert.match(resumoFuncionario, /className=\{`card min-w-0 border p-4/);
  assert.match(resumoFuncionario, /<p className="break-words text-sm text-slate-600">\{label\}<\/p>/);
  assert.match(resumoFuncionario, /className="mt-2 whitespace-nowrap text-2xl font-bold text-slate-900"/);
});

test("ações de anexos não comprimem o nome do arquivo no mobile", () => {
  assert.match(anexos, /<div className="flex min-w-0 flex-wrap gap-2"><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto"/);
  assert.match(anexos, /<a className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label=\{`Abrir/);
});

test("detalhe da tarefa organiza título, atualização e recarga no mobile", () => {
  assert.match(detalheTarefa, /<div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 id="task-details-title" className="break-words font-semibold">/);
  assert.match(detalheTarefa, /className="btn-secondary (?:w-full )?shrink-0 whitespace-nowrap(?: sm:w-auto)?" disabled=\{loading\|\|accessLoading\}/);
  assert.match(detalheTarefa, /<span className="text-xs text-slate-500" aria-live="polite">/);
});

test("aceite da instalação quebra confirmação longa no mobile", () => {
  assert.match(aceiteInstalacao, /<h4 className="break-words font-semibold">Registrar aceite da instalação<\/h4>/);
  assert.match(aceiteInstalacao, /className="mt-1 shrink-0" type="checkbox"/);
  assert.match(aceiteInstalacao, /<span className="min-w-0 break-words">Confirmo que o cliente/);
  assert.match(aceiteInstalacao, /className="btn-primary inline-flex w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label=/);
});

test("cartão de tarefa mantém badges e prazo legíveis no mobile", () => {
  assert.match(minhasTarefas, /className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled=\{busy \|\| !dirty/);
  assert.match(minhasTarefas, /className="break-words whitespace-pre-wrap text-sm text-slate-500">\{task\.observacoes\}/);
  assert.match(minhasTarefas, /className=\{`shrink-0 rounded-full px-2\.5 py-1 text-xs font-semibold/);
  assert.match(minhasTarefas, /<span className="break-words">\{formatTaskSector\(task\.setor\)\}<\/span>/);
  assert.match(minhasTarefas, /className=\{`shrink-0 rounded-full px-2 py-1 font-semibold/);
  assert.match(minhasTarefas, /<span className="break-words">Obrigatória para concluir a etapa<\/span>/);
  assert.match(minhasTarefas, /<span className="break-words">Prazo: <time/);
});

