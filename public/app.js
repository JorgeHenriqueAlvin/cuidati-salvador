const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brand = `<a href="/" class="brand" aria-label="CuidaTI Salvador, início"><img src="/favicon.svg" alt=""><span>Cuida<em>TI</em><small>SALVADOR</small></span></a>`;
const date = value => value ? new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',dateStyle:'short',timeStyle:'short'}).format(new Date(value)) : 'Não definida';
const money = value => value == null ? 'A definir' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const statusClass = status => ['Ativo','Realizada','Convertido'].includes(status) ? 'green' : ['Encerrado','Cancelada','Inativo'].includes(status) ? 'red' : status === 'Proposta enviada' ? 'amber' : '';
const badge = status => `<span class="badge ${statusClass(status)}">${esc(status)}</span>`;
let state = { leads:[],clients:[],visits:[],settings:{} }, currentTab = 'dashboard', toastTimeout;
function notify(message) { document.querySelector('#toast').textContent=message; clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>document.querySelector('#toast').textContent='',5000); }
async function api(path, method='GET', data) {
  const response = await fetch(`/api${path}`,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
  let result; try { result=await response.json(); } catch { throw new Error('O servidor não respondeu corretamente. Tente novamente.'); }
  if (!response.ok) {
    if (response.status===401 && location.pathname.startsWith('/admin') && path!=='/login' && path!=='/session') { modal.close(); login(); }
    throw new Error(result.error||'Não foi possível concluir.');
  }
  return result;
}
function fields(form) { return Object.fromEntries(new FormData(form)); }
function input(label,name,value='',type='text',extra='') { return `<label class="field">${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`; }
function select(label,name,options,value,extra='') { return `<label class="field">${esc(label)}<select name="${name}" ${extra}>${options.map(o=>`<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`; }
function textarea(label,name,value='',max=1000) { return `<label class="field full">${esc(label)}<textarea name="${name}" maxlength="${max}" rows="3">${esc(value)}</textarea></label>`; }
function openModal(title,html) { modal.innerHTML=`<div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="close" type="button" aria-label="Fechar">×</button></div>${html}`; modal.querySelector('.close').onclick=()=>modal.close(); modal.showModal(); }
async function submitForm(form, action) {
  const button=form.querySelector('[type=submit]'); const error=form.querySelector('.error');
  error.textContent=''; button.disabled=true; const old=button.textContent; button.textContent='Salvando…';
  try { await action(fields(form)); } catch(e) { error.textContent=e.message; }
  finally { button.disabled=false; button.textContent=old; }
}
const whatsapp = (phone,message='') => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

async function landing() {
  app.innerHTML=`
    <div class="topbar"><span>●</span> TECNOLOGIA BEM CUIDADA. NEGÓCIO EM MOVIMENTO.</div>
    <header><nav class="wrap nav" aria-label="Navegação principal">${brand}<div class="nav-links"><a href="#servicos">Serviços</a><a href="#como-funciona">Como funciona</a><a href="#duvidas">Dúvidas</a><a class="btn" href="#proposta">Solicitar orçamento <span aria-hidden="true">↗</span></a></div></nav></header>
    <main id="main">
    <section class="hero"><div class="wrap hero-grid"><div>
      <div class="eyebrow"><span class="dot"></span> TI PARA PEQUENOS NEGÓCIOS · SALVADOR/BA</div>
      <h1>Seu negócio precisa funcionar.<br><span>A sua TI também.</span></h1>
      <p class="hero-copy">Cuide dos computadores da sua empresa antes que uma falha interrompa o trabalho. Manutenção preventiva e suporte com atenção ao que você precisa.</p>
      <div class="hero-actions"><a class="btn cyan" href="#proposta">Quero uma proposta <span aria-hidden="true">↗</span></a><a href="#como-funciona" class="text-link">Entenda como funciona ↓</a></div>
      <div class="trust-row"><span>Escopo definido</span><span>Atendimento agendado</span><span>Sem complicação</span></div>
    </div><div class="hero-art" aria-label="Ilustração de computador protegido"><div class="orbit"></div><div class="system-card"><div class="system-header">CUIDADO QUE FAZ PARTE DA ROTINA <span>●</span></div><div class="monitor"><div class="shield">✓</div></div><p>PREVENIR. ACOMPANHAR. CUIDAR.</p></div><div class="floating"><span class="check-icon">✓</span><span><strong>Mais cuidado com a sua operação</strong>Um plano pensado para a sua empresa.</span></div><p class="art-note">Manutenção preventiva, com acompanhamento de perto.</p></div></div></section>
    <div class="audience"><div class="wrap"><strong>PARA QUEM EMPREENDE EM SALVADOR</strong><div class="audience-list"><span>▣ Escritórios</span><span>▤ Lojas e comércios</span><span>▥ Pequenas empresas</span></div></div></div>
    <section class="section wrap" id="servicos"><div class="section-heading"><div><span class="eyebrow">O ESSENCIAL, BEM FEITO</span><h2>Menos improviso.<br>Mais cuidado com a sua TI.</h2></div><p>Para empresas com cerca de 3 a 20 computadores que precisam de apoio técnico, sem manter uma equipe própria.</p></div>
      <div class="services"><article class="service"><span class="service-icon" aria-hidden="true">⚙</span><h3>Manutenção preventiva</h3><p>Atendimentos agendados para verificar o funcionamento dos computadores e realizar atualizações autorizadas.</p></article><article class="service"><span class="service-icon" aria-hidden="true">▤</span><h3>Histórico e acompanhamento</h3><p>Registro das manutenções e planejamento dos próximos cuidados com os equipamentos da sua empresa.</p></article><article class="service"><span class="service-icon" aria-hidden="true">↗</span><h3>Suporte com escopo claro</h3><p>Atendimento conforme o serviço contratado e orientações sobre cuidados e rotina de backup.</p></article></div>
      <p class="scope">Peças, licenças, recuperação de dados e serviços adicionais dependem de avaliação e orçamento separado. Condições e limites de atendimento são definidos na proposta.</p>
    </section>
    <section class="section how" id="como-funciona"><div class="wrap"><span class="eyebrow">DA CONVERSA AO CUIDADO</span><h2>Começar é simples.</h2><div class="steps"><article><div class="step-no">01</div><h3>Conte o que você precisa</h3><p>Informe a quantidade de computadores, o bairro e as dificuldades da sua empresa.</p></article><article><div class="step-no">02</div><h3>Receba uma proposta</h3><p>Avaliamos o cenário para sugerir um atendimento avulso ou um plano de manutenção recorrente.</p></article><article><div class="step-no">03</div><h3>Combine pelo WhatsApp</h3><p>Converse sobre valores, escopo e disponibilidade. O agendamento é confirmado após o alinhamento.</p></article></div></div></section>
    <section class="section wrap" id="proposta"><div class="quote-grid"><div class="quote-intro"><span class="eyebrow">VAMOS CONVERSAR?</span><h2>A próxima melhoria da sua empresa pode começar aqui.</h2><p>Preencha o formulário para solicitar uma proposta conforme a necessidade da sua empresa.</p><div class="local-box"><strong>⌖ Atendimento em Salvador/BA</strong><p>Disponibilidade e eventual custo de deslocamento confirmados conforme o bairro.</p><p id="public-hours"></p></div><p class="micro">A solicitação não confirma contratação ou agendamento.</p></div>
    <div id="quote-container"><form id="quote-form" class="quote-form"><h3 class="form-title">Solicite sua proposta</h3><p class="form-subtitle">Conte um pouco sobre a sua empresa. Todos os campos são obrigatórios.</p><div class="fields">
      ${input('Seu nome','name','','text','required maxlength="150" autocomplete="name" placeholder="Nome do responsável"')}
      ${input('Empresa','company','','text','required maxlength="150" autocomplete="organization" placeholder="Nome da empresa"')}
      ${input('WhatsApp com DDD','phone','','tel','required maxlength="30" autocomplete="tel" placeholder="(71) 99999-9999"')}
      ${input('Bairro em Salvador','neighborhood','','text','required maxlength="150" placeholder="Ex.: Pituba"')}
      ${input('Quantidade de computadores','computers','','number','required min="1" max="10000" step="1" placeholder="Ex.: 5"')}
      ${select('Qual atendimento procura?','interest',['Preciso de orientação','Manutenção avulsa','Plano recorrente'],'Preciso de orientação')}
      <label class="field full">Qual é a principal dificuldade?<textarea name="difficulty" required maxlength="1000" placeholder="Conte o que está acontecendo ou o que deseja prevenir."></textarea></label>
      <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
      <label class="field full"><span id="challenge-question">Carregando verificação…</span><input name="challenge_answer" inputmode="numeric" required maxlength="3" autocomplete="off" aria-describedby="challenge-help"></label>
    </div><p id="challenge-help" class="micro">Uma conta simples para reduzir envios automáticos. <button type="button" class="tiny" id="refresh-challenge">Atualizar</button></p><p class="form-foot">Usaremos os dados informados para responder à sua solicitação e preparar uma proposta.</p><p class="error" role="alert"></p><button type="submit" class="btn">Solicitar proposta <span aria-hidden="true">↗</span></button></form></div>
    </div></section>
    <section class="section how" id="duvidas"><div class="wrap"><div class="section-heading"><div><span class="eyebrow">ANTES DE COMEÇAR</span><h2>Tire suas dúvidas.</h2></div></div><div class="faq"><details><summary>Como o orçamento é calculado?</summary><p>A proposta considera a quantidade e as condições dos computadores, o tipo de atendimento, a frequência e o bairro. Os valores são apresentados após a avaliação.</p></details><details><summary>Como funciona o atendimento recorrente?</summary><p>Definimos os serviços incluídos, os limites de suporte, a frequência das visitas e as condições de contratação. Não oferecemos atendimento ilimitado ou disponibilidade 24 horas.</p></details><details><summary>O que é cobrado separadamente?</summary><p>Peças, licenças, recuperação de dados e serviços fora do escopo precisam de aprovação de orçamento separado.</p></details><details><summary>Preencher o formulário já agenda uma visita?</summary><p>Não. A equipe conversa com você para entender a necessidade. Data e horário são confirmados manualmente pelo WhatsApp.</p></details><details><summary>Como meus dados são utilizados?</summary><p>Os dados ajudam a responder ao pedido e preparar uma proposta. Para solicitar correção ou exclusão, utilize o contato informado no rodapé. O histórico necessário de clientes pode ser tratado separadamente.</p></details></div></div></section>
    </main><footer><div class="wrap">${brand}<span>TI bem cuidada. Negócio em movimento.<br><span id="public-contact"></span></span><a href="/admin">Área administrativa ↗</a><span>© ${new Date().getFullYear()} CuidaTI Salvador</span></div></footer>`;
  let challenge, requestId=crypto.randomUUID(), sending=false;
  const form=document.querySelector('#quote-form');
  async function refreshChallenge() {
    const b=form.querySelector('[type=submit]'); b.disabled=true; challenge=null;
    try { challenge=await api('/challenge'); document.querySelector('#challenge-question').textContent=challenge.question; form.elements.challenge_answer.value=''; }
    catch(e) { form.querySelector('.error').textContent=e.message; }
    finally { b.disabled=!challenge; }
  }
  document.querySelector('#refresh-challenge').onclick=refreshChallenge;
  refreshChallenge();
  let settings={};
  try { settings=await api('/settings'); if(settings.hours)document.querySelector('#public-hours').textContent=`Horário: ${settings.hours}`; if(settings.email)document.querySelector('#public-contact').textContent=settings.email; }
  catch { /* A página e o formulário continuam; contato opcional. */ }
  form.onsubmit=async e=>{
    e.preventDefault(); if(sending || !challenge)return;
    sending=true;
    await submitForm(form,async values=>{
      await api('/leads','POST',{...values,request_id:requestId,challenge_token:challenge.token});
      let updated=settings; try { updated=await api('/settings'); } catch {}
      const message=`Olá! Solicitei uma proposta no CuidaTI Salvador.\n\nResponsável: ${values.name}\nEmpresa: ${values.company}\nWhatsApp: ${values.phone}\nBairro: ${values.neighborhood}\nComputadores: ${values.computers}\nInteresse: ${values.interest}\nDificuldade: ${values.difficulty}`;
      document.querySelector('#quote-container').innerHTML=`<div class="success" role="status"><h3>✓ Solicitação recebida!</h3><p>${updated.phone?'Continue pelo WhatsApp para conversar sobre sua proposta.':'Seus dados foram registrados. A equipe poderá entrar em contato pelo WhatsApp informado.'}</p>${updated.phone?`<a class="btn" target="_blank" rel="noopener noreferrer" href="${esc(whatsapp(updated.phone,message))}">Continuar no WhatsApp ↗</a>`:''}<p class="micro">O atendimento ainda será confirmado pela equipe.</p></div>`;
      document.querySelector('#quote-container').scrollIntoView({block:'center'});
    });
    sending=false;
  };
}

function login() {
  document.title='Acesso administrativo — CuidaTI Salvador';
  app.innerHTML=`<main id="main" class="login-page"><div class="login-card">${brand}<h1>Bem-vindo de volta.</h1><p>Acesse o painel para acompanhar os próximos cuidados com seus clientes.</p><form id="login-form"><div class="fields">${input('E-mail','email','','email','required autocomplete="username" maxlength="254"')}${input('Senha','password','','password','required autocomplete="current-password" maxlength="256"')}</div><p class="error" role="alert"></p><button class="btn" type="submit">Entrar no painel ↗</button></form><p class="micro">Acesso exclusivo para administradores autorizados.</p><a class="text-link" href="/">← Voltar ao site</a></div></main>`;
  const form=document.querySelector('#login-form');
  form.onsubmit=e=>{e.preventDefault();submitForm(form,async data=>{await api('/login','POST',data);await loadAdmin();});};
}
async function loadAdmin() { state=await api('/admin/data'); adminShell(); }
function adminShell() {
  const tabs=[['dashboard','◫','Visão geral'],['leads','◉','Interessados'],['clients','▣','Clientes'],['visits','▦','Visitas e cuidados'],['settings','⚙','Configurações']];
  app.innerHTML=`<div class="admin-shell"><aside class="sidebar">${brand}<nav class="side-nav" aria-label="Painel administrativo">${tabs.map(([key,icon,label])=>`<button data-tab="${key}" class="${key===currentTab?'active':''}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}</nav><div class="side-bottom">CUIDATI · GESTÃO DO NEGÓCIO<a href="/">↗ Abrir página pública</a>Salvador, Bahia</div></aside><div class="admin-main"><header class="admin-top"><div><small>ÁREA ADMINISTRATIVA</small><strong>Um cuidado de cada vez.</strong></div><button class="logout" id="logout">Sair da conta ↗</button></header><main id="main" class="admin-body"></main></div></div>`;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;adminShell();});
  document.querySelector('#logout').onclick=async()=>{try {await api('/logout','POST',{});state={leads:[],clients:[],visits:[],settings:{}};login();}catch(e){notify(e.message);}};
  renderTab();
}
function title(heading,sub,action='') { return `<div class="page-title"><div><h1>${heading}</h1><p>${sub}</p></div>${action}</div>`; }
function empty(titleText,subtitle) { return `<div class="empty"><strong>${titleText}</strong>${subtitle}</div>`; }
function clientName(id) { return state.clients.find(c=>c.id===id)?.company||'Cliente'; }
function leadTable(leads) {
  if(!leads.length)return empty('Nenhum interessado por aqui.','As solicitações recebidas no site aparecerão nesta lista.');
  return `<div class="table-scroll"><table><thead><tr><th>Empresa / responsável</th><th>Bairro</th><th>Computadores</th><th>Status</th><th></th></tr></thead><tbody>${leads.map(l=>`<tr><td><strong>${esc(l.company)}</strong><small>${esc(l.name)}</small></td><td>${esc(l.neighborhood)}</td><td>${l.computers}</td><td>${badge(l.status)}</td><td><button class="tiny" data-lead="${l.id}">Ver detalhes ↗</button></td></tr>`).join('')}</tbody></table></div>`;
}
function bindLeads() { document.querySelectorAll('[data-lead]').forEach(b=>b.onclick=()=>leadModal(b.dataset.lead)); }
function renderTab() {
  const main=document.querySelector('.admin-body');
  if(currentTab==='dashboard') {
    const now=Date.now(), upcoming=state.visits.filter(v=>v.status==='Agendada'&&Date.parse(v.scheduled_at)>=now&&Date.parse(v.scheduled_at)<=now+7*86400000);
    const overdue=state.visits.filter(v=>v.status==='Agendada'&&Date.parse(v.scheduled_at)<now);
    // Cada cliente tem apenas seu último registro de manutenção como referência.
    const maintenance=state.clients.filter(c=>c.status==='Ativo').map(c=>state.visits.filter(v=>v.client_id===c.id&&v.status==='Realizada').sort((a,b)=>b.scheduled_at.localeCompare(a.scheduled_at))[0]).filter(v=>v?.next_at&&Date.parse(v.next_at)<now);
    const stats=[['Total de interessados',state.leads.length,'Solicitações recebidas'],['Novas solicitações',state.leads.filter(l=>l.status==='Novo').length,'Aguardando primeiro contato'],['Propostas enviadas',state.leads.filter(l=>l.status==='Proposta enviada').length,'Em negociação'],['Clientes ativos',state.clients.filter(c=>c.status==='Ativo').length,'Relacionamentos em andamento'],['Visitas agendadas',state.visits.filter(v=>v.status==='Agendada').length,'Inclui horários vencidos'],['Manutenções pendentes',maintenance.length,'Próxima manutenção vencida']];
    main.innerHTML=title('Visão geral','Acompanhe os contatos e organize os próximos atendimentos.')+`<div class="stats">${stats.map(([label,value,sub])=>`<article class="stat"><span class="stat-label">${label}</span><strong>${value}</strong><small>${sub}</small></article>`).join('')}</div><section class="panel"><div class="panel-head"><h3>Atenção aos próximos cuidados</h3><small>Horário de Salvador</small></div>${[...overdue.map(v=>({v,label:'Visita vencida',time:v.scheduled_at})),...maintenance.map(v=>({v,label:'Manutenção pendente',time:v.next_at})),...upcoming.map(v=>({v,label:'Próximos 7 dias',time:v.scheduled_at}))].map(({v,label,time})=>`<div class="reminder"><div><strong>${esc(clientName(v.client_id))}</strong><p>${label} · ${date(time)}</p></div><button class="tiny" data-visit="${v.id}">Abrir ↗</button></div>`).join('')||empty('Tudo organizado por aqui.','Lembretes aparecerão conforme você cadastrar as visitas.')}</section><section class="panel"><div class="panel-head"><h3>Últimos interessados</h3><small>Até 5 contatos recentes</small></div>${leadTable(state.leads.slice(0,5))}</section>`;
    bindLeads();bindVisits();
  } else if(currentTab==='leads') {
    main.innerHTML=title('Interessados','Do primeiro contato à contratação, sem perder as informações.')+`<div class="filters"><input class="search" id="lead-search" aria-label="Buscar interessado" placeholder="Buscar empresa, pessoa ou bairro…"><select id="lead-status" aria-label="Filtrar status"><option value="">Todos os status</option>${['Novo','Em contato','Proposta enviada','Convertido','Encerrado'].map(s=>`<option>${s}</option>`).join('')}</select></div><section class="panel" id="lead-list"></section>`;
    const render=()=>{const query=document.querySelector('#lead-search').value.toLocaleLowerCase('pt-BR'),status=document.querySelector('#lead-status').value;document.querySelector('#lead-list').innerHTML=leadTable(state.leads.filter(l=>(!status||l.status===status)&&`${l.name} ${l.company} ${l.neighborhood}`.toLocaleLowerCase('pt-BR').includes(query)));bindLeads();};
    document.querySelector('#lead-search').oninput=render;document.querySelector('#lead-status').onchange=render;render();
  } else if(currentTab==='clients') {
    main.innerHTML=title('Clientes','Informações e serviços em um só lugar.')+`<div class="filters"><input class="search" id="client-search" placeholder="Buscar cliente…" aria-label="Buscar cliente"><select id="client-status" aria-label="Filtrar situação"><option value="">Todas as situações</option><option>Ativo</option><option>Inativo</option></select></div><section class="panel" id="client-list"></section>`;
    const render=()=>{const q=document.querySelector('#client-search').value.toLowerCase(),s=document.querySelector('#client-status').value;const clients=state.clients.filter(c=>(!s||c.status===s)&&`${c.company} ${c.name}`.toLowerCase().includes(q));document.querySelector('#client-list').innerHTML=clients.length?`<div class="table-scroll"><table><thead><tr><th>Empresa / responsável</th><th>Computadores</th><th>Mensalidade</th><th>Situação</th><th></th></tr></thead><tbody>${clients.map(c=>`<tr><td><strong>${esc(c.company)}</strong><small>${esc(c.name)}</small></td><td>${c.computers}</td><td>${money(c.monthly_cents)}</td><td>${badge(c.status)}</td><td><button class="tiny" data-client="${c.id}">Editar ↗</button></td></tr>`).join('')}</tbody></table></div>`:empty('Nenhum cliente encontrado.','Converta um interessado para criar o primeiro cliente.');document.querySelectorAll('[data-client]').forEach(b=>b.onclick=()=>clientModal(b.dataset.client));};document.querySelector('#client-search').oninput=render;document.querySelector('#client-status').onchange=render;render();
  } else if(currentTab==='visits') {
    main.innerHTML=title('Visitas e cuidados','Organize a agenda e mantenha o histórico de manutenção.','<button class="btn" id="new-visit">+ Nova visita</button>')+`<div class="filters"><select id="visit-status" aria-label="Filtrar visitas"><option value="">Todos os status</option><option>Agendada</option><option>Realizada</option><option>Cancelada</option></select></div><section class="panel" id="visit-list"></section>`;
    const render=()=>{const status=document.querySelector('#visit-status').value;const visits=state.visits.filter(v=>!status||v.status===status);document.querySelector('#visit-list').innerHTML=visits.length?`<div class="table-scroll"><table><thead><tr><th>Cliente</th><th>Agendamento</th><th>Status</th><th>Próxima manutenção</th><th></th></tr></thead><tbody>${visits.map(v=>`<tr><td><strong>${esc(clientName(v.client_id))}</strong><small>${esc(v.description.slice(0,70))}</small></td><td>${date(v.scheduled_at)}</td><td>${badge(v.status)}</td><td>${date(v.next_at)}</td><td><button class="tiny" data-visit="${v.id}">Editar ↗</button></td></tr>`).join('')}</tbody></table></div>`:empty('Nenhuma visita encontrada.','Cadastre um atendimento para começar a organizar sua agenda.');bindVisits();};document.querySelector('#visit-status').onchange=render;document.querySelector('#new-visit').onclick=()=>visitModal();render();
  } else {
    main.innerHTML=title('Configurações','Defina os contatos que serão exibidos na página pública.')+`<form class="settings-form" id="settings-form"><div class="fields">${input('WhatsApp comercial com DDD','phone',state.settings.phone,'tel','maxlength="30" placeholder="Não configurado"')}${input('E-mail de contato','email',state.settings.email,'email','maxlength="254"')}${input('Horário de atendimento','hours',state.settings.hours,'text','maxlength="300" placeholder="Ex.: segunda a sexta, das 8h às 17h"')}</div><p class="form-foot">Deixe o WhatsApp em branco para receber solicitações sem exibir um link de conversa. Nenhum número é criado automaticamente.</p><p class="error" role="alert"></p><button class="btn" type="submit">Salvar configurações</button></form>`;
    const form=document.querySelector('#settings-form');form.onsubmit=e=>{e.preventDefault();submitForm(form,async data=>{await api('/settings','PATCH',data);state.settings=await api('/settings');notify('Configurações salvas.');});};
  }
}
function leadModal(id) {
  const l=state.leads.find(l=>l.id===id), linked=state.clients.some(c=>c.lead_id===id);
  openModal(l.company,`<div class="detail"><strong>Responsável e contato</strong>${esc(l.name)} · +${esc(l.phone)}</div><div class="detail"><strong>Necessidade</strong>${esc(l.difficulty)}</div><div class="detail"><strong>Informações</strong>${esc(l.neighborhood)} · ${l.computers} computadores · ${esc(l.interest)}<br>Recebido em ${date(l.created_at)}</div><form id="lead-edit"><div class="fields">${select('Status','status',linked?['Convertido']:['Novo','Em contato','Proposta enviada','Encerrado'],l.status)}${textarea('Observações internas','notes',l.notes,5000)}</div><p class="error" role="alert"></p><div class="actions"><button type="submit">Salvar</button><a class="btn light" target="_blank" rel="noopener noreferrer" href="${esc(whatsapp(l.phone,`Olá, ${l.name}! Aqui é do CuidaTI Salvador. Recebemos sua solicitação para ${l.company}.`))}">WhatsApp ↗</a>${!linked?'<button type="button" class="light" id="convert">Converter em cliente</button>':''}<button type="button" class="danger" id="delete-lead">Excluir interessado</button></div></form>`);
  const form=document.querySelector('#lead-edit');form.onsubmit=e=>{e.preventDefault();submitForm(form,async data=>{await api(`/leads/${id}`,'PATCH',data);modal.close();await loadAdmin();notify('Interessado atualizado.');});};
  const convert=document.querySelector('#convert'); if(convert)convert.onclick=async()=>{convert.disabled=true;try{await api(`/leads/${id}/convert`,'POST',{});modal.close();await loadAdmin();notify('Cliente criado com os dados do interessado.');}catch(e){form.querySelector('.error').textContent=e.message;convert.disabled=false;}};
  document.querySelector('#delete-lead').onclick=async()=>{if(!confirm('Excluir os dados deste interessado? A ação não pode ser desfeita. Se já convertido, os dados do cliente e seu histórico serão preservados.'))return;try{await api(`/leads/${id}`,'DELETE');modal.close();await loadAdmin();notify('Interessado excluído.');}catch(e){form.querySelector('.error').textContent=e.message;}};
}
function clientModal(id) {
  const c=state.clients.find(c=>c.id===id);
  openModal('Editar cliente',`<form id="client-edit"><div class="fields">${input('Responsável','name',c.name,'text','required maxlength="150"')}${input('Empresa','company',c.company,'text','required maxlength="150"')}${input('WhatsApp','phone',c.phone,'tel','required maxlength="30"')}${input('Bairro','neighborhood',c.neighborhood,'text','required maxlength="150"')}${input('Computadores','computers',c.computers,'number','required min="1" max="10000" step="1"')}${input('Valor mensal (R$), opcional','monthly',c.monthly_cents==null?'':(c.monthly_cents/100).toFixed(2),'number','min="0" max="1000000" step="0.01"')}${select('Situação','status',['Ativo','Inativo'],c.status)}${textarea('Serviço contratado','service',c.service)}</div><p class="error" role="alert"></p><div class="actions"><button type="submit">Salvar cliente</button></div></form>`);
  const form=document.querySelector('#client-edit');form.onsubmit=e=>{e.preventDefault();submitForm(form,async data=>{await api(`/clients/${id}`,'PATCH',{...data,monthly_cents:data.monthly===''?null:Math.round(Number(data.monthly)*100)});modal.close();await loadAdmin();notify('Cliente atualizado.');});};
}
function bindVisits() { document.querySelectorAll('[data-visit]').forEach(b=>b.onclick=()=>visitModal(b.dataset.visit)); }
function salvadorInput(iso) {
  if(!iso)return '';
  // Bahia usa UTC-03:00; independente do fuso do computador do administrador.
  return new Date(Date.parse(iso)-3*3600000).toISOString().slice(0,16);
}
function visitModal(id) {
  if(!state.clients.length){notify('Converta um interessado em cliente antes de cadastrar uma visita.');return;}
  const v=state.visits.find(v=>v.id===id);
  openModal(v?'Editar visita':'Nova visita',`<form id="visit-edit"><div class="fields"><label class="field full">Cliente<select name="client_id" required ${v?'disabled':''}><option value="">Selecione um cliente</option>${state.clients.map(c=>`<option value="${c.id}" ${c.id===v?.client_id?'selected':''}>${esc(c.company)} (${esc(c.name)})</option>`).join('')}</select></label>${input('Data e hora em Salvador','scheduled_at',salvadorInput(v?.scheduled_at),'datetime-local','required')}${select('Status','status',['Agendada','Realizada','Cancelada'],v?.status||'Agendada')}${textarea('Descrição do atendimento','description',v?.description)}${textarea('Observações internas','notes',v?.notes,5000)}${input('Próxima manutenção (opcional)','next_at',salvadorInput(v?.next_at),'datetime-local')}</div><p class="form-foot">Datas e horários interpretados no fuso de Salvador/BA (UTC−03:00). O agendamento deve ser combinado com o cliente pelo WhatsApp.</p><p class="error" role="alert"></p><div class="actions"><button type="submit">Salvar visita</button></div></form>`);
  document.querySelector('[name=description]').required=true;
  const form=document.querySelector('#visit-edit');form.onsubmit=e=>{e.preventDefault();submitForm(form,async data=>{const payload={...data,scheduled_at:new Date(data.scheduled_at+':00-03:00').toISOString(),next_at:data.next_at?new Date(data.next_at+':00-03:00').toISOString():null};await api(v?`/visits/${id}`:'/visits',v?'PATCH':'POST',payload);modal.close();await loadAdmin();notify('Visita salva.');});};
}
async function start() {
  if(location.pathname.startsWith('/admin')) {
    try {await api('/session');await loadAdmin();}
    catch(e) {login();if(!e.message.includes('administrador'))notify(e.message);}
  } else await landing();
}
start();
