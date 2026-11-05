import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const nav = fs.readFileSync(
  new URL("../src/layouts/navigation.ts", import.meta.url),
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
const agendaFuncionario = readOptional("../src/modules/workforce/components/AgendaPanel.tsx");
const historicoFuncionario = readOptional("../src/modules/workforce/components/MyActivityHistory.tsx");
const detalheTarefa = readOptional("../src/modules/workforce/components/TaskDetails.tsx");
const fichaTecnica = readOptional("../src/modules/workforce/components/ServiceTechnicalSheet.tsx");
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

test("tarefas do funcionário permitem recuperar falhas de carregamento", () => {
  assert.match(minhasTarefas, /Tentar novamente/);
  assert.match(minhasTarefas, /aria-live="polite"/);
  assert.match(minhasTarefas, /setRefresh\(n=>n\+1\)/);
});

test("tarefas refletem imediatamente status e progresso selecionados", () => {
  assert.match(minhasTarefas, /displayedStatus=final\?task\.status:status/);
  assert.match(minhasTarefas, /displayedProgress=displayedStatus==='concluida'\?100:progress/);
});

test("tarefas informam a última atualização da lista", () => {
  assert.match(minhasTarefas, /updatedAt/);
  assert.match(minhasTarefas, /Última atualização às/);
  assert.match(minhasTarefas, /aria-busy=\{loading\}/);
});

test("tarefas não enviam atualização sem mudança", () => {
  assert.match(minhasTarefas, /const dirty=status!==task\.status/);
  assert.match(minhasTarefas, /!dirty \|\| !hasPermission/);
});

test("tarefas identificam a paginação para tecnologia assistiva", () => {
  assert.match(minhasTarefas, /aria-label="Paginação de tarefas"/);
  assert.match(minhasTarefas, /aria-current="page"/);
});

test("tarefas atualizam ao retornar à aba", () => {
  assert.match(minhasTarefas, /addEventListener\('focus',refreshOnReturn\)/);
  assert.match(minhasTarefas, /addEventListener\('visibilitychange',refreshOnReturn\)/);
  assert.match(minhasTarefas, /removeEventListener\('focus',refreshOnReturn\)/);
  assert.match(minhasTarefas, /lastReturnRefresh/);
  assert.match(minhasTarefas, />1000/);
});

test("resumo do funcionário usa cores semânticas nos indicadores", () => {
  assert.match(resumoFuncionario, /function cardTone/);
  assert.match(resumoFuncionario, /Atrasadas/);
  assert.match(resumoFuncionario, /Concluídas/);
  assert.match(resumoFuncionario, /Em andamento/);
});

test("editor de acesso permite repetir o carregamento", () => {
  assert.match(editorAcesso, /const \[retry,setRetry\]/);
  assert.match(editorAcesso, /\},\[userId,retry\]\)/);
  assert.match(editorAcesso, /Tentar novamente/);
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

test("notificações permitem retry e paginação acessível", () => {
  assert.match(notificacoesFuncionario, /aria-live="polite"/);
  assert.match(notificacoesFuncionario, /Tentar novamente/);
  assert.match(notificacoesFuncionario, /aria-label="Paginação de notificações"/);
  assert.match(notificacoesFuncionario, /aria-current="page"/);
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
});

test("histórico do funcionário oferece retry e paginação acessível", () => {
  assert.match(historicoFuncionario, /aria-busy=\{loading\}/);
  assert.match(historicoFuncionario, /aria-live="polite"/);
  assert.match(historicoFuncionario, /Tentar novamente/);
  assert.match(historicoFuncionario, /aria-label="Paginação do histórico de atividades"/);
  assert.match(historicoFuncionario, /aria-current="page"/);
});

test("detalhe de tarefa oferece retry contextual e estado de carregamento acessível", () => {
  assert.match(detalheTarefa, /aria-busy=\{loading\}/);
  assert.match(detalheTarefa, /aria-live="polite"/);
  assert.match(detalheTarefa, /Tentar novamente/);
  assert.match(detalheTarefa, /Recarregar tarefa/);
});

test("ficha técnica anuncia carregamento e operações em andamento", () => {
  assert.match(fichaTecnica, /role="status" aria-live="polite">Carregando ficha técnica/);
  assert.match(fichaTecnica, /aria-busy=\{saving \|\| checklistBusy\}/);
});

test("ocorrências e anexos expõem retry e paginação acessível", () => {
  assert.match(ocorrencias, /aria-busy=\{loading \|\| busy\}/);
  assert.match(ocorrencias, /aria-label="Paginação de ocorrências"/);
  assert.match(ocorrencias, /Tentar novamente/);
  assert.match(anexos, /aria-busy=\{loading \|\| busy \|\| !!linkBusy\}/);
  assert.match(anexos, /aria-label="Paginação de anexos"/);
  assert.match(anexos, /Tentar novamente/);
});

test("aceite da instalação sinaliza salvamento e bloqueia envio concorrente", () => {
  assert.match(aceiteInstalacao, /aria-busy=\{busy\}/);
  assert.match(aceiteInstalacao, /disabled=\{!attachments\.length \|\| disabled \|\| busy\}/);
});

test("produção e estoque sinalizam operações e mensagens ao funcionário", () => {
  assert.match(solicitacaoMaterial, /aria-busy=\{busy\}/);
  assert.match(solicitacaoMaterial, /aria-live="polite"/);
  assert.match(registroProducao, /aria-busy=\{busy\}/);
  assert.match(registroProducao, /aria-live="polite"/);
});

test("secagem, inbox de estoque e resumo anunciam estados de operação", () => {
  assert.match(controleSecagem, /aria-busy=\{busy\}/);
  assert.match(controleSecagem, /aria-live="polite"/);
  assert.match(inboxMateriais, /aria-busy=\{loading\}/);
  assert.match(inboxMateriais, /Tentar novamente/);
  assert.match(inboxMateriais, /aria-live="polite"/);
  assert.match(inboxMateriais, /actionBusy/);
  assert.match(inboxMateriais, /disabled=\{loading\|\|!!actionBusy\}/);
  assert.match(resumoFuncionario, /aria-busy=\{loading\}/);
});

test("editores operacionais anunciam carregamento e bloqueiam estados concorrentes", () => {
  assert.match(criacaoTarefa, /aria-busy=\{loading \|\| busy\}/);
  assert.match(criacaoTarefa, /aria-live="polite"/);
  assert.match(atribuicaoFicha, /aria-busy=\{loading \|\| busy\}/);
  assert.match(atribuicaoFicha, /aria-live="polite"/);
  assert.match(fluxoProducao, /aria-busy=\{loading \|\| busy\}/);
  assert.match(fluxoProducao, /aria-live="polite"/);
});

test("editor de acesso anuncia carregamento e bloqueia salvamento", () => {
  assert.match(editorFuncionario, /aria-busy=\{busy \|\| \(!employee && !error\)\}/);
  assert.match(editorFuncionario, /role="status" aria-live="polite"/);
  assert.match(editorFuncionario, /disabled=\{busy\}/);
});

test("ficha técnica e resolução de ocorrência anunciam estados críticos", () => {
  assert.match(fichaOperacional, /role="status" aria-live="polite"/);
  assert.match(ocorrenciasFuncionario, /<form className="space-y-2" aria-busy=\{busy\}/);
});

test("cartão de tarefa sinaliza atualização concorrente", () => {
  assert.match(minhasTarefas, /<form className="grid gap-3 sm:grid-cols-2" aria-busy=\{busy\}/);
});

test("notificações sinalizam leitura e bloqueiam abertura concorrente", () => {
  assert.match(notificacoesFuncionario, /aria-busy=\{loading \|\| !!busy\}/);
  assert.match(notificacoesFuncionario, /disabled=\{!!busy\}/);
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
});

test("agenda ignora respostas de requisições antigas", () => {
  assert.match(agendaFuncionario, /const generation=useRef\(0\)/);
  assert.match(agendaFuncionario, /if\(request===generation\.current\)setItems/);
  assert.match(agendaFuncionario, /return\(\)=>\{generation\.current\+\+;\}/);
});

test("anexos bloqueiam geração simultânea de links temporários", () => {
  assert.match(anexos, /linkBusy/);
  assert.match(anexos, /disabled=\{busy \|\| !!linkBusy\}/);
  assert.match(anexos, /itemBusy\?'Gerando…'/);
});

test("inbox de estoque ignora respostas de filtros antigos", () => {
  assert.match(inboxMateriais, /const generation=useRef\(0\)/);
  assert.match(inboxMateriais, /if\(request===generation\.current\)setItems/);
  assert.match(inboxMateriais, /return\(\)=>\{generation\.current\+\+;\}/);
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

