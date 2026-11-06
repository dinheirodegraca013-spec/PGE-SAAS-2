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

test("rotas autenticadas incluem VisÃ£o 3D e Equipe", () => {
  assert.match(app, /path="visao-3d"/);
  assert.match(app, /path="equipe"/);
});

test("menu lateral aponta para VisÃ£o 3D e Equipe", () => {
  assert.match(nav, /path: '\/visao-3d'/);
  assert.match(nav, /path: '\/equipe'/);
});

test("funcionÃ¡rio nÃ£o recebe links administrativos de configuraÃ§Ãµes", () => {
  assert.match(appLayout, /const employeeProfilePath = work\.context && !work\.context\.proprietario \? '\/meu-setor#perfil' : '\/configuracoes'/);
  assert.match(appLayout, /work\.context\?\.proprietario && <NavLink/);
  assert.match(appLayout, /to=\{employeeProfilePath\}/);
});

test("sino do funcionÃ¡rio abre a central de notificaÃ§Ãµes do painel", () => {
  assert.match(appLayout, /to="\/meu-setor#notificacoes"/);
  assert.match(appLayout, /aria-label="Abrir notificaÃ§Ãµes do funcionÃ¡rio"/);
  assert.match(appLayout, /work\.context && !work\.context\.proprietario && hasPermission\(work\.context, 'notificacoes'\) \? <NavLink/);
  assert.match(appLayout, /work\.context\?\.proprietario \? <button/);
});

test("cabeÃ§alho acompanha o estado real da conexÃ£o", () => {
  assert.match(appLayout, /useState\(\(\) => typeof navigator === 'undefined' \|\| navigator\.onLine\)/);
  assert.match(appLayout, /addEventListener\('online', updateConnection\)/);
  assert.match(appLayout, /addEventListener\('offline', updateConnection\)/);
  assert.match(appLayout, /\{online \? 'Sistema online' : 'Sem conexÃ£o'\}/);
});

test("sino nÃ£o inventa contador de notificaÃ§Ãµes", () => {
  assert.doesNotMatch(appLayout, /bg-rose-500/);
});

test("perfil fecha o menu mÃ³vel ao navegar", () => {
  assert.match(appLayout, /to=\{employeeProfilePath\}\s*onClick=\{\(\) => setMobileMenuOpen\(false\)\}/);
});

test("atalho de recursos tambÃ©m fecha o menu mÃ³vel", () => {
  assert.match(appLayout, /to="\/configuracoes"\s*onClick=\{\(\) => setMobileMenuOpen\(false\)\}/);
});

test("visÃ£o operacional nÃ£o incorpora os nÃºmeros demonstrativos do protÃ³tipo", () => {
  assert.doesNotMatch(visao, /R\$\s*10\.550|MDF 18mm \(chapa\).*6 de 10/);
  assert.match(visao, /estoque_itens|projetosService/);
});

test("VisÃ£o 3D usa renderizaÃ§Ã£o WebGL real com fallback", () => {
  assert.match(mapa3d, /WebGLRenderer/);
  assert.match(mapa3d, /OrbitControls/);
  assert.match(mapa3d, /activeWorkers/);
  assert.match(mapa3d, /workerName/);
  assert.match(mapa3d, /onSectorSelect/);
  assert.match(mapa3d, /O modo 3D nÃ£o estÃ¡ disponÃ­vel neste navegador/);
  assert.match(mapa3d, /setClearColor\(0xffffff, 1\)/);
  assert.doesNotMatch(mapa3d, /Modo 3D ativo/);
});

test("VisÃ£o 3D carrega o mapa pesado sob demanda", () => {
  assert.match(visao, /lazy\(\(\) => import\("\.\/ThreeOperationalMap"\)\)/);
  assert.match(visao, /Carregando visÃ£o 3D/);
  assert.match(visao, /<Suspense/);
});

test("VisÃ£o 3D mantÃ©m o painel lateral com alertas e equipe sem inventar presenÃ§a", () => {
  assert.match(
    visao,
    /setores\.filter\(\(setor\) => setor\.estado === "critico"\)/,
  );
  assert.match(visao, /Equipe/);
  assert.match(visao, /PresenÃ§a diÃ¡ria nÃ£o registrada/);
  assert.match(visao, /value="nao-registrada"/);
  assert.match(visao, /onSectorSelect={abrirSetor}/);
});

test("equipe consulta profiles do tenant e explicita presenÃ§a nÃ£o registrada", () => {
  assert.match(equipe, /from\(["']profiles["']\)/);
  assert.match(equipe, /PresenÃ§a nÃ£o registrada/);
  assert.match(equipe, /Setor/);
});

test("dashboard oferece resumo para VisÃ£o 3D e Equipe", () => {
  assert.match(dashboard, /to="\/visao-3d"/);
  assert.match(dashboard, /to="\/equipe"/);
});

test("painel do funcionÃ¡rio mantÃ©m aÃ§Ãµes rÃ¡pidas e dados reais do setor", () => {
  assert.match(meuSetor, /Painel do funcionÃ¡rio/);
  assert.match(meuSetor, /AÃ§Ãµes rÃ¡pidas/);
  assert.match(meuSetor, /hasPermission\(context, 'tarefas'\)/);
  assert.match(meuSetor, /meu_setor_projetos/);
  assert.match(meuSetor, /formatPrazo/);
  assert.match(meuSetor, /additionalSectors/);
  assert.match(meuSetor, /Tentar novamente/);
  assert.match(meuSetor, /aria-live="polite"/);
  assert.match(meuSetor, /atualizadoEm/);
  assert.match(meuSetor, /Atualizado Ã s/);
});

test("painel nÃ£o transforma carregamento ou erro de projetos em zero", () => {
  assert.match(meuSetor, /carregando \? 'â€¦' : erro \? 'IndisponÃ­vel'/);
});

test("painel mantÃ©m projetos visÃ­veis durante nova consulta", () => {
  assert.match(meuSetor, /carregando && !projetos\.length/);
  assert.match(meuSetor, /Atualizando projetosâ€¦/);
});

test("painel limpa o alerta apÃ³s atualizar projetos com sucesso", () => {
  assert.match(meuSetor, /setErro\(''\);\s*setProjetos\(normalizeProjects\(data\)\)/);
});

test("painel nomeia a atualizaÃ§Ã£o dos projetos", () => {
  assert.match(meuSetor, /aria-label=\{carregando \? 'Atualizando painel' : !online \? 'Sem conexÃ£o para atualizar painel' : 'Atualizar painel'\}/);
  assert.match(meuSetor, /aria-label=\{`\$\{p\.titulo\} Â· \$\{formatPrazo\(p\.prazo\)\}\$\{status \? ` Â· \$\{status\}` : ''\}`\}/);
  assert.match(meuSetor, /<h3 className="min-w-0 break-words text-slate-900">\{p\.titulo\}<\/h3>/);
  assert.match(meuSetor, /<time className=\{`mt-2 block text-sm/);
  assert.match(meuSetor, /role="status" aria-live="polite" className="rounded-lg border border-dashed/);
});

test("aÃ§Ãµes administrativas da equipe tÃªm nomes acessÃ­veis", () => {
  const equipeView = readOptional("../src/views/equipe/EquipeView.tsx");
  assert.match(equipeView, /aria-label="Cadastrar novo funcionÃ¡rio"/);
  assert.match(equipeView, /aria-label=\{carregando \? 'Atualizando equipe' : 'Atualizar equipe'\}/);
  assert.match(equipeView, /aria-label="Encaminhar projeto para o setor selecionado"/);
  assert.match(equipeView, /aria-label="Tentar carregar projetos novamente"/);
});

test("busca de colaboradores anuncia a quantidade de resultados", () => {
  const equipeView = readOptional("../src/views/equipe/EquipeView.tsx");
  assert.match(equipeView, /role="status" aria-live="polite">\{busca \? `\$\{filtrados\.length\}/);
  assert.match(equipeView, /\$\{perfis\.length\} \$\{perfis\.length === 1 \? 'colaborador disponÃ­vel' : 'colaboradores disponÃ­veis'\}/);
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

test("solicitaÃ§Ã£o de material relaciona bloqueio Ã  mensagem de estoque vazio", () => {
  assert.match(solicitacaoMaterial, /id=\{`\$\{fieldPrefix\}-no-materials`\} role="status"/);
  assert.match(solicitacaoMaterial, /aria-describedby=\{!options\.length \? `\$\{fieldPrefix\}-no-materials` : undefined\}/);
});

test("histÃ³rico de materiais quebra textos longos sem deslocar aÃ§Ãµes", () => {
  assert.match(solicitacaoMaterial, /<span className="min-w-0 break-words"><strong>\{requestItem\.item_nome\}/);
  assert.match(solicitacaoMaterial, /<span className="flex shrink-0 flex-wrap items-center justify-end gap-2">/);
});

test("ficha tÃ©cnica acomoda tÃ­tulo longo junto do recarregamento", () => {
  assert.match(fichaTecnica, /<h3 className="min-w-0 break-words font-semibold">\{sheet\.modelo\.titulo\}<\/h3>/);
  assert.match(fichaTecnica, /<button type="button" className="btn-secondary shrink-0" aria-label="Recarregar ficha tÃ©cnica"/);
});

test("painel nÃ£o consulta projetos quando a validaÃ§Ã£o de acesso falha", () => {
  assert.match(meuSetor, /if \(accessLoading \|\| accessError \|\| !context\)/);
  assert.match(meuSetor, /\[accessLoading, accessError, context,/);
});

test("painel de projetos participa da atualizaÃ§Ã£o global", () => {
  assert.match(meuSetor, /workforceRefreshEvent/);
  assert.match(meuSetor, /addEventListener\(workforceRefreshEvent, refreshPanel\)/);
  assert.match(meuSetor, /onClick=\{\(\) => requestWorkforceRefresh\(\)\}/);
});

test("painel remove projetos antigos quando a autorizaÃ§Ã£o Ã© revogada", () => {
  assert.match(meuSetor, /if \(accessError\) \{\s*setProjetos\(\[\]\);\s*setAtualizadoEm\(null\);/);
});

test("painel anuncia sincronizaÃ§Ã£o global para tecnologia assistiva", () => {
  assert.match(meuSetor, /className="space-y-6" aria-busy=\{carregando \|\| accessLoading\}/);
});

test("painel informa conexÃ£o offline e retoma sincronizaÃ§Ã£o ao voltar", () => {
  assert.match(meuSetor, /window\.addEventListener\('online'/);
  assert.match(meuSetor, /window\.addEventListener\('offline'/);
  assert.match(meuSetor, /if \(isOnline\) requestWorkforceRefresh\(\)/);
  assert.match(meuSetor, /Sem conexÃ£o com a internet/);
  assert.match(meuSetor, /!online/);
});

test("gerenciador de dispositivos rejeita dados inconsistentes", () => {
  assert.match(gerenciadorDispositivos, /isDateString/);
  assert.match(gerenciadorDispositivos, /new Set\(devices\.map\(\(device: Device\) => device\.id\)\)/);
  assert.match(gerenciadorDispositivos, /length > data\.limit/);
});

test("revalidaÃ§Ã£o do funcionÃ¡rio preserva contexto vÃ¡lido durante o carregamento", () => {
  assert.match(acessoWorkforce, /setContext\(current => current && current\.empresa_id===tenantId && current\.funcionario\.id===userId \? current : null\)/);
});

test("revalidaÃ§Ã£o ignora respostas antigas apÃ³s troca de identidade", () => {
  assert.match(acessoWorkforce, /const generation=useRef\(0\)/);
  assert.match(acessoWorkforce, /const request=\+\+generation\.current/);
  assert.match(acessoWorkforce, /request===generation\.current&&identity\.current\.userId===userId&&identity\.current\.tenantId===tenantId/);
  assert.match(acessoWorkforce, /useEffect\(\(\)=>\(\)=>\{generation\.current\+\+;\},\[\]\)/);
});

test("atualizaÃ§Ã£o do painel sincroniza os blocos de trabalho", () => {
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

test("painel exibe perfil somente quando a permissÃ£o foi concedida", () => {
  assert.match(meuSetor, /hasPermission\(context,'perfil'\)/);
  assert.match(meuSetor, /id="perfil"/);
  assert.match(meuSetor, /employee-profile-title/);
  assert.match(meuSetor, /context\.funcionario\.ultimo_acesso/);
  assert.match(meuSetor, /Setores autorizados/);
});

test("aÃ§Ãµes rÃ¡pidas possuem foco visÃ­vel no teclado", () => {
  assert.match(meuSetor, /focus:ring-2 focus:ring-cyan-500/);
});

test("painel do funcionÃ¡rio evita estouro de textos dinÃ¢micos no celular", () => {
  assert.match(meuSetor, /className="min-w-0 break-words text-slate-300"/);
  assert.match(meuSetor, /className="min-w-0 break-words text-slate-400"/);
  assert.match(meuSetor, /className="min-w-0 break-words">\{erro\}<\/span>/);
  assert.match(meuSetor, /className="min-w-0 break-words">\{accessError\}<\/span>/);
  assert.match(meuSetor, /className="card group min-w-0 p-4/);
  assert.match(meuSetor, /className="mt-1 block break-words text-xs text-slate-500"/);
});

test("painel oferece atalho de teclado para as aÃ§Ãµes rÃ¡pidas", () => {
  assert.match(meuSetor, /quickActions\.length > 0 && <a href="#quick-actions"/);
  assert.match(meuSetor, /href="#quick-actions"/);
  assert.match(meuSetor, /Pular para as aÃ§Ãµes rÃ¡pidas/);
  assert.match(meuSetor, /id="quick-actions" tabIndex=\{-1\}/);
  assert.match(meuSetor, /!quickActions\.length && <p role="status" aria-live="polite"/);
});

test("saltos das aÃ§Ãµes rÃ¡pidas devolvem foco Ã  seÃ§Ã£o de destino", () => {
  assert.match(meuSetor, /window\.addEventListener\('hashchange', focusHashTarget\)/);
  assert.match(meuSetor, /window\.requestAnimationFrame\(focusHashTarget\)/);
  assert.match(meuSetor, /window\.cancelAnimationFrame\(frame\)/);
  assert.match(meuSetor, /lastFocusedHash\.current === id && document\.activeElement === target/);
  assert.match(meuSetor, /\}, \[accessRenderKey\]\)/);
  assert.match(meuSetor, /target\.setAttribute\('tabindex', '-1'\); target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(meuSetor, /id="tarefas" tabIndex=\{-1\}/);
  assert.match(meuSetor, /id="agenda" tabIndex=\{-1\}/);
});

test("painel preserva a Ãºltima atualizaÃ§Ã£o durante nova consulta", () => {
  assert.match(meuSetor, /const contextKey = context \? `\$\{context\.empresa_id\}:\$\{context\.funcionario\.id\}` : '';\s*if \(contextKey !== lastContextKey\.current\)/);
  assert.match(meuSetor, /if \(accessError\) \{\s*setProjetos\(\[\]\);\s*setAtualizadoEm\(null\);/);
});

test("tarefas do funcionÃ¡rio permitem recuperar falhas de carregamento", () => {
  assert.match(minhasTarefas, /Tentar novamente/);
  assert.match(minhasTarefas, /aria-live="polite"/);
  assert.match(minhasTarefas, /setRefresh\(n=>n\+1\)/);
});

test("tarefas refletem imediatamente status e progresso selecionados", () => {
  assert.match(minhasTarefas, /aria-label=\{`Tarefa \$\{task\.titulo\} Â· \$\{formatTaskStatus\(displayedStatus\)\} Â· \$\{formatTaskSector\(task\.setor\)\} Â· Prioridade \$\{formatPriority\(task\.prioridade\)\} Â· \$\{task\.prazo\?`Prazo \$\{formatTaskDeadline\(task\.prazo\)\}`:'Sem prazo'\}\$\{overdue\?' Â· Atrasada':''\}`\}/);
  assert.match(minhasTarefas, /dateTime=\{safeTaskDateTime\(task\.prazo\)\}/);
  assert.match(minhasTarefas, /aria-describedby=\{`\$\{id\}-progress-help`\}/);
  assert.match(minhasTarefas, /aria-describedby=\{`\$\{id\}-notes-help`\}/);
  assert.match(minhasTarefas, /displayedStatus=final\?task\.status:status/);
  assert.match(minhasTarefas, /displayedProgress=displayedStatus==='concluida'\?100:progress/);
  assert.match(minhasTarefas, /type="number" inputMode="numeric" required min=\{0\} max=\{100\} step=\{1\}/);
  assert.match(minhasTarefas, /aria-valuetext=\{`\$\{safeDisplayedProgress\}% concluÃ­do`\}/);
});

test("tarefas destacam a prioridade com cores semÃ¢nticas", () => {
  assert.match(minhasTarefas, /const priorityTone=/);
  assert.match(minhasTarefas, /urgente:'bg-rose-100 text-rose-800'/);
  assert.match(minhasTarefas, /priorityBadgeTone\(task\.prioridade\)/);
});

test("tarefas vencidas recebem destaque visual e acessÃ­vel", () => {
  assert.match(minhasTarefas, /overdue\?'border-rose-200 bg-rose-50\/40':'border-slate-200'/);
  assert.match(minhasTarefas, /overdue\?' Â· Atrasada':''/);
  assert.match(minhasTarefas, /bg-rose-100 text-rose-800/);
});

test("tarefas prÃ³ximas do prazo recebem aviso relativo", () => {
  assert.match(minhasTarefas, /function deadlineHint\(value:string\)/);
  assert.match(minhasTarefas, /Vence hoje/);
  assert.match(minhasTarefas, /Vence amanhÃ£/);
  assert.match(minhasTarefas, /Vence em \$\{days\} dias/);
});

test("serviÃ§o de tarefas exige progresso inteiro", () => {
  const tarefasService = readOptional("../src/modules/workforce/services/tasks.service.ts");
  assert.match(tarefasService, /Number\.isInteger\(row\.progresso\)/);
  assert.match(tarefasService, /Number\.isInteger\(\(value as Record<string,unknown>\)\.progresso\)/);
});

test("painel quebra tÃ­tulos longos em telas estreitas", () => {
  assert.match(minhasTarefas, /min-w-0 break-words font-semibold/);
  assert.match(minhasTarefas, /break-words whitespace-pre-wrap text-sm text-slate-600/);
  assert.match(agendaFuncionario, /min-w-0 flex-1/);
  assert.match(agendaFuncionario, /shrink-0 text-sm font-semibold/);
  assert.match(resumoFuncionario, /min-w-0 break-words/);
});

test("resumo de trabalho preserva prazo e status no mobile", () => {
  assert.match(resumoFuncionario, /<span className="flex shrink-0 flex-wrap items-center justify-end gap-2"><time className=\{status==='Atrasado'\?'shrink-0 font-semic]}ÓÛh‘éì¶»§q«^w›X]Ú
[˜›ÞX]\šXZ\ËØXÝ[Û\ÞKÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËØ\šXK[X™[WØÛÛXÚ]péðèÛÈH	Ú][Wš][WÛ›ÛYWH0­È	Ù›Ü›X]]X[]W
][Wœ]X[YYW
WH	Ú][W[šYYWH0­È	Ù›Ü›X]Ý]\×
][WœÝ]\×
WXKÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÙ\ØX›YWÛØY[™×HXXÝ[Û\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
™\Ý[[Ñ[˜Ú[Û˜\š[ËØ\šXKX\ÞOWÛØY[™×KÊNÃBŸJNÃBƒB\Ý
œÙXØYÙ[HH›ÙpéðèÛÈ[™›Ü›X[H]X[^˜péðèÛÈ›ÜÈ›Ý0íY\È‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KØ\šXK[X™[WØ\ÞWÉÐYÝX\™HH]X[^˜péðèÛÈHÙXØYÙ[IÎ‰Ð]X[^˜\ˆÜ°è\š[ÈÈÙ\šYÜ‰×KÊNÃBˆ\ÜÙ\›X]Ú
™YÚ\Ý›Ô›ÙXØ[ËØ\šXK[X™[WØ\ÞWÉÐYÝX\™HH]X[^˜péðèÛÈÜÈ™YÚ\Ý›ÜÉÎ‰Ð]X[^˜\ˆ™YÚ\Ý›ÜÉ×KÊNÃBŸJNÃBƒB\Ý
œÙXØYÙ[H[\H™YY˜XÚÈ[ÈY]\ˆÈ˜^›È‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KÜÙ]Z[]\×
]™[\™Ù]˜[YW
NÈÙ]Y\ÜØYÙW
	É×
KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KÝ\OH›[X™\ˆˆ[œ][ÙOH›[Y\šXÈˆ™\]Z\™YZ[WÌWHX^WÌLKÊNÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KÝ\OH›[X™\ˆˆ[œ][ÙOH›[Y\šXÈˆ™\]Z\™YZ[WÌWKÊNÃBŸJNÃBƒB\Ý
˜Ø\0èÛÈHÛÛXÚ]péðèÛÈ[™›Ü›XH]X[^˜péðèÛÈ›È›Ý0èÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[Ø\šXK[X™[WØ\ÞWÉÐ]X[^˜[™ÈÛÛXÚ]péðíY\ÉÎ‰Ð]X[^˜\ˆÛÛXÚ]péðíY\É×KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[×Ø\ÞWÉÐ]X[^˜[™ø )‰Î‰Ð]X[^˜\‰×KÊNÃBŸJNÃBƒB\Ý
˜Ø\0èÛÈHÛÛXÚ]péðèÛÈ™\Ù\˜HÈÜ°è\š[È\˜[HÚ[˜Ü›Ûš^˜péðèÛÈ‹

HOˆÃBˆ\ÜÙ\™Ù\Ó›ÝX]Ú
ÛÛXÚ]XØ[ÓX]\šX[ÜÙ]\ÞW
YW
NÈÙ]Y\ÜØYÙW
	É×
NÈÙ]\]Y]
[
KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[Ø\ÞWÉÐ]X[^˜[™ÈÛÛXÚ]péðíY\ø )‰Î\]Y]ÊNÃBŸJNÃBƒB\Ý
˜Ø[˜Ù[[Y[ÈHX]\šX[ÛÛ™š\›XHÝXÙ\ÜÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[Ø\šXK[X™[WØÛÛXÚ]péðèÛÈH	Ü™\]Y\Ý][Wš][WÛ›ÛYWH0­È	Ù›Ü›X]]X[]W
™\]Y\Ý][Wœ]X[YYW
WH	Ü™\]Y\Ý][W[šYYWH0­È	Ù›Ü›X]Ý]\×
™\]Y\Ý][WœÝ]\×
WXKÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[Ø]ØZ]ÛØ[˜Ù[
™\]Y\Ý][W
NÈÙ]Y\ÜØYÙRÚ[™
	ÜÝ]\É×
NÈÙ]Y\ÜØYÙW
	ÔÛÛXÚ]péðèÛÈØ[˜Ù[YW‰×
KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[ÛY\ÜØYÙRÚ[™ÊœÙ]Y\ÜØYÙRÚ[™KŠ\ÙTÝ]O	ÜÝ]\ÉÈ	Ù\œ›Ü‰Ï—
	ÜÝ]\É×
KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[ÜÙ]Y\ÜØYÙRÚ[™
	ÜÝ]\É×
N×ÊœÙ]Y\ÜØYÙW
	ÔÛÛXÚ]péðèÛÈØ[˜Ù[YW‰×
KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[Ü›ÛOWÛY\ÜØYÙRÚ[™OOH	ÜÝ]\ÉÈÈ	ÜÝ]\ÉÈˆ	Ø[\	×KÊNÃBŸJNÃBƒB\Ý
š[˜›ÞH\ÝÜ]YH[™›Ü›XH]X[^˜péðèÛÈ›È›Ý0èÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËØ\šXK[X™[WÛØY[™ÈHXXÝ[Û\ÞWÉÐYÝX\™HH]X[^˜péðèÛÈ\ÈÛÛXÚ]péðíY\ÉÎ‰Ð]X[^˜\ˆÛÛXÚ]péðíY\É×KÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\Ë×ÛØY[™ÈHXXÝ[Û\ÞWÉÐYÝX\™x )‰Î‰Ð]X[^˜\‰×KÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËØ\šXKX\ÞOWÛØY[™ÈHXXÝ[Û\ÞWKÊNÃBŸJNÃBƒB\Ý
š[˜›ÞH\ÝÜ]YH\XÚ\HH]X[^˜péðèÛÈÛØ˜[‹

HOˆÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÝÛÜšÙ›Ü˜ÙT™Yœ™\Ú]™[ÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËØY]™[\Ý[™\—
ÛÜšÙ›Ü˜ÙT™Yœ™\Ú]™[™Yœ™\Ú[™[
KÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÝ›ÚYØY
˜[ÙW
KÊNÃBŸJNÃBƒB\Ý
š[˜›Þ[\HÛÛ™š\›XpéðèÛÈ[\ÈH›Ý˜HpéðèÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÜÙ]XÝ[Û\ÞW
][WšY
NÜÙ]\œ›Ü—
	É×
NÜÙ]Y\ÜØYÙW
	É×
KÊNÃBŸJNÃBƒB\Ý
™Y]Ü™\ÈÜ\˜XÚ[Û˜Z\È[[˜ÚX[HØ\œ™YØ[Y[ÈH›Ü]YZX[H\ÝYÜÈÛÛ˜ÛÜœ™[\È‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KØ\šXKX\ÞOWÛØY[™È\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KØ\šXK[]™OHœÛ]H‹ÊNÃBˆ\ÜÙ\›X]Ú
]šXZXØ[ÑšXÚKØ\šXKX\ÞOWÛØY[™È\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
]šXZXØ[ÑšXÚKØ\šXK[]™OHœÛ]H‹ÊNÃBˆ\ÜÙ\›X]Ú
›^Ô›ÙXØ[ËØ\šXKX\ÞOWÛØY[™È\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
›^Ô›ÙXØ[ËØ\šXK[]™OHœÛ]H‹ÊNÃBŸJNÃBƒB\Ý
™›^È[™›Ü›XH\ÈpéðíY\ÈHØ[˜\ˆH™XØ\œ™YØ\ˆ‹

HOˆÃBˆ\ÜÙ\›X]Ú
›^Ô›ÙXØ[ËØ\šXK[X™[WØ\ÞWÉÔØ[˜[™È›^ÉÎ™›Ý×˜ÛÛ™šYÝ\˜Y×ÉÔØ[˜\ˆÙ\]pê›˜ÚXIÎ‰ÐÛÛ™šYÝ\˜\ˆ›^É×KÊNÃBˆ\ÜÙ\›X]Ú
›^Ô›ÙXØ[ËØ\šXK[X™[WÛØY[™×ÉÐØ\œ™YØ[™È›^ÉÎ‰Ô™XØ\œ™YØ\ˆ›^É×KÊNÃBŸJNÃBƒB\Ý
™›^È™\Ù\˜HHÛÛ™šYÝ\˜péðèÛÈ\˜[HÚ[˜Ü›Ûš^˜péðèÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
›^Ô›ÙXØ[ËÙ›ÝÈÈ	Ð]X[^˜[™È›^ø )‰Èˆ	ÐØ\œ™YØ[™È›^ø )‰ËÊNÃBˆ\ÜÙ\™Ù\Ó›ÝX]Ú
›^Ô›ÙXØ[ËÜÙ]ØY[™×
YW
NÜÙ]\œ›Ü—
	É×
NÜÙ]›Ý×
[
KÊNÃBˆ\ÜÙ\›X]Ú
›^Ô›ÙXØ[ËÝ\ÙQY™™XÝ


OO—ÜÙ]›Ý×
[
NÜÙ]Ù[XÝY
×W
N×KÜÙ\šXÙRYÛÛ^×œ›ÜšY]\š[×W
KÊNÃBŸJNÃBƒB\Ý
™›^È[\H™YY˜XÚÈ[È[\˜\ˆHÙ\]pê›˜ÚXH‹

HOˆÃBˆ\ÜÙ\›X]Ú
›^Ô›ÙXØ[ËÜÙ]Y\ÜØYÙW
	É×
NÜÙ]\œ›Ü—
	É×
NÜÙ]Ù[XÝYÊNÃBŸJNÃBƒB\Ý
˜ÜšXpéðèÛÈH\™Y˜H[™›Ü›XHØ\œ™YØ[Y[ÈÜÈ™\ÜÛœðè]™Z\È‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KØ\šXK[X™[WÛØY[™×ÉÐØ\œ™YØ[™È™\ÜÛœðè]™Z\ÉÎ˜\ÞWÉÐÜšX[™È\™Y˜IÎ‰ÐÜšX\ˆ\™Y˜I×KÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜K×ÛØY[™×ÉÐØ\œ™YØ[™ø )‰Î˜\ÞWÉÐÜšX[™ø )‰Î‰ÐÜšX\ˆ\™Y˜I×KÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KØØ[™Y]\×›[™ÝÈ	Ð]X[^˜[™È™\ÜÛœðè]™Z\ø )‰Èˆ	ÐØ\œ™YØ[™È™\ÜÛœðè]™Z\ø )‰ËÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÈ[ØY[™È	‰ˆY\œ›Üˆ	‰ˆXØ[™Y]\×›[™Ý	‰ˆ›ÛOHœÝ]\Èˆ\šXK[]™OHœÛ]H‹ÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÝ\OH™]][YK[ØØ[ˆ]]ÐÛÛ\]OH›Ù™ˆˆ\šXKY\ØÜšX™YžOWØ	ÚYKYXY[™KZ[H˜[YOWÙXY[™WKÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KØ]]ÐÛÛ\]OH›Ù™ˆˆ\šXKY\ØÜšX™YžOWØ	ÚYKYXY[™KZ[KÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÓÈÜ°è\š[ÈÙ\°èHØ[›ÈÛÛ™›Ü›YHÈ\ÛÈØØ[\ÝH\ÜÜÚ]]›ËÊNÃBŸJNÃBƒB\Ý
˜ÜšXpéðèÛÈH\™Y˜H[\H™YY˜XÚÈ[È›ØØ\ˆÈÛÛ^È‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÜÙ]Ø[™Y]\×
×W
NÜÙ][\ÞYYW
	É×
NÜÙ]]W
	É×
NÜÙ]\ØÜš\[Û—
	É×
NÜÙ]XY[™W
	É×
NÜÙ]š[Üš]W
	Û›Ü›X[	×
NÜÙ]X[™]ÜžW
˜[ÙW
NÜ™XÙZ\˜Ý\œ™[[[ÊNÃBˆ\ÜÙ\™Ù\Ó›ÝX]Ú
ÜšXXØ[Õ\™Y˜KÜÙ]ØY[™×
YW
NÜÙ]\œ›Ü—
	É×
NÜÙ]Y\ÜØYÙW
	É×
NÜÙ]Ø[™Y]\×
×W
KÊNÃBŸJNÃBƒB\Ý
˜ÜšXpéðèÛÈH\™Y˜H[\H˜[YpéðèÛÈ[ÈÛÜœšYÚ\ˆØ[\ÜÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÜÙ]]W
]™[\™Ù]˜[YW
NÜÙ]\œ›Ü—
	É×
NÜÙ]Y\ÜØYÙW
	É×
KÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÜÙ][\ÞYYW
]™[\™Ù]˜[YW
NÜÙ]\œ›Ü—
	É×
NÜÙ]Y\ÜØYÙW
	É×
KÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KØÛÛœÝÛX\‘™YY˜XÚÏW

OO—ÜÙ]\œ›Ü—
	É×
NÜÙ]Y\ÜØYÙW
	É×
N×KÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÜÙ]\ØÜš\[Û—
]™[\™Ù]˜[YW
NØÛX\‘™YY˜XÚ×

KÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÜÙ]XY[™W
]™[\™Ù]˜[YW
NØÛX\‘™YY˜XÚ×

KÊNÃBŸJNÃBƒB\Ý
˜ÜšXpéðèÛÈH\™Y˜H˜[YH\ØÜšpéðèÛÈ[\ÈÈ[š[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÚYWØ	ÚYK]]XV×—Jœ™\]Z\™YZ[“[™ÝWÌ—HX^[™ÝWÌŒKÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÙ\ØÜš\[Û—š[W

W›[™Ý‹ÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÒ[™›Ü›YH[XH\ØÜšpéðèÛÈÛÛH[ÈY[›ÜÈˆØ\˜XÝ\™\ËÊNÃBˆ\ÜÙ\›X]Ú
ÜšXXØ[Õ\™Y˜KÛZ[“[™ÝWÌ—HX^[™ÝWÌLH™\]Z\™YÊNÃBŸJNÃBƒB\Ý
™Y]ÜˆHXÙ\ÜÛÈ[[˜ÚXHØ\œ™YØ[Y[ÈH›Ü]YZXHØ[˜[Y[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËØ\šXKX\ÞOWØ\ÞHØY[™×KÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËØ\ÞI‰›ÛOHœÝ]\Èˆ\šXK[]™OHœÛ]H”Ø[˜[™ÈXÙ\ÜÛÈÈ[˜Ú[Û°è\š[ø )Ü‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÜ›ÛOHœÝ]\Èˆ\šXK[]™OHœÛ]H‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÙ[\ÞYYWÉÐ]X[^˜[™ÈXÙ\ÜÛø )‰Î‰ÐØ\œ™YØ[™ÈXÙ\ÜÛø )‰ËÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÙ\ØX›YWØ\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÙ]U[YOWÜØY™Q[\ÞYYQ]U[YW
[\ÞYYW˜Ü™X]YØ]
WKÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÝ\OH˜]ÛˆˆÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\ØX›YWØ\ÞWHÛÛXÚÏWÛÛØ[˜Ù[H\šXK[X™[H‘™XÚ\ˆYpéðèÛÈÈ[˜Ú[Û°è\š[È‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËØÛÛœÝÛX\‘\œ›ÜW

OOœÙ]\œ›Ü—
	É×
KÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÜÙ]˜[YW
W\™Ù]˜[YW
NØÛX\‘\œ›Ü—

KÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÚYWØ	ÙšY[YK[˜[YXV×—J˜]]ÐÛÛ\]OH›˜[YH‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÚYWØ	ÙšY[YKZ›Ø˜V×—J˜]]ÐÛÛ\]OH›Ü™Ø[š^˜][Û‹]]H‹ÊNÃBŸJNÃBƒB\Ý
œ™\ÜÛœðè]™[[\H™YY˜XÚÈ[È™XØ\œ™YØ\ˆØ[™Y]ÜÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
]šXZXØ[ÑšXÚKÜÙ]ØY[™×
YW
NÜÙ]\œ›Ü—
	É×
NÜÙ]Y\ÜØYÙW
	É×
KÊNÃBˆ\ÜÙ\›X]Ú
]šXZXØ[ÑšXÚKØØ[™Y]\×›[™ÝÈ	Ð]X[^˜[™È[˜Ú[Û°è\š[ÜÈ]]Üš^˜YÜø )‰Èˆ	ÐØ\œ™YØ[™È[˜Ú[Û°è\š[ÜÈ]]Üš^˜YÜø )‰ËÊNÃBˆ\ÜÙ\›X]Ú
]šXZXØ[ÑšXÚKÝ\ÙQY™™XÝ


OO—ÜÙ]Ø[™Y]\×
×W
N×KÜÙ\šXÙRYÙXÝÜ—W
KÊNÃBŸJNÃBƒB\Ý
œ™\ÜÛœðè]™[[\H™YY˜XÚÈ]X[™ÈHšXÚH]YH^\›˜[Y[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
]šXZXØ[ÑšXÚKÜÙ]Ù[XÝY
Ý\œ™[	É×
NÜÙ]Y\ÜØYÙW
	É×
KÊNÃBŸJNÃBƒB\Ý
™šXÚH0êXÛšXØHH™\ÛÛpéðèÛÈHØÛÜœ°ê›˜ÚXH[[˜ÚX[H\ÝYÜÈÜ°ë]XÛÜÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
šXÚUXÛšXØK×Ù\œ›Üˆ	‰ˆ›ÛOH˜[\‹ÊNÃBˆ\ÜÙ\›X]Ú
šXÚSÜ\˜XÚ[Û˜[Ü›ÛOHœÝ]\Èˆ\šXK[]™OHœÛ]H‹ÊNÃBˆ\ÜÙ\›X]Ú
ØÛÜœ™[˜ÚX\Ñ[˜Ú[Û˜\š[ËÏ›Ü›HÛ\ÜÓ˜[YOHœÜXÙK^KLˆˆ\šXKX\ÞOWØ\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
ØÛÜœ™[˜ÚX\Ñ[˜Ú[Û˜\š[ËÜ›ÝÜÏWÌ×H™\]Z\™YZ[“[™ÝWÌLHX^[™ÝWÍLKÊNÃBŸJNÃBƒB\Ý
™šXÚH0êXÛšXØHYÛ›Ü˜H™\ÜÜÝ\È[YØ\ÈHÙXØYÙ[HH›ÙpéðèÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
šXÚUXÛšXØKØÛÛœÝ™\Ý[H]ØZ]XÚšXØ[ÚY]×™žZ[™ÓØY
Ù\šXÙRY
NÈYˆ
™\]Y\ÝOOHÙ[™\˜][Û—˜Ý\œ™[
HÙ]žZ[™×
™\Ý[
KÊNÃBˆ\ÜÙ\›X]Ú
šXÚUXÛšXØKØÛÛœÝ™\Ý[H]ØZ]XÚšXØ[ÚY]×œ›ÙXÝ[Û“ØY
Ù\šXÙRYÙXÝÜ—
NÈYˆ
™\]Y\ÝOOHÙ[™\˜][Û—˜Ý\œ™[
HÙ]›ÙXÝ[Û—
™\Ý[
KÊNÃBŸJNÃBƒB\Ý
˜Ø\0èÛÈH\™Y˜HÚ[˜[^˜H]X[^˜péðèÛÈÛÛ˜ÛÜœ™[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÏ›Ü›HÛ\ÜÓ˜[YOH™ÜšYØ\LÈÛN™ÜšYXÛÛËLˆˆ\šXKX\ÞOWØ\ÞWKÊNÃBŸJNÃBƒB\Ý
˜Ø\0èÛÈH\™Y˜H[™›Ü›XHÈ\ÝYÈÈØ[˜[Y[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËØ\šXK[X™[WØ\ÞWÉÔØ[˜[™È\™Y˜IÎ™\WÉÐ]X[^˜\ˆ\™Y˜IÎ‰ÔÙ[H[\˜péðíY\É×KÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\Ë×Ø\ÞH	‰ˆ›ÛOHœÝ]\Èˆ\šXK[]™OHœÛ]HˆÛ\ÜÓ˜[YOH^\ÛH^XÞX[‹MÌÛN˜ÛÛ\Ü[‹Lˆ”Ø[˜[™È\™Y˜x )Ü—KÊNÃBŸJNÃBƒB\Ý
˜Ø\0èÛÈH\™Y˜H[\H\œ›È[ÈY]\ˆ‹

HOˆÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËØÛÛœÝÛX\‘\œ›ÜW

OOœÙ]\œ›Ü—
	É×
KÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÜÙ]Ý]\×
]™[\™Ù]˜[YH\È\ÚÔÝ]\×
NØÛX\‘\œ›Ü—

KÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÜÙ]›ÙÜ™\Ü×
]™[\™Ù]˜[YOOOIÉ×Ó˜SŽ“[X™\—
]™[\™Ù]˜[YW
W
NØÛX\‘\œ›Ü—

KÊNÃBŸJNÃBƒB\Ý
››ÝYšXØpéðíY\ÈÚ[˜[^˜[HZ]\˜HH›Ü]YZX[HX™\\˜HÛÛ˜ÛÜœ™[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËØ\šXKX\ÞOWÛØY[™ÈHX\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËÙ\ØX›YWÈHX\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[Ë×Ø\ÞH	‰ˆ›ÛOHœÝ]\Èˆ\šXK[]™OHœÛ]H”Ø[˜[™ÈZ]\˜HH›ÝYšXØpéðèÛø )Ü—KÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËÜÙ]Y\ÜØYÙW
	Ó›ÝYšXØpéðèÛÈX\˜ØYHÛÛ[ÈYW‰×
KÊNÃBŸJNÃBƒB\Ý
››ÝYšXØpéðíY\È^0íY[HÈ\ÝYÈHZ]\˜HÙ[X[XØ[Y[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËØ\šXK[X™[WØ	Ú][W›YWÙ[WÉÓ›ÝYšXØpéðèÛÈYIÎ‰Ó›ÝYšXØpéðèÛÈ°èÛÈYI×KÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËØ\šXK[X™[WØX\˜Ø\ˆÛÛ[ÈYNˆ	Û›ÝYšXØ][Û“X™[×Ú][W™]™[×W	Ð]X[^˜péðèÛÈHÜ\˜péðèÛÉ×XKÊNÃBŸJNÃBƒB\Ý
››ÝYšXØpéðíY\È[™›Ü›X[H]X[^˜péðèÛÈ›È›Ý0èÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËØ\šXK[X™[WÛØY[™ÈHX\ÞWÉÐYÝX\™HH]X[^˜péðèÛÈ\È›ÝYšXØpéðíY\ÉÎ‰Ð]X[^˜\ˆ›ÝYšXØpéðíY\É×KÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[Ë×ÛØY[™ÈHX\ÞWÉÐYÝX\™x )‰Î‰Ð]X[^˜\ˆ›ÝYšXØpéðíY\É×KÊNÃBŸJNÃBƒB\Ý
››ÝYšXØpéðíY\È\ÝXØ[HØYH][H°èÛÈYÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËÈZ][W›YWÙ[I‰Ü[ˆÛ\ÜÓ˜[YOHœÚš[šËL›Ý[™YY[™ËXÞX[‹LLÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËÏ“°èÛÈYOÜÜ[‹ÊNÃBŸJNÃBƒB\Ý
™šXÚ\È›Ü]YZX[HX™\\˜HHYÚ[˜péðèÛÈ\˜[HÚ[˜Ü›Ûš^˜péðèÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
šXÚ\Ñ[˜Ú[Û˜\š[ËÙ\ØX›YWÛØY[™×HÛÛXÚÏW×

HO‹ÊNÃBˆ\ÜÙ\›X]Ú
šXÚ\Ñ[˜Ú[Û˜\š[ËÙ\ØX›YWÛØY[™ÈYÙHOOHKÊNÃBˆ\ÜÙ\›X]Ú
šXÚ\Ñ[˜Ú[Û˜\š[ËÙ\ØX›YWÛØY[™È[\Ý[WÛXZ\×KÊNÃBŸJNÃBƒB\Ý
œ\Ü]Z\ØHHšXÚ\È°èÛÈÜšXH›Ý˜HØ\™ØH\˜[HÚ[˜Ü›Ûš^˜péðèÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
šXÚ\Ñ[˜Ú[Û˜\š[ËØ\šXKX\ÞOWÛØY[™×HÛ”ÝX›Z]WÙ]™[OˆÈ]™[œ™]™[Y˜][

NÈYˆ
ØY[™×
H™]\›ŽËÊNÃBˆ\ÜÙ\›X]Ú
šXÚ\Ñ[˜Ú[Û˜\š[ËÙ\ØX›YWÛØY[™×H˜[YOWÜÙX\˜ÚKÊNÃBŸJNÃBƒB\Ý
›Ü\˜péðíY\ÈH›ÙpéðèÛÈHÙXØYÙ[HÚ[˜[^˜[HÈ›Ü›][0è\š[È[H[™[Y[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
™YÚ\Ý›Ô›ÙXØ[ËÏ›Ü›HÛ\ÜÓ˜[YOH™ÜšYØ\LÈ›Ü™\‹]›Ü™\‹\Û]KLLLÈÛN™ÜšYXÛÛËLˆˆ\šXKX\ÞOWØ\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KÏ›Ü›HÛ\ÜÓ˜[YOH™›^›^]Ü˜\][\ËY[™Ø\LÈ›Ü™\‹]›Ü™\‹\Û]KLLLÈˆ\šXKX\ÞOWØ\ÞWKÊNÃBŸJNÃBƒB\Ý
˜péðíY\ÈH^XÝpéðèÛÈHšXÚH[™›Ü›X[HØ[˜[Y[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
šXÚSÜ\˜XÚ[Û˜[ÜØ]š[™×ÉÔØ[˜[™ø )‰ËÊNÃBˆ\ÜÙ\›X]Ú
šXÚUXÛšXØKÜØ]š[™È	‰ˆ›ÛOHœÝ]\Èˆ\šXK[]™OHœÛ]H”Ø[˜[™È[\˜péðíY\ÈHšXÚH0êXÛšXØx )Ü‹ÊNÃBˆ\ÜÙ\›X]Ú
šXÚUXÛšXØKÏÜ[ˆ›ÛOHœÝ]\Èˆ\šXK[]™OHœÛ]HˆÛ\ÜÓ˜[YOH›Z[‹]ËLœ™XZË]ÛÜ™È^\ÛH›Û[YY][H”Ú]XpéðèÛÎ‹ÊNÃBŸJNÃBƒB\Ý
™šXÚH0êXÛšXØH[\H\œ›ÜÈ[ÈY]\ˆ[HØ[\È‹

HOˆÃBˆ\ÜÙ\›X]Ú
™XYÜ[Û˜[
‹‹‹ÜÜ˜ËÛ[Ù[\ËÝÛÜšÙ›Ü˜ÙKØÛÛ\Û™[ËÕXÚšXØ[ÚY]›Ü›KÞŠKÜÙ]Y\ÜØYÙW
	É×
N×ÊœÙ]\ÜÝY\×
×W
N×Ê˜Ú[™ÙKÊNÃBŸJNÃBƒB\Ý
œÙ\špéÛÈHšXÚ\È˜[YHÚXÚÛ\ÝHYÜÈH™\ÜÜÝH‹

HOˆÃBˆ\ÜÙ\›X]Ú
XÚšXØ[ÚY]Ù\šXÙKÚ\Õ[š\]YRÙ^\×
ÚXÚÛ\Ý][\×
H	‰—ÊÈH\›Ý×˜ÚXÚÛ\ÝÊNÃBˆ\ÜÙ\™Ù\Ó›ÝX]Ú
XÚšXØ[ÚY]Ù\šXÙKÚ\Õ[š\]YRÙ^\×
ÚXÚÛ\Ý][\×
N×ÊÈH\›Ý×˜ÚXÚÛ\ÝÊNÃBŸJNÃBƒB\Ý
œÙ\špéÛÈHšXÚ\È™Z™Z]H[Y\Ý[\È[°è[YÜÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
XÚšXØ[ÚY]Ù\šXÙKÚ\Ñ]SÜ“[
›Ý×š[šXÚXYWÙ[W
H	‰ˆ\Ñ]SÜ“[
›Ý×˜ÛÛ˜ÛZYWÙ[W
KÊNÃBˆ\ÜÙ\›X]Ú
XÚšXØ[ÚY]Ù\šXÙKÓ[X™\—š\Ñš[š]W
™]È]W
™XÛÜ™˜ÜšXY×Ù[W
W™Ù][YW

W
KÊNÃBŸJNÃBƒB\Ý
œ™YÚ\Ý›ÈHÙXØYÙ[H˜[YH]\È™]Ü›˜Y\È‹

HOˆÃBˆ\ÜÙ\›X]Ú
XÚšXØ[ÚY]Ù\šXÙKÈZ\Ñ]SÜ“[
™\Ý[œ™]š\ÝWØ]W
KÊNÃBˆ\ÜÙ\›X]Ú
XÚšXØ[ÚY]Ù\šXÙKÈZ\Ñ]SÜ“[
™\Ý[œÙ\šYÜ—ØYÛÜ˜W
KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KÙ]U[YOWÜØY™TÙ\™\‘]U[YW
Ý]W×š[šXÚXYWÙ[H×È[
WKÊNÃBŸJNÃBƒB\Ý
›X™\˜péðèÛÈHšXÚH›Ü]YZXH\ÈÛ\]YH‹

HOˆÃBˆ\ÜÙ\›X]Ú
šXÚSÜ\˜XÚ[Û˜[Ù\ØX›YWÛØY[™×KÊNÃBˆ\ÜÙ\›X]Ú
šXÚSÜ\˜XÚ[Û˜[ÚYˆ
]]][Û—˜Ý\œ™[
H™]\›ŽËÊNÃBˆ\ÜÙ\›X]Ú
šXÚSÜ\˜XÚ[Û˜[ÛØY[™ÈÈ	ÓX™\˜[™ø )‰Èˆ	ÓX™\˜\ˆšXÚH\ÝHÙ]Ü‰ËÊNÃBŸJNÃBƒB\Ý
˜YÙ[™HYÛ›Ü˜H™\ÜÜÝ\ÈH™\]Z\ÚpéðíY\È[YØ\È‹

HOˆÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËØÛÛœÝÙ[™\˜][Û]\ÙT™Y—

KÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÚY—
™\]Y\ÝOOYÙ[™\˜][Û—˜Ý\œ™[
\Ù]][\ËÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÜ™]\›—

OO—ÙÙ[™\˜][Û—˜Ý\œ™[
×
Î×KÊNÃBŸJNÃBƒB\Ý
˜YÙ[™H[\H]]šYY\È[\š[Ü™\È[\ÈH›Ý˜HÛÛœÝ[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÝ\ÙQY™™XÝ


OO—ÜÙ]][\×
×W
NÜÙ]\]Y]
[
N×KÜÝ\[™ÛÛ^×™[˜Ú[Û˜\š[×šYÛÛ^×™[˜Ú[Û˜\š[×™\œØ[×W
KÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÜÙ]ØY[™×
YW
NÜÙ]\œ›Ü—
	É×
NÝžKÊNÃBŸJNÃBƒB\Ý
˜YÙ[™H™\Ù\˜H]™[ÜÈ\˜[H›Ý˜HÚ[˜Ü›Ûš^˜péðèÛÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÚ][\×›[™ÝÉÐ]X[^˜[™ÈYÙ[™x )‰Î‰ÐØ\œ™YØ[™ÈYÙ[™x )‰ËÊNÃBŸJNÃBƒB\Ý
˜YÙ[™HÙ™\™XÙH][ÜÈH\°ë[ÙÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÙ[˜Ý[ÛˆÙ]™\Ù]
^\Î›[X™\—
KÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËØ\šXK[X™[H][ÜÈH\°ë[ÙÈ‹ÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÔ°ìÞ[[ÜÈÈX\ËÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÔ°ìÞ[[ÜÈÌX\ËÊNÃBŸJNÃBƒB\Ý
˜YÙ[™H[™›Ü›XHH]X[YYHH]]šYY\ÈÈ\°ë[ÙÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÚ][\×›[™ÝOOLWÉØ]]šYYH[˜ÛÛ˜YIÎ‰Ø]]šYY\È[˜ÛÛ˜Y\ÉËÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÛ›È\°ë[Ù×Ü‹ÊNÃBŸJNÃBƒB\Ý
˜YÙ[™HX\˜ØHÈ][ÈH\°ë[ÙÈÙ[XÚ[Û˜YÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËØÛÛœÝ™\Ù]XÝ]™OW
^\Î›[X™\—
OO‹ÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËØ\šXK\™\ÜÙYWÜ™\Ù]XÝ]™W
×
WKÊNÃBŸJNÃBƒB\Ý
˜YÙ[™H[\H]]šYY\È]X[™ÈÈ\°ë[ÙÈ0êH[°è[YÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÚY—
\Ý\Y[™
WÜÙ]][\×
×W
NÜÙ]\œ›Ü‹ÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÚY—
[™Ý\
WÜÙ]][\×
×W
NÜÙ]\œ›Ü‹ÊNÃBŸJNÃBƒB\Ý
˜[™^ÜÈ›Ü]YZX[HÙ\˜péðèÛÈÚ[][0è›™XHH[šÜÈ[\Ü°è\š[ÜÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
[™^ÜËÛ[šÐ\ÞKÊNÃBˆ\ÜÙ\›X]Ú
[™^ÜËÙ\ØX›YWØ\ÞHH[[šÐ\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
[™^ÜËÚ][P\ÞWÉÑÙ\˜[™ø )‰ËÊNÃBŸJNÃBƒB\Ý
˜[™^ÜÈ›Ü]YZX[H[š[È[œ]X[ÈÈ[šÈ[\Ü°è\š[È0êHÙ\˜YÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
[™^ÜËÚY—
ØÚ×˜Ý\œ™[H[[šÐ\ÞHYš[W
\™]\›‹ÊNÃBˆ\ÜÙ\›X]Ú
[™^ÜËÙ\ØX›YWØ\ÞHH[[šÐ\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
[™^ÜËÙ\ØX›YWØ\ÞHH[[šÐ\ÞHYš[WKÊNÃBŸJNÃBƒB\Ý
˜[™^ÜÈÜšY[[H›Ü›X]ÜÈH[X[šÈÈ\œ]Z]›È‹

HOˆÃBˆ\ÜÙ\›X]Ú
[™^ÜËØ\šXKY\ØÜšX™YžOWØ	ÚYKZ[KÊNÃBˆ\ÜÙ\›X]Ú
[™^ÜËÑ›Ü›X]ÜÈXÙZ]ÜÎˆ”QË‘ËÙX”ÝH—ˆ[X[šÈpè^[[ÎˆLP—‹ÊNÃBŸJNÃBƒB\Ý
š[˜›ÞH\ÝÜ]YHYÛ›Ü˜H™\ÜÜÝ\ÈHš[›ÜÈ[YÛÜÈ‹

HOˆÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËØÛÛœÝÙ[™\˜][Û]\ÙT™Y—

KÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÚY—
™\]Y\ÝOOYÙ[™\˜][Û—˜Ý\œ™[
\Ù]][\ËÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÜ™]\›—

OO—ÙÙ[™\˜][Û—˜Ý\œ™[
×
Î×KÊNÃBŸJNÃBƒB\Ý
š[˜›ÞH\ÝÜ]YH™\Ù\˜HYÜÈ\˜[H›Ý˜HÛÛœÝ[H‹

HOˆÃBˆ\ÜÙ\™Ù\Ó›ÝX]Ú
[˜›ÞX]\šXZ\ËÜÙ]ØY[™×
YW
NÜÙ]\œ›Ü—
	É×
NÚY—
ÛX\“Y\ÜØYÙW
\Ù]Y\ÜØYÙW
	É×
NÜÙ]][\×
×W
KÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÚ][\×›[™ÝÉÐ]X[^˜[™ÈÛÛXÚ]péðíY\ø )‰Î‰ÐØ\œ™YØ[™ÈÛÛXÚ]péðíY\ø )‰ËÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÝ\ÙQY™™XÝ


OO—ÜÙ]][\×
×W
NÜÙ]\]Y]
[
N×KÜÝ]\Ë[ÝÙYÊNÃBŸJNÃBƒB\Ý
š[˜›Þ™\Ù\˜H™YY˜XÚÈ\0ìÜÈpéðèÛÈÛÛ˜ÛpëYH‹

HOˆÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËØ\Þ[˜È[˜Ý[ÛˆØY
ÛX\“Y\ÜØYÙO]YW
KÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÜÙ]Y\ÜØYÙW
	ÔÛÛXÚ]péðèÛÈ\›Ý˜YW‰×
NØ]ØZ]ØY
˜[ÙW
KÊNÃBŸJNÃBƒB\Ý
™šXÚH0êXÛšXØHY™\™[˜ÚXH\œ›ÈHÝXÙ\ÜÛÈ˜HY[œØYÙ[HXÙ\Üðë]™[‹

HOˆÃBˆÛÛœÝ›Ü›][\š[ÕXÛšXÛÈH™XYÜ[Û˜[
‹‹‹ÜÜ˜ËÛ[Ù[\ËÝÛÜšÙ›Ü˜ÙKØÛÛ\Û™[ËÕXÚšXØ[ÚY]›Ü›KÞŠNÃBˆ\ÜÙ\›X]Ú
›Ü›][\š[ÕXÛšXÛËÜ›ÛOWÛY\ÜØYÙWœÝ\ÕÚ]
	Ó°èÛÈ›ÚI×
HY\ÜØYÙWœÝ\ÕÚ]
	Ô™]š\ÙI×
HÈ	Ø[\	Èˆ	ÜÝ]\É×KÊNÃBŸJNÃBƒB\Ý
™›Ü›][0è\š[ÈHØÛÜœ°ê›˜ÚXHÚ[˜[^˜HÈ[š[È[H[™[Y[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
ØÛÜœ™[˜ÚX\Ñ[˜Ú[Û˜\š[ËÏ›Ü›HÛ\ÜÓ˜[YOH™ÜšYØ\LÈÛN™ÜšYXÛÛËLˆˆ\šXKX\ÞOWØ\ÞWKÊNÃBŸJNÃBƒB\Ý
š\Ý0ìÜšXÛÈ›Ü]YZXHYÚ[˜péðèÛÈ\˜[HØ\œ™YØ[Y[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
\ÝÜšXÛÑ[˜Ú[Û˜\š[ËÙ\ØX›YWÛØY[™ÈYÙOOOLKÊNÃBˆ\ÜÙ\›X]Ú
\ÝÜšXÛÑ[˜Ú[Û˜\š[ËÙ\ØX›YWÛØY[™ÈY]W[WÛXZ\×KÊNÃBŸJNÃBƒB\Ý
\™Y˜\È›Ü]YZX[HYÚ[˜péðèÛÈ\˜[HØ\œ™YØ[Y[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÙ\ØX›YWÛØY[™ÈYÙOOOLKÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÙ\ØX›YWÛØY[™ÈY]W[WÛXZ\×KÊNÃBŸJNÃBƒB\Ý
\™Y˜\È[™›Ü›X[H]X[^˜péðèÛÈ›È›Ý0èÛÈ\˜[HØ\œ™YØ[Y[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËØ\šXK[X™[WÛØY[™×ÉÐ]X[^˜[™È\™Y˜\ÉÎ‰Ð]X[^˜\ˆ\™Y˜\É×KÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\Ë×ÛØY[™×ÉÐ]X[^˜[™ø )‰Î‰Ð]X[^˜\ˆ\™Y˜\É×KÊNÃBŸJNÃBƒB\Ý
\™Y˜\È^X™[H[H0î›šXÛÈ›ØÛÈHØ\œ™YØ[Y[ÈH\œ›È‹

HOˆÃBˆ\ÜÙ\™\]X[

Z[š\Õ\™Y˜\Ë›X]Ú
ÐØ\œ™YØ[™È\™Y˜\ø )‹ÙÊH×JK›[™ÝJNÃBˆ\ÜÙ\™\]X[

Z[š\Õ\™Y˜\Ë›X]Ú
Ü›ÛOW˜[\ˆÛ\ÜÓ˜[YOW™›^›^]Ü˜\][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆØ\LÈ›Ý[™Y[È™Ë\›ÜÙKMLÙÊH×JK›[™ÝJNÃBŸJNÃBƒB\Ý
˜ØX™péØ[ÜÈÈ[˜Ú[Û°è\š[ÈXÛÛ[Ù[H0ë][ÜÈH]X[^˜péðèÛÈ›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËÏ]ˆÛ\ÜÓ˜[YOH›Z[‹]ËLˆYHÛÜšË[›ÝYšXØ][ÛœË]]HˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^[È›ÛX›Û‹ÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËL‹ÊNÃBˆ\ÜÙ\›X]Ú
\ÝÜšXÛÑ[˜Ú[Û˜\š[ËÏ]ˆÛ\ÜÓ˜[YOH›Z[‹]ËLˆYH˜XÝ]š]KZ\ÝÜžK]]HˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^[È›ÛX›Û‹ÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÏˆYH›^K]\ÚÜË]]HˆÛ\ÜÓ˜[YOH›Z[‹]ËLœ™XZË]ÛÜ™È^[È›ÛX›Û‹ÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËØÛ\ÜÓ˜[YOHœÚš[šËL^^È^\Û]KML‹ÊNÃBˆ\ÜÙ\›X]Ú
šXÚ\Ñ[˜Ú[Û˜\š[ËÏ]ˆÛ\ÜÓ˜[YOH›Z[‹]ËLˆYHœÙ\šXÙK\ÚY]Ë]]HˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^[È›ÛX›Û‹ÊNÃBŸJNÃBƒB\Ý
˜ØX™péØ[ÈH\™š[ÈZ[™[]YXœ˜[HYÜÈÛ™ÛÜÈ›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
Y]TÙ]Ü‹Ï]ˆÛ\ÜÓ˜[YOH›Z[‹]ËL—ÊÛ\ÜÓ˜[YOH^^È›Û\Ù[ZX›Û\\˜Ø\ÙKÊNÃBˆ\ÜÙ\›X]Ú
Y]TÙ]Ü‹ÏHÛ\ÜÓ˜[YOH›]Lˆœ™XZË]ÛÜ™È^LÞ›ÛX›ÛÊNÃBˆ\ÜÙ\›X]Ú
Y]TÙ]Ü‹ØÛ\ÜÓ˜[YOH™›^Úš[šËL›^XÛÛ][\ËY[™Ø\Lˆ‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]TÙ]Ü‹ÏÛ\ÜÓ˜[YOH›]LHœ™XZË]ÛÜ™È›Û\Ù[ZX›Û^\Û]KNL—ØÛÛ^™[˜Ú[Û˜\š[×››ÛYKÊNÃBˆ\ÜÙ\›X]Ú
Y]TÙ]Ü‹ÏÛ\ÜÓ˜[YOH›]LHœ™XZË]ÛÜ™È^\Û]KNL—ØÛÛ^™[˜Ú[Û˜\š[×˜Ø\™ÛËÊNÃBˆ\ÜÙ\›X]Ú
Y]TÙ]Ü‹Ï]ˆÛ\ÜÓ˜[YOH›Z[‹]ËLˆYHœÙXÝÜ‹\›Ú™XÝË]]HˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^[È›ÛX›Û‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]TÙ]Ü‹ØÛ\ÜÓ˜[YOHœÚš[šËL›Ý[™YY[™Ë\Û]KLLÊNÃBŸJNÃBƒB\Ý
š[˜›ÞHX]\šXZ\È™\Ù\˜H\œ›ÈH™]žH[H[\È\Ý™Z]\È‹

HOˆÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËÏÜ[ˆÛ\ÜÓ˜[YOH›Z[‹]ËLœ™XZË]ÛÜ™È—Ù\œ›Ü—OÜÜ[‹ÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\šXK[X™[H•[\ˆØ\œ™YØ\ˆ\ÈÛÛXÚ]péðíY\È›Ý˜[Y[Hˆ\ØX›YWÛØY[™ÈHXXÝ[Û\ÞWKÊNÃBˆ\ÜÙ\›X]Ú
[˜›ÞX]\šXZ\ËØÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^\ÛH^Y[Y\˜[MÌ‹ÊNÃBŸJNÃBƒB\Ý
™šXÚ\ÈHÙ\špéÛÈ™\Ù\˜[H\ØØHHpéðèÛÈHX™\\˜H›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
šXÚ\Ñ[˜Ú[Û˜\š[ËÏ]ÛˆÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\OHœÝX›Z]ˆ\ØX›YWÛØY[™×KÊNÃBˆ\ÜÙ\›X]Ú
šXÚ\Ñ[˜Ú[Û˜\š[ËØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\ØX›YWÛØY[™×HÛÛXÚÏW×

HOˆÈÙ]ÙX\˜ÚÊNÃBˆ\ÜÙ\›X]Ú
šXÚ\Ñ[˜Ú[Û˜\š[ËÏ]Ûˆ\OH˜]ÛˆˆÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\ØX›YWÛØY[™×HÛÛXÚÏWÙ]™[O‹ÊNÃBŸJNÃBƒB\Ý
™Y]ÜˆHXÙ\ÜÛÈ]YXœ˜HÙ]Ü™\ÈH\›Z\ÜðíY\ÈÛ™Ø\È›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËØÛ\ÜÓ˜[YOH™›^Z[‹]ËL][\Ë\Ý\Ø\Lˆ^\ÛH[œ]\OH˜ÚXÚØ›Þ‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÏÜ[ˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È—ÛX™[OÜÜ[‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÏÝ[[X\žHÛ\ÜÓ˜[YOH˜Ý\œÛÜ‹\Ú[\ˆœ™XZË]ÛÜ™È›Û\Ù[ZX›Û‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÏÜ[ˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È—Ü\›Z\ÜÚ[Û“X™[×Ø×›Ü\˜XØ[×W×›Ü\˜XØ[×OÜÜ[‹ÊNÃBˆ\ÜÙ\›X]Ú
Y]Ü‘[˜Ú[Û˜\š[ËÏÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^^È^\Û]KML’QHÛÛN‹ÊNÃBŸJNÃBƒB\Ý
\™Y˜\È™\Ù\˜[HÛÛ›Û\ÈHš[›ÈHYÚ[˜péðèÛÈ›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\ØX›YWÛØY[™×HÛÛXÚÏW×

OO—ÜÙ]š[\‹ÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLÛNÚ]\ÜXÙK[›ÝÜ˜\‹ÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÏ]Ûˆ\OH˜]ÛˆˆÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\šXK[X™[H’\ˆ\˜HH0èYÚ[˜H[\š[ÜˆH\™Y˜\È‹ÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÏÜ[ˆÛ\ÜÓ˜[YOHœÚš[šËL^\ÛHˆ\šXKXÝ\œ™[HœYÙH‹ÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËØ\šXK[X™[H’\ˆ\˜HH°ìÞ[XH0èYÚ[˜HH\™Y˜\Èˆ\ØX›YWÛØY[™ÈY]W[WÛXZ\×KÊNÃBŸJNÃBƒB\Ý
››ÝYšXØpéðíY\È™\Ù\˜[HpéðíY\ÈHYÚ[˜péðèÛÈ›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËÏ]Ûˆ\OH˜]ÛˆˆÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\ØX›YWÈHX\ÞWH\šXK[X™[WÚ][W\™Y˜WÚYËÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËØ\šXK[X™[WØX\˜Ø\ˆÛÛ[ÈYNˆŠØHÛÛXÚÏWØ\Þ[˜ËÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËÏÜ[ˆÛ\ÜÓ˜[YOHœÚš[šËL^\ÛHˆ\šXKXÝ\œ™[HœYÙH‹ÊNÃBˆ\ÜÙ\›X]Ú
›ÝYšXØXÛÙ\Ñ[˜Ú[Û˜\š[ËØ\šXK[X™[H’\ˆ\˜HH°ìÞ[XH0èYÚ[˜Hˆ\ØX›YWÈY]W[WÛXZ\ÈHX\ÞWKÊNÃBŸJNÃBƒB\Ý
›ØÛÜœ°ê›˜ÚX\È™\Ù\˜[HÛÛ][šXØpéðèÛË™\ÛÛpéðèÛÈHYÚ[˜péðèÛÈ›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
ØÛÜœ™[˜ÚX\ËÏ]Ûˆ\OHœÝX›Z]ˆÛ\ÜÓ˜[YOH˜‹\š[X\žHÚš[šËLˆ\šXK[X™[WØ\ÞWÉÔ™YÚ\Ý˜[™ÈØÛÜœ°ê›˜ÚXIÎ‰ÐÛÛ][šXØ\ˆØÛÜœ°ê›˜ÚXI×KÊNÃBˆ\ÜÙ\›X]Ú
ØÛÜœ™[˜ÚX\ËÏ]Ûˆ\OHœÝX›Z]ˆÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\šXK[X™[WØ\ÞWÉÔØ[˜[™È™\ÛÛpéðèÛÈHØÛÜœ°ê›˜ÚXIËÊNÃBˆ\ÜÙ\›X]Ú
ØÛÜœ™[˜ÚX\ËÏ]Ûˆ\OH˜]ÛˆˆÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\šXK[X™[H’\ˆ\˜HH0èYÚ[˜H[\š[ÜˆHØÛÜœ°ê›˜ÚX\È‹ÊNÃBˆ\ÜÙ\›X]Ú
ØÛÜœ™[˜ÚX\ËÏÜ[ˆÛ\ÜÓ˜[YOHœÙ[‹XÙ[\ˆÚš[šËL^\ÛHˆ\šXKXÝ\œ™[HœYÙH‹ÊNÃBˆ\ÜÙ\›X]Ú
ØÛÜœ™[˜ÚX\ËØ\šXK[X™[WÛØY[™È\ÞWÉÐYÝX\™HH]X[^˜péðèÛÈ\ÈØÛÜœ°ê›˜ÚX\ÉÎ‰Ð]X[^˜\ˆØÛÜœ°ê›˜ÚX\É×KÊNÃBŸJNÃBƒB\Ý
œÛÛXÚ]péðíY\ÈHX]\šXZ\ÈXÛÛ[Ù[HØX™péØ[ÈHpéðíY\È›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[Ï]ˆÛ\ÜÓ˜[YOH›Z[‹]ËLYWØ	ÙšY[™Yš^K]]XHÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È›Û\Ù[ZX›Û‹ÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[ÏÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^\ÛH^\Û]KML”péØHX]\šXZ\È\˜H\ÝHÜ™[KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[ØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆÛÛXÚÏWÜ™Yœ™\Ú™\]Y\Ý×KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[ÏÜ[ˆÛ\ÜÓ˜[YOH™›^Úš[šËL›^]Ü˜\][\ËXÙ[\ˆ\ÝYžKY[™Ø\Lˆ‹ÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[ØÛ\ÜÓ˜[YOHœÚš[šËL›Ý[™YY[™Ë]Ú]HLˆKLH^^È‹ÊNÃBˆ\ÜÙ\›X]Ú
ÛÛXÚ]XØ[ÓX]\šX[ØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\šXK[X™[WØØ[˜Ù[\ˆÛÛXÚ]péðèÛËÊNÃBŸJNÃBƒB\Ý
œ™YÚ\Ý›ÜÈH›ÙpéðèÛÈ]YXœ˜[HØœÙ\˜péðíY\ÈÙ[H\ÛØØ\ˆÈÜ°è\š[È‹

HOˆÃBˆ\ÜÙ\›X]Ú
™YÚ\Ý›Ô›ÙXØ[ËÏÜ[ˆÛ\ÜÓ˜[YOH›Z[‹]ËLœ™XZË]ÛÜ™ÈÝ›Û™Ï—Ù›Ü›X]\W
][W\×
WKÊNÃBˆ\ÜÙ\›X]Ú
™YÚ\Ý›Ô›ÙXØ[ËÏ[YHÛ\ÜÓ˜[YOHœÚš[šËL^^È^\Û]KMLˆ]U[YOWÜØY™Q[žQ]U[YW
][W˜ÜšXY×Ù[W
WKÊNÃBŸJNÃBƒB\Ý
™šXÚH0êXÛšXØH]YXœ˜HHÚ]XpéðèÛÈÙ[H\™\ˆ\ÈpéðíY\È‹

HOˆÃBˆ\ÜÙ\›X]Ú
šXÚUXÛšXØKÏÜ[ˆ›ÛOHœÝ]\Èˆ\šXK[]™OHœÛ]HˆÛ\ÜÓ˜[YOH›Z[‹]ËLœ™XZË]ÛÜ™È^\ÛH›Û[YY][H”Ú]XpéðèÛÎ‹ÊNÃBˆ\ÜÙ\›X]Ú
šXÚUXÛšXØKÏ]ˆÛ\ÜÓ˜[YOH™›^›^]Ü˜\][\ËXÙ[\ˆØ\LÈ›Ý[™Y^™Ë\Û]KMLLÈ‹ÊNÃBŸJNÃBƒB\Ý
™\œ›ÈH™\ÜÛœðè]™Z\ÈÜ™Ø[š^˜H™]žH›È[Øš[H‹

HOˆÃBˆÛÛœÝ\ÜÚYÛ›Y[H™XYÜ[Û˜[
‹‹‹ÜÜ˜ËÛ[Ù[\ËÝÛÜšÙ›Ü˜ÙKØÛÛ\Û™[ËÔÚY]\ÜÚYÛ›Y[Y]Ü‹ÞŠNÃBˆ\ÜÙ\›X]Ú
\ÜÚYÛ›Y[Ï]ˆ›ÛOH˜[\ˆÛ\ÜÓ˜[YOH™›^›^]Ü˜\][\Ë\Ý\\ÝYžKX™]ÙY[ˆØ\Lˆ^\ÛH^\™YMÌÛ\ÜÓ˜[YOH›Z[‹]ËLœ™XZË]ÛÜ™È—Ù\œ›Ü—OÜ‹ÊNÃBˆ\ÜÙ\›X]Ú
\ÜÚYÛ›Y[ØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\šXK[X™[H•[\ˆØ\œ™YØ\ˆÜÈ™\ÜÛœðè]™Z\È›Ý˜[Y[H‹ÊNÃBŸJNÃBƒB\Ý
˜ÛÛ›ÛHHÙXØYÙ[H›ÝYÙHÝ]\ÈH]X[^˜péðèÛÈ›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KÏ]ˆÛ\ÜÓ˜[YOH›Z[‹]ËL—ÊYWØ	ÚYK]]XKÊNÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KØÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^\ÛH^\Û]KML‹ÊNÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KØÛ\ÜÓ˜[YOWØÚš[šËL›Ý[™YY[LˆKLH^^È›Û[YY][KÊNÃBˆ\ÜÙ\›X]Ú
ÛÛ›ÛTÙXØYÙ[KØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆÛÛXÚÏWÜ™Yœ™\ÚžZ[™×KÊNÃBŸJNÃBƒB\Ý
˜YÙ[™HXÛÛ[ÙH0ë][ÈH]X[^˜péðèÛÈ[H[\È\Ý™Z]\È‹

HOˆÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÏ]ˆÛ\ÜÓ˜[YOH›Z[‹]ËLˆYHÛÜšËXYÙ[™K]]HˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^[È›ÛX›Û‹ÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËÏÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^\ÛH^\Û]KML”˜^›ÜÈ\È\™Y˜\È]šXpëY\ÈH›Øðê‹ÊNÃBˆ\ÜÙ\›X]Ú
YÙ[™Q[˜Ú[Û˜\š[ËØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\ØX›YWÛØY[™×HÛÛXÚÏW×

OO›ÚYØY

WKÊNÃBŸJNÃBƒB\Ý
œ™\Ý[[ÈÜ\˜XÚ[Û˜[›ÝYÙH[™XØYÜ™\ÈÛ™ÛÜÈ›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
™\Ý[[Ñ[˜Ú[Û˜\š[ËÏ]ˆÛ\ÜÓ˜[YOH›Z[‹]ËLˆYHœ\œÛÛ˜[]ÛÜšË\Ý[[X\žK]]HˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^[È›ÛX›Û‹ÊNÃBˆ\ÜÙ\›X]Ú
™\Ý[[Ñ[˜Ú[Û˜\š[ËØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\ØX›YWÛØY[™×HÛÛXÚÏW×

OOœÙ]™]žW
O›—
ÌW
WKÊNÃBˆ\ÜÙ\›X]Ú
™\Ý[[Ñ[˜Ú[Û˜\š[ËØÛ\ÜÓ˜[YOWØØ\™Z[‹]ËL›Ü™\ˆMÊNÃBˆ\ÜÙ\›X]Ú
™\Ý[[Ñ[˜Ú[Û˜\š[ËÏÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È^\ÛH^\Û]KMŒ—ÛX™[OÜ‹ÊNÃBˆ\ÜÙ\›X]Ú
™\Ý[[Ñ[˜Ú[Û˜\š[ËØÛ\ÜÓ˜[YOH›]LˆÚ]\ÜXÙK[›ÝÜ˜\^Lž›ÛX›Û^\Û]KNL‹ÊNÃBŸJNÃBƒB\Ý
˜péðíY\ÈH[™^ÜÈ°èÛÈÛÛ\š[Y[HÈ›ÛYHÈ\œ]Z]›È›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
[™^ÜËÏ]ˆÛ\ÜÓ˜[YOH™›^Z[‹]ËL›^]Ü˜\Ø\Lˆ]Ûˆ\OH˜]ÛˆˆÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËL‹ÊNÃBˆ\ÜÙ\›X]Ú
[™^ÜËÏHÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\šXK[X™[WØXœš\‹ÊNÃBŸJNÃBƒB\Ý
™][HH\™Y˜HÜ™Ø[š^˜H0ë][Ë]X[^˜péðèÛÈH™XØ\™ØH›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
][U\™Y˜KÏ]ˆÛ\ÜÓ˜[YOH™›^›^]Ü˜\][\Ë\Ý\\ÝYžKX™]ÙY[ˆØ\LÈ]ˆÛ\ÜÓ˜[YOH›Z[‹]ËLÈYH\ÚËY]Z[Ë]]HˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È›Û\Ù[ZX›Û‹ÊNÃBˆ\ÜÙ\›X]Ú
][U\™Y˜KØÛ\ÜÓ˜[YOH˜‹\ÙXÛÛ™\žHÚš[šËLˆ\ØX›YWÛØY[™×KÊNÃBˆ\ÜÙ\›X]Ú
][U\™Y˜KÏÜ[ˆÛ\ÜÓ˜[YOH^^È^\Û]KMLˆ\šXK[]™OHœÛ]H‹ÊNÃBŸJNÃBƒB\Ý
˜XÙZ]HH[œÝ[péðèÛÈ]YXœ˜HÛÛ™š\›XpéðèÛÈÛ™ØH›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
XÙZ]R[œÝ[XØ[ËÏÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È›Û\Ù[ZX›Û”™YÚ\Ý˜\ˆXÙZ]HH[œÝ[péðèÛÏÚ‹ÊNÃBˆ\ÜÙ\›X]Ú
XÙZ]R[œÝ[XØ[ËØÛ\ÜÓ˜[YOH›]LHÚš[šËLˆ\OH˜ÚXÚØ›Þ‹ÊNÃBˆ\ÜÙ\›X]Ú
XÙZ]R[œÝ[XØ[ËÏÜ[ˆÛ\ÜÓ˜[YOH›Z[‹]ËLœ™XZË]ÛÜ™ÈÛÛ™š\›[È]YHÈÛY[KÊNÃBˆ\ÜÙ\›X]Ú
XÙZ]R[œÝ[XØ[ËØÛ\ÜÓ˜[YOH˜‹\š[X\žHÚš[šËLˆ\šXK[X™[KÊNÃBŸJNÃBƒB\Ý
˜Ø\0èÛÈH\™Y˜HX[0ê[H˜YÙ\ÈH˜^›ÈYðë]™Z\È›È[Øš[H‹

HOˆÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËØÛ\ÜÓ˜[YOWØÚš[šËL›Ý[™YY[L—HKLH^^È›Û\Ù[ZX›ÛÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÏÜ[ˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È—Ù›Ü›X]\ÚÔÙXÝÜ—
\Ú×œÙ]Ü—
WOÜÜ[‹ÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËØÛ\ÜÓ˜[YOWØÚš[šËL›Ý[™YY[LˆKLH›Û\Ù[ZX›ÛÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÏÜ[ˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È“ØœšYØ]0ìÜšXH\˜HÛÛ˜ÛZ\ˆH]\OÜÜ[‹ÊNÃBˆ\ÜÙ\›X]Ú
Z[š\Õ\™Y˜\ËÏÜ[ˆÛ\ÜÓ˜[YOH˜œ™XZË]ÛÜ™È”˜^›Îˆ[YKÊNÃBŸJNÃB