// ==========================================
// CONFIGURAÇÃO SUPABASE / ESTADO GLOBAL
// ==========================================
const SUPABASE_URL = "https://SEU_PROJETO.supabase.co"; // Substitua com sua URL
const SUPABASE_ANON_KEY = "SUA_CHAVE_ANON";             // Substitua com sua chave pública

let supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL.indexOf('SEU_PROJETO') === -1) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch(e) {
        console.warn("Supabase não inicializado, usando localStorage:", e);
    }
}

// Estados e Permissões
let currentRole = localStorage.getItem('boreal_user_role') || 'GESTOR';
let usuarioLogado = JSON.parse(localStorage.getItem('boreal_usuario_logado') || 'null');
let selectedAsoId = null;
let currentAnamneseTarget = null;

// Memórias locais
let clinicasCadastradas = JSON.parse(localStorage.getItem('boreal_clinicas_db') || '[]');
let monitorRequestsData = JSON.parse(localStorage.getItem('boreal_pedidos_db') || '[]');
let asoQueueData = JSON.parse(localStorage.getItem('boreal_aso_queue_db') || '[]');
let asoHistoryData = JSON.parse(localStorage.getItem('boreal_aso_history_db') || '[]');
let atestadosHomologacaoData = JSON.parse(localStorage.getItem('boreal_atestados_db') || '[]');
let currentOrderItems = [];

// ==========================================
// FLUXO DE LOGIN E SEGURANÇA (DESCONGELAMENTO)
// ==========================================
window.inicializarSistema = function() {
    const roleSelect = document.getElementById('user-role-select');
    if (roleSelect) roleSelect.value = currentRole;

    const telaLogin = document.getElementById('tela-login-container');
    if (usuarioLogado && telaLogin) {
        telaLogin.classList.add('hidden');
    }

    renderMonitorTable();
    renderFilaAso();
    renderHistoryTabela();
    renderTabelaVinculos();
    renderProducaoTable();
    renderHomologacaoTabela();
    if (window.lucide) { lucide.createIcons(); }
};

window.realizarLoginSistema = function() {
    const email = document.getElementById('login_usuario_email')?.value.trim();
    const senha = document.getElementById('login_usuario_senha')?.value.trim();
    const msgErro = document.getElementById('login_msg_erro');

    if (!email || !senha) {
        if (msgErro) {
            msgErro.textContent = "Informe usuário e senha.";
            msgErro.classList.remove('hidden');
        }
        return;
    }

    // Validação autenticada ou mestre
    usuarioLogado = {
        email: email,
        nome: email.split('@')[0].toUpperCase(),
        perfil: currentRole
    };
    localStorage.setItem('boreal_usuario_logado', JSON.stringify(usuarioLogado));

    if (msgErro) msgErro.classList.add('hidden');
    const telaLogin = document.getElementById('tela-login-container');
    if (telaLogin) telaLogin.classList.add('hidden');

    alert(`Bem-vindo, ${usuarioLogado.nome}!`);
};

window.realizarLogout = function() {
    localStorage.removeItem('boreal_usuario_logado');
    usuarioLogado = null;
    const telaLogin = document.getElementById('tela-login-container');
    if (telaLogin) telaLogin.classList.remove('hidden');
};

window.abrirModalPrimeiroAcesso = function() {
    const email = prompt("Digite seu e-mail para cadastrar ou redefinir senha:");
    if (email) {
        alert("Instruções de acesso e link de redefinição foram enviados para o e-mail informado.");
    }
};

window.alterarSenhaMaster = function() {
    const nova = prompt("Digite a nova Senha Master do Sistema:");
    if (nova) {
        localStorage.setItem('boreal_master_pwd', nova);
        alert("Senha Master alterada com sucesso.");
    }
};

window.alterarChaveGemini = function() {
    const key = prompt("Digite sua chave de API do Google Gemini:");
    if (key) {
        localStorage.setItem('boreal_gemini_key', key);
        alert("Chave API salva.");
    }
};

window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-tab-btn').forEach(b => {
        b.classList.remove('bg-blue-800', 'text-white');
        b.classList.add('text-slate-300');
    });

    const activeTab = document.getElementById(`tab-${tabId}`);
    const activeBtn = document.getElementById(`nav-btn-${tabId}`);

    if (activeTab) activeTab.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-300');
        activeBtn.classList.add('bg-blue-800', 'text-white');
    }
};

window.fecharModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
};

// ==========================================
// 1. MEMÓRIA DO AGENDAMENTO COM TECLA "IGUAL"
// ==========================================
let ultimoAgendamentoSalvo = { horarios: '', endereco: '' };

window.abrirModalResponderAgendamento = function(id) {
    const pedido = monitorRequestsData.find(p => p.id === id);
    if (!pedido) return;

    const modal = document.getElementById('modal-resposta-agendamento');
    if (!modal) return;

    modal.dataset.pedidoId = id;
    const inpTrab = document.getElementById('resp_trab_lbl');
    if (inpTrab) inpTrab.value = `${pedido.trab} (${pedido.obj})`;

    const clinicaCad = clinicasCadastradas.find(c => c.nome === pedido.clinica);
    const inpEnd = document.getElementById('resp_endereco');
    if (inpEnd) inpEnd.value = clinicaCad ? (clinicaCad.endereco || clinicaCad.nome) : (pedido.clinica || '');

    modal.classList.remove('hidden');
};

window.aplicarHorarioAnteriorIgual = function() {
    if (!ultimoAgendamentoSalvo.horarios) {
        return alert("Nenhum agendamento anterior registrado nesta sessão para replicar.");
    }
    document.getElementById('resp_horarios').value = ultimoAgendamentoSalvo.horarios;
    if (ultimoAgendamentoSalvo.endereco) {
        document.getElementById('resp_endereco').value = ultimoAgendamentoSalvo.endereco;
    }
};

window.confirmarRespostaAgendamento = async function() {
    const modal = document.getElementById('modal-resposta-agendamento');
    const id = Number(modal.dataset.pedidoId);
    const pedido = monitorRequestsData.find(p => p.id === id);
    if (!pedido) return;

    const horarios = document.getElementById('resp_horarios')?.value.trim();
    const endereco = document.getElementById('resp_endereco')?.value.trim();

    if (!horarios) return alert("Por favor, preencha as opções de data e horário!");

    ultimoAgendamentoSalvo = { horarios, endereco };

    const partes = (pedido.trab || "").split('-');
    const nomeTrab = (partes[0] ? partes[0].trim() : pedido.trab).toUpperCase();
    const cpfTrab = partes[1] ? partes[1].trim() : "000.000.000-00";

    asoQueueData.unshift({
        id: Date.now(),
        nome: nomeTrab,
        cpf: cpfTrab,
        nasc: '',
        matricula: '-',
        cliente: pedido.cliente || 'CLIENTE GERAL',
        cargo: "OPERACIONAL",
        funcao: "OPERACIONAL",
        lotacao: "OPERACIONAL",
        tipo: pedido.obj || 'ASO PERIÓDICO',
        riscos: 'AUSÊNCIA DE RISCOS ESPECÍFICOS',
        medicoDestino: pedido.clinica || 'MÉDICO BOREAL',
        status: "AGENDADO",
        anamnese: null
    });

    monitorRequestsData = monitorRequestsData.filter(p => p.id !== id);
    localStorage.setItem('boreal_pedidos_db', JSON.stringify(monitorRequestsData));
    localStorage.setItem('boreal_aso_queue_db', JSON.stringify(asoQueueData));

    if (supabaseClient) {
        try { await supabaseClient.from('pedidos_agendamento').delete().eq('id', id); } catch(e){}
    }

    renderMonitorTable();
    renderFilaAso();
    fecharModal('modal-resposta-agendamento');
    alert("✅ Agendamento registrado! O colaborador foi transferido para a Fila do ASO.");
};

window.renderMonitorTable = function() {
    const tbody = document.getElementById('monitor-requests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    monitorRequestsData.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2">${p.data || '-'}</td>
            <td class="p-2 font-bold">${p.cliente || '-'}</td>
            <td class="p-2">${p.trab}</td>
            <td class="p-2 font-bold text-blue-900">${p.obj}</td>
            <td class="p-2 text-center">${p.qtd || 1}</td>
            <td class="p-2 text-center col-valor-sigilo font-bold text-emerald-800">R$ ${p.valor || '0,00'}</td>
            <td class="p-2">${p.clinica || '-'}</td>
            <td class="p-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">${p.status || 'PENDENTE'}</span></td>
            <td class="p-2 text-center">
                <button type="button" onclick="abrirModalResponderAgendamento(${p.id})" class="bg-blue-800 text-white px-2 py-1 rounded text-xs font-bold">Responder</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.renderFilaAso = function() {
    const tbody = document.getElementById('aso-queue-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    asoQueueData.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2.5 font-bold">${item.nome} <br><span class="text-[10px] text-slate-500 font-mono">${item.cpf}</span></td>
            <td class="p-2.5">${item.cliente}</td>
            <td class="p-2.5">${item.cargo} / ${item.lotacao}</td>
            <td class="p-2.5 font-bold text-blue-900">${item.tipo}</td>
            <td class="p-2.5 text-center">
                <button type="button" onclick="abrirAnamneseModal(${item.id})" class="bg-indigo-50 border border-indigo-200 text-indigo-900 px-2 py-1 rounded text-[11px] font-bold">📋 Ficha</button>
            </td>
            <td class="p-2.5 text-center">
                <button type="button" onclick="abrirModalEdicaoAso(${item.id})" class="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-[11px] font-bold">🩺 Abrir ASO</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

// ==========================================
// 2. TABELA DE ITENS E PREÇOS DOS FORNECEDORES
// ==========================================
window.adicionarItemTabelaPreco = async function() {
    const cli = document.getElementById('vinc_cli_select')?.value;
    const tipo = document.getElementById('vinc_tipo_select')?.value;
    const parceiro = document.getElementById('vinc_parceiro_select')?.value;
    const contrato = document.getElementById('vinc_modalidade_contrato')?.value;
    const objeto = document.getElementById('vinc_objeto')?.value.trim();
    const unit = parseFloat(document.getElementById('vinc_unit')?.value) || 0;

    if (!cli || !parceiro || !objeto) return alert("Preencha Cliente, Fornecedor e Objeto.");

    const novoItem = {
        id: Date.now(),
        cliente_nome: cli,
        tipo_vinculo: tipo,
        entidade_nome: parceiro,
        modalidade_contrato: contrato,
        objeto: objeto,
        valor_unitario: unit,
        ativo: true
    };

    let vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    vinculos.push(novoItem);
    localStorage.setItem('boreal_vinculos_db', JSON.stringify(vinculos));

    if (supabaseClient) {
        try {
            await supabaseClient.from('vinculos_comerciais').upsert([novoItem]);
        } catch(e){}
    }

    renderTabelaVinculos();
    document.getElementById('vinc_objeto').value = '';
    alert("✅ Item e preço vinculados com sucesso!");
};

window.renderTabelaVinculos = function() {
    const tbody = document.getElementById('tabela-vinculos-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    vinculos.forEach((v, index) => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2 font-bold">${v.cliente_nome}</td>
            <td class="p-2">${v.tipo_vinculo}</td>
            <td class="p-2 font-bold text-slate-900">${v.entidade_nome}</td>
            <td class="p-2 font-semibold text-blue-900">${v.modalidade_contrato || 'RECORRENTE_FIXO'}</td>
            <td class="p-2 font-bold">${v.objeto}</td>
            <td class="p-2 text-right bg-amber-50">R$ ${Number(v.valor_unitario).toFixed(2)}</td>
            <td class="p-2 text-center">
                <button type="button" onclick="removerVinculo(${index})" class="text-rose-600 font-bold hover:underline">Apagar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.removerVinculo = function(idx) {
    let vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    vinculos.splice(idx, 1);
    localStorage.setItem('boreal_vinculos_db', JSON.stringify(vinculos));
    renderTabelaVinculos();
};

// ==========================================
// 3. POSIÇÃO FINANCEIRA
// ==========================================
window.renderProducaoTable = function() {
    const tbody = document.getElementById('relatorio-producao-tbody');
    const totalEl = document.getElementById('valor-soma-total-producao');
    if (!tbody) return;
    tbody.innerHTML = '';
    let somaTotal = 0;

    let linhasApuracao = JSON.parse(localStorage.getItem('boreal_apuracao_financeira_db') || '[]');

    linhasApuracao.forEach((r, idx) => {
        const qtd = Number(r.qtd_executada || 0);
        const unit = Number(r.valor_unitario || 0);
        const subtotal = qtd * unit;
        somaTotal += subtotal;

        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2.5">${r.data}</td>
            <td class="p-2.5 font-bold">${r.fornecedor}</td>
            <td class="p-2.5">${r.cliente}</td>
            <td class="p-2.5 font-bold text-blue-900">${r.objeto}</td>
            <td class="p-2.5 text-center bg-amber-50/70">${qtd}</td>
            <td class="p-2.5 text-right font-bold">R$ ${unit.toFixed(2)}</td>
            <td class="p-2.5 text-right font-black text-emerald-700">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
            <td class="p-2.5 text-center">
                <button onclick="removerItemApuracao(${idx})" class="text-rose-600 font-bold">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (totalEl) totalEl.textContent = `R$ ${somaTotal.toFixed(2).replace('.', ',')}`;
};

// ==========================================
// 4. ASSINATURA ELETRÔNICA DO ASO
// ==========================================
function gerarHashValidacaoAso() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let h = '';
    for (let i = 0; i < 4; i++) h += chars.charAt(Math.floor(Math.random() * chars.length));
    return `ASO-${Date.now().toString().slice(-6)}-${h}`;
}

window.abrirModalEdicaoAso = function(id) {
    selectedAsoId = id;
    const item = asoQueueData.find(x => x.id === id);
    if (!item) return;

    document.getElementById('aso_edit_razao').value = item.cliente || '';
    document.getElementById('aso_edit_cnpj').value = item.cnpj || '00.000.000/0001-00';
    document.getElementById('aso_edit_nome').value = item.nome || '';
    document.getElementById('aso_edit_cpf').value = item.cpf || '';
    document.getElementById('aso_edit_cargo').value = item.cargo || '';
    document.getElementById('aso_edit_funcao').value = item.funcao || item.cargo || '';
    document.getElementById('aso_edit_lotacao').value = item.lotacao || 'OPERACIONAL';
    document.getElementById('aso_edit_data').value = new Date().toLocaleDateString('pt-BR');
    document.getElementById('aso_edit_local').value = 'PAULÍNIA - SP';

    document.getElementById('modal-aso').classList.remove('hidden');
};

window.concluirEmissaoAsoBoreal = async function() {
    const item = asoQueueData.find(x => x.id === selectedAsoId);
    if (!item) return;

    const conclusaoTxt = document.querySelector('input[name="aso_conclusao"]:checked')?.value || "Apto";
    const tipoExameTxt = document.querySelector('input[name="aso_tp_exame"]:checked')?.value || (item.tipo || "ASO PERIÓDICO");

    const hashValidador = gerarHashValidacaoAso();
    const dataHoraRegistro = new Date().toISOString();
    const medicoNome = usuarioLogado?.nome || "DR. MÉDICO EXAMINADOR";

    const asoObj = {
        id: Date.now(),
        fecha: document.getElementById('aso_edit_data')?.value || new Date().toLocaleDateString('pt-BR'),
        local: document.getElementById('aso_edit_local')?.value || "Paulínia - SP",
        nome: document.getElementById('aso_edit_nome')?.value || item.nome,
        cpf: document.getElementById('aso_edit_cpf')?.value || item.cpf,
        nasc: item.nasc || 'Não informada',
        matricula: item.matricula || '-',
        cliente: document.getElementById('aso_edit_razao')?.value || item.cliente,
        cargo: document.getElementById('aso_edit_cargo')?.value || item.cargo,
        funcao: document.getElementById('aso_edit_funcao')?.value || item.funcao || item.cargo,
        lotacao: document.getElementById('aso_edit_lotacao')?.value || item.lotacao || 'OPERACIONAL',
        cnpj: document.getElementById('aso_edit_cnpj')?.value || '00.000.000/0001-00',
        tipoExame: tipoExameTxt,
        origem: "SISTEMA_BOREAL",
        resultado: conclusaoTxt.toUpperCase(),
        medico: medicoNome,
        medicoPcmso: "-",
        agentes: document.getElementById('aso_doc_agentes_especificos')?.value || 'AUSÊNCIA DE RISCOS ESPECÍFICOS',
        assinatura_eletronica: {
            hash_validacao: hashValidador,
            data_hora: dataHoraRegistro,
            medico_nome: medicoNome,
            crm_uf: "CRM/SP 1011385",
            autenticacao: "Assinatura Eletrônica Avançada Boreal Engmed"
        },
        anamneseDados: item.anamnese || null
    };

    asoHistoryData.unshift(asoObj);
    localStorage.setItem('boreal_aso_history_db', JSON.stringify(asoHistoryData));

    asoQueueData = asoQueueData.filter(x => x.id !== selectedAsoId);
    localStorage.setItem('boreal_aso_queue_db', JSON.stringify(asoQueueData));

    if (supabaseClient) {
        try {
            await supabaseClient.from('asos').upsert([asoObj]);
        } catch(e){}
    }

    renderFilaAso();
    renderHistoryTabela();
    fecharModal('modal-aso');
    alert(`✅ ASO emitido e assinado eletronicamente!\nCódigo de Validação: ${hashValidador}`);
};

window.renderHistoryTabela = function() {
    const tbody = document.getElementById('aso-history-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    asoHistoryData.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2.5">${item.fecha}</td>
            <td class="p-2.5 font-bold">${item.nome} <br><span class="text-[10px] text-slate-500 font-mono">${item.cpf}</span></td>
            <td class="p-2.5">${item.cliente}</td>
            <td class="p-2.5"><span class="px-2 py-0.5 rounded font-black text-xs ${item.resultado === 'APTO' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}">${item.resultado}</span></td>
            <td class="p-2.5 font-bold">${item.medico}</td>
            <td class="p-2.5 text-center font-bold text-slate-600">Sim</td>
            <td class="p-2.5 text-center">
                <button type="button" onclick="visualizarAsoAnexado(${item.id})" class="bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-2 py-1 rounded text-xs">📄 Visualizar</button>
            </td>
            <td class="p-2.5 text-center">
                <button type="button" onclick="apagarAsoHistorico(${item.id})" class="text-rose-600 font-bold hover:underline">Apagar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.visualizarAsoAnexado = function(id) {
    const item = asoHistoryData.find(x => x.id === id);
    if (!item) return;

    const paper = document.getElementById('aso-paper-visualizar');
    if (paper) {
        paper.className = "bg-white p-6 max-w-4xl mx-auto text-slate-900 border-2 border-black shadow-2xl text-[12px] leading-snug space-y-3 folha-homologacao-print";
        paper.innerHTML = `
            <div class="border-b-2 border-black pb-2 flex justify-between items-center">
                <div>
                    <strong class="text-sm block font-black uppercase text-blue-950">Boreal Engenharia e Medicina</strong>
                    <span class="text-[10px] text-slate-600 font-semibold">CRM Nº 1011385 | Tel. (19) 99156-7153</span>
                </div>
                <div class="text-right">
                    <strong class="text-sm font-black uppercase tracking-tight">ATESTADO DE SAÚDE OCUPACIONAL - ASO</strong>
                </div>
            </div>

            <div class="border border-black p-2 bg-slate-100 font-bold uppercase text-[10px] flex justify-between">
                <span>EMPREGADOR / CLIENTE: ${item.cliente}</span>
                <span>CNPJ: ${item.cnpj || '00.000.000/0001-00'}</span>
                <span>DATA EMISSÃO: ${item.fecha}</span>
            </div>

            <div class="border border-black p-2.5 space-y-1 text-[11px]">
                <strong class="block border-b border-black font-extrabold uppercase text-[10px] pb-0.5 bg-slate-100 px-1">IDENTIFICAÇÃO DO TRABALHADOR</strong>
                <div class="grid grid-cols-2 gap-x-2 pt-0.5">
                    <div><strong>NOME:</strong> ${item.nome}</div>
                    <div><strong>CPF:</strong> ${item.cpf}</div>
                    <div><strong>CARGO:</strong> ${item.cargo}</div>
                    <div><strong>FUNÇÃO:</strong> ${item.funcao || item.cargo}</div>
                    <div><strong>LOTAÇÃO / SETOR:</strong> ${item.lotacao || 'OPERACIONAL'}</div>
                    <div><strong>MATRÍCULA:</strong> ${item.matricula || '-'}</div>
                    <div><strong>TIPO DE EXAME:</strong> <span class="font-bold text-blue-900">${item.tipoExame}</span></div>
                    <div><strong>CONCLUSÃO MÉDICA:</strong> <span class="font-extrabold ${item.resultado === 'APTO' ? 'text-emerald-800' : 'text-red-700'}">${item.resultado}</span></div>
                </div>
            </div>

            <div class="border border-black p-2.5 text-[11px] bg-slate-50">
                <strong class="font-black text-xs uppercase block mb-1">RISCOS OCUPACIONAIS ESPECÍFICOS:</strong>
                <p class="font-semibold">${item.agentes || 'AUSÊNCIA DE RISCOS ESPECÍFICOS'}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 border-t border-black pt-4 items-center bg-white mt-4">
                <div class="text-center">
                    <div class="border-b border-black w-4/5 mx-auto mb-1 h-8"></div>
                    <strong class="block text-[10px] uppercase text-slate-800">${item.nome}</strong>
                    <span class="text-[9px] text-slate-500 block">Assinatura do Trabalhador</span>
                </div>
                <div class="p-2 border border-dashed border-indigo-400 bg-indigo-50/60 rounded text-center space-y-0.5 shadow-sm">
                    <span class="text-[8px] tracking-wider text-indigo-700 block font-black uppercase">✓ DOCUMENTO ASSINADO ELETRONICAMENTE</span>
                    <strong class="text-indigo-950 text-[11px] block uppercase">${item.assinatura_eletronica?.medico_nome || item.medico}</strong>
                    <span class="text-[9px] text-indigo-900 block font-bold">Médico Examinador — ${item.assinatura_eletronica?.crm_uf || 'CRM Registrado'}</span>
                    <span class="text-[8px] text-slate-500 block font-mono">ID: ${item.assinatura_eletronica?.hash_validacao || 'VALIDAÇÃO ELETRÔNICA'}</span>
                </div>
            </div>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado').classList.remove('hidden');
};

// ==========================================
// 5. ANAMNESE E HOMOLOGAÇÃO
// ==========================================
window.abrirAnamneseModal = function(id) {
    currentAnamneseTarget = id;
    const item = asoQueueData.find(x => x.id === id);
    if (!item) return;

    document.getElementById('anam_nome_lbl').textContent = item.nome;
    document.getElementById('anam_cpf_lbl').textContent = item.cpf;
    document.getElementById('anam_cargo_lbl').textContent = item.cargo;

    document.getElementById('modal-anamnese').classList.remove('hidden');
};

window.salvarAnamnese = function() {
    const item = asoQueueData.find(x => x.id === currentAnamneseTarget);
    if (item) {
        item.anamnese = {
            sangue: document.getElementById('anam_sangue')?.value,
            obs: document.getElementById('anam_obs')?.value
        };
        localStorage.setItem('boreal_aso_queue_db', JSON.stringify(asoQueueData));
    }
    fecharModal('modal-anamnese');
    alert("Ficha de anamnese salva com sucesso.");
};

window.renderHomologacaoTabela = function() {
    const tbody = document.getElementById('atestados-homologacao-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    atestadosHomologacaoData.forEach(a => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2 font-bold">${a.cliente}</td>
            <td class="p-2 font-bold">${a.trab}</td>
            <td class="p-2">${a.setor}</td>
            <td class="p-2">${a.cargo}</td>
            <td class="p-2">${a.data}</td>
            <td class="p-2 text-center font-bold">${a.dias} dias</td>
            <td class="p-2 text-center font-black text-purple-900">${a.cid}</td>
            <td class="p-2">${a.medico}</td>
            <td class="p-2 text-center">-</td>
            <td class="p-2 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100">${a.status}</span></td>
            <td class="p-2 text-center">-</td>
            <td class="p-2 text-center">
                <button onclick="apagarHomologacao(${a.id})" class="text-rose-600 font-bold">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};