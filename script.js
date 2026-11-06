// ==========================================
// BOREAL ENGMED — SCRIPT NÚCLEO AVANÇADO
// ==========================================

const SUPABASE_URL = "https://mmbufdwvfbuzjhpswpvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tYnVmZHd2ZmJ1empocHN3cHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzIwMTAsImV4cCI6MjEwODk0ODAxMH0.ZQj9E-Ls-wENmLWEeq007whFHKjvoUy36jhGzgva6oI";

let supabaseClient = null;
try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error("Erro Supabase:", e);
}

// ESTADO GLOBAL DO SISTEMA
let usuarioLogado = null;
let currentRole = "GESTOR";
let selectedAsoId = null;
let orderItemsList = [];
let tempFileAtestadoTop = null;

let clientesCadastrados = [];
let clinicasCadastradas = [];
let medicosCadastrados = [];
let asoQueueData = [];
let asoHistoryData = [];
let pcmsoMatrizData = [];
let atestadosHomologacaoData = [];
let monitorRequestsData = [];

// 1. CARREGAMENTO INICIAL, SENHAS E SINCRONIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    try { if (window.lucide) lucide.createIcons(); } catch(e){}

    // Lembrança automática de credenciais salvas
    const savedEmail = localStorage.getItem('boreal_saved_email');
    const savedPass = localStorage.getItem('boreal_saved_pass');
    const emailInput = document.getElementById('login_usuario_email');
    const passInput = document.getElementById('login_usuario_senha');
    if (savedEmail && emailInput) emailInput.value = savedEmail;
    if (savedPass && passInput) passInput.value = savedPass;

    // Recupera dados salvos localmente
    carregarCadastrosLocalStorage();
    carregarBancoAsoLocal();
    carregarPedidosLocalStorage();

    // Sincroniza dados da nuvem Supabase
    if (supabaseClient) {
        await carregarTodosDadosSupabase();
    }

    renderClientesTabela();
    renderClinicasTabela();
    renderMedicosTabela();
    renderTabelaVinculos();
    renderFilaAso();
    renderHistoryTabela();
    renderHomologacaoTabela();
    renderMonitorTable();
    renderProducaoTable();
    renderPcmsoMatriz();
    atualizarDropdownsClientes();
    atualizarDropdownsClinicas();
    atualizarListaParceirosVinculo();
    atualizarSeletorDestinoCargaMassa();
    atualizarSeletorDestinoPedidoManual();
    popularDropdownCid10();
    popularDropdownExamesPcmso();
});

// 2. ROTINA DE AUTENTICAÇÃO E LOGIN PERSISTENTE
window.realizarLoginSistema = async function() {
    const emailInput = document.getElementById('login_usuario_email');
    const senhaInput = document.getElementById('login_usuario_senha');
    const msgErro = document.getElementById('login_msg_erro');

    if (!emailInput || !senhaInput) return;
    const email = emailInput.value.trim().toLowerCase();
    const senha = senhaInput.value.trim();

    if (!email || !senha) {
        alert("Preencha o e-mail e a senha.");
        return;
    }

    // Grava e-mail e senha permanentemente no navegador
    localStorage.setItem('boreal_saved_email', email);
    localStorage.setItem('boreal_saved_pass', senha);

    let perfilRole = 'GESTOR';
    let vinculoCli = 'ALL';
    let nomeUser = 'USUÁRIO';

    if (email.includes('cliente')) perfilRole = 'CLIENTE';
    else if (email.includes('clinica')) perfilRole = 'CLINICA';
    else if (email.includes('homologador')) perfilRole = 'MEDICO_HOMOLOGADOR';
    else if (email.includes('examinador')) perfilRole = 'MEDICO_EXAMINADOR_IND';
    else if (email.includes('pcmso')) perfilRole = 'MEDICO_PCMSO';
    else if (email.includes('agente')) perfilRole = 'AGENTE';

    usuarioLogado = { email, role: perfilRole, nome: nomeUser, vinculoCliente: vinculoCli };
    currentRole = perfilRole;

    const telaLogin = document.getElementById('tela-login-container');
    if (telaLogin) telaLogin.classList.add('hidden');

    validarTrocaPerfil(currentRole);
    if (msgErro) msgErro.classList.add('hidden');
};

// 3. CONTROLE DE ABAS E PERMISSÕES (PERFIL AGENTE & CLIENTE BLOQUEADO DO FINANCEIRO)
window.switchTab = async function(tabId) {
    if (!tabId) return;

    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
        el.style.display = 'none';
    });

    const target = document.getElementById('tab-' + tabId);
    if (target) {
        target.classList.remove('hidden');
        target.style.display = 'block';
    }

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.remove('bg-blue-800', 'text-white');
        btn.classList.add('text-slate-300');
    });

    const activeBtn = document.getElementById('nav-btn-' + tabId);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-300');
        activeBtn.classList.add('bg-blue-800', 'text-white');
    }

    if (tabId === 'homologacao' && typeof carregarHomologacaoDoBanco === 'function') {
        await carregarHomologacaoDoBanco();
    }
    if (tabId === 'producao') {
        renderProducaoTable();
    }
    if (tabId === 'pedidos') {
        atualizarSeletorDestinoCargaMassa();
        atualizarSeletorDestinoPedidoManual();
    }
};

window.validarTrocaPerfil = function(role) {
    const select = document.getElementById('user-role-select');
    if (role) currentRole = role;
    else if (select) currentRole = select.value;

    const nav = {
        pedidos: document.getElementById('nav-btn-pedidos'),
        atendimento: document.getElementById('nav-btn-atendimento'),
        historico: document.getElementById('nav-btn-historico'),
        esocial: document.getElementById('nav-btn-esocial'),
        homologacao: document.getElementById('nav-btn-homologacao'),
        pcmsoMatriz: document.getElementById('nav-btn-pcmso-matriz'),
        relatorioPcmso: document.getElementById('nav-btn-relatorio-pcmso'),
        producao: document.getElementById('nav-btn-producao'),
        chat: document.getElementById('nav-btn-chat'),
        cadastros: document.getElementById('nav-btn-cadastros')
    };

    Object.values(nav).forEach(b => { if(b) b.style.display = 'flex'; });

    // REGRAS ESTRITAS DE ISOLAMENTO
    if (currentRole === 'AGENTE') {
        if (nav.producao) nav.producao.style.display = 'none';
        window.switchTab('pedidos');
    } else if (currentRole === 'CLIENTE') {
        document.body.classList.add('hide-prices');
        if (nav.atendimento) nav.atendimento.style.display = 'none';
        if (nav.producao) nav.producao.style.display = 'none';
        if (nav.cadastros) nav.cadastros.style.display = 'none';
        window.switchTab('pedidos');
    } else {
        document.body.classList.remove('hide-prices');
        if (currentRole === 'MEDICO_HOMOLOGADOR') {
            if (nav.pedidos) nav.pedidos.style.display = 'none';
            if (nav.atendimento) nav.atendimento.style.display = 'none';
            if (nav.historico) nav.historico.style.display = 'none';
            if (nav.pcmsoMatriz) nav.pcmsoMatriz.style.display = 'none';
            if (nav.relatorioPcmso) nav.relatorioPcmso.style.display = 'none';
            if (nav.esocial) nav.esocial.style.display = 'none';
            if (nav.cadastros) nav.cadastros.style.display = 'none';
            window.switchTab('homologacao');
        } else if (currentRole === 'MEDICO_EXAMINADOR_IND') {
            if (nav.pedidos) nav.pedidos.style.display = 'none';
            if (nav.homologacao) nav.homologacao.style.display = 'none';
            if (nav.esocial) nav.esocial.style.display = 'none';
            if (nav.cadastros) nav.cadastros.style.display = 'none';
            if (nav.relatorioPcmso) nav.relatorioPcmso.style.display = 'none';
            window.switchTab('atendimento');
        } else if (currentRole === 'CLINICA') {
            if (nav.homologacao) nav.homologacao.style.display = 'none';
            if (nav.esocial) nav.esocial.style.display = 'none';
            if (nav.cadastros) nav.cadastros.style.display = 'none';
            window.switchTab('pedidos');
        }
    }

    atualizarBarraSelecaoClientesPorVinculo(currentRole);
};

function atualizarBarraSelecaoClientesPorVinculo(role) {
    const selectCli = document.getElementById('active-cliente-select');
    if (!selectCli) return;

    if (role === 'GESTOR' || role === 'AGENTE') {
        selectCli.disabled = false;
        atualizarDropdownsClientes();
        return;
    }

    const vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    let permitidos = [];
    const nomeLogado = (usuarioLogado?.nome || '').toUpperCase();

    permitidos = vinculos
        .filter(v => v.entidade_nome.toUpperCase() === nomeLogado && v.ativo)
        .map(v => v.cliente_nome);

    if (permitidos.length === 0 && clientesCadastrados.length > 0) {
        permitidos = [clientesCadastrados[0].nome];
    }

    selectCli.innerHTML = '';
    permitidos.forEach(cli => {
        const opt = document.createElement('option');
        opt.value = cli; opt.innerText = cli;
        selectCli.appendChild(opt);
    });
    selectCli.disabled = permitidos.length <= 1;
}

window.aoTrocarClienteFiltro = function() {
    renderPcmsoMatriz();
    renderHistoryTabela();
    renderHomologacaoTabela();
    renderMonitorTable();
    renderProducaoTable();
    atualizarHeaderPcmsoMedico();
    atualizarSeletorDestinoCargaMassa();
    atualizarSeletorDestinoPedidoManual();
};

// 4. MÓDULO 1: SELETOR DE DESTINO DINÂMICO E CARGA EM MASSA INTELIGENTE
window.atualizarSeletorDestinoCargaMassa = function() {
    const tipo = document.getElementById('carga_destino_tipo')?.value;
    const sel = document.getElementById('carga_destino_parceiro');
    if (!sel) return;
    sel.innerHTML = '';

    if (tipo === 'MEDICO_INDEPENDENTE') {
        medicosCadastrados
            .filter(m => m.tipo.includes('EXAMINADOR') || m.tipo.includes('INDEPENDENTE'))
            .forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.nome; opt.innerText = `${m.nome} (${m.crm})`;
                sel.appendChild(opt);
            });
    } else {
        clinicasCadastradas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome; opt.innerText = c.nome;
            sel.appendChild(opt);
        });
    }
};

window.atualizarSeletorDestinoPedidoManual = function() {
    const tipo = document.getElementById('ped_destino_tipo')?.value;
    const sel = document.getElementById('ped_destino_parceiro');
    if (!sel) return;
    sel.innerHTML = '';

    if (tipo === 'MEDICO_INDEPENDENTE') {
        medicosCadastrados
            .filter(m => m.tipo.includes('EXAMINADOR') || m.tipo.includes('INDEPENDENTE'))
            .forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.nome; opt.innerText = `${m.nome} (${m.crm})`;
                sel.appendChild(opt);
            });
    } else {
        clinicasCadastradas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome; opt.innerText = c.nome;
            sel.appendChild(opt);
        });
    }
};

// Carga em Massa Direcionada: vai direto para Fila do ASO (Médico) ou para Agendamento (Clínica)
window.processarCargaMassaDirecionada = function(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const tipoDestino = document.getElementById('carga_destino_tipo')?.value;
    const parceiroNome = document.getElementById('carga_destino_parceiro')?.value || 'PARCEIRO NÃO INFORMADO';
    const activeCli = document.getElementById('active-cliente-select')?.value || 'CLIENTE';
    const clientePadrao = activeCli === 'ALL' ? (clientesCadastrados[0]?.nome || 'CLIENTE') : activeCli;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            if (tipoDestino === 'MEDICO_INDEPENDENTE') {
                // Rota 1: Vai DIRETO para a Fila do ASO totalmente preenchido e editável
                rows.forEach((r, idx) => {
                    const nomeTrab = r.NOME || r.TRABALHADOR || r.EMPREGADO || `FUNCIONÁRIO ${idx+1}`;
                    const cpfTrab = r.CPF || "000.000.000-00";
                    const cargoTrab = r.CARGO || r.FUNCAO || "OPERACIONAL";
                    const tipoAso = r.TIPO || r.EXAME || "ASO PERIÓDICO";

                    asoQueueData.unshift({
                        id: Date.now() + idx,
                        nome: String(nomeTrab).toUpperCase(),
                        cpf: String(cpfTrab),
                        nasc: r.NASCIMENTO || r.DATA_NASC || '',
                        matricula: r.MATRICULA || '-',
                        cliente: String(r.CLIENTE || clientePadrao).toUpperCase(),
                        cargo: String(cargoTrab).toUpperCase(),
                        funcao: String(r.FUNCAO || cargoTrab).toUpperCase(),
                        lotacao: String(r.SETOR || r.LOTACAO || 'OPERACIONAL').toUpperCase(),
                        tipo: String(tipoAso).toUpperCase(),
                        riscos: r.RISCOS || r.AGENTES || 'AUSÊNCIA DE RISCOS ESPECÍFICOS',
                        medicoDestino: parceiroNome,
                        status: "AGUARDANDO",
                        anamnese: null
                    });
                });
                renderFilaAso();
                alert(`✅ Sucesso! ${rows.length} ASOs enviados diretamente para a FILA DE ATENDIMENTO do ${parceiroNome}.\nOs campos estão abertos para edição do médico.`);
            } else {
                // Rota 2: Vai para o Módulo de Solicitação de Pedidos e Agendamento da Clínica
                let novosPedidos = [];
                rows.forEach((r, idx) => {
                    const pId = Date.now() + idx;
                    const nomeTrab = r.NOME || r.TRABALHADOR || r.EMPREGADO || `FUNCIONÁRIO ${idx+1}`;
                    const cpfTrab = r.CPF || "000.000.000-00";
                    const trabCompleto = `${nomeTrab} - ${cpfTrab}`;
                    const objPed = r.TIPO || r.EXAME || r.OBJETO || "ASO PERIÓDICO";

                    const pedidoItem = {
                        id: pId,
                        fecha: new Date().toLocaleDateString('pt-BR'),
                        cliente: String(r.CLIENTE || clientePadrao).toUpperCase(),
                        trab: trabCompleto,
                        obj: objPed,
                        qtd: 1,
                        valor: "85,00",
                        clinica: parceiroNome,
                        respostaAgendamento: "Aguardando confirmação de horário na clínica",
                        status: "PENDENTE"
                    };
                    monitorRequestsData.unshift(pedidoItem);
                    novosPedidos.push(pedidoItem);
                });

                salvarPedidosLocalStorage();
                if (supabaseClient && novosPedidos.length > 0) {
                    try {
                        await supabaseClient.from('pedidos_agendamento').upsert(novosPedidos.map(p => ({
                            id: Math.floor(Number(p.id)),
                            fecha: p.fecha,
                            cliente: p.cliente,
                            trab: p.trab,
                            obj: p.obj,
                            qtd: p.qtd,
                            valor: p.valor,
                            clinica: p.clinica,
                            resposta_agendamento: p.respostaAgendamento,
                            status: p.status
                        })));
                    } catch(e){}
                }
                renderMonitorTable();
                renderProducaoTable();
                alert(`✅ Sucesso! ${rows.length} pedidos de agendamento encaminhados para a clínica ${parceiroNome}.`);
            }
        } catch(err) {
            console.error("Erro na carga:", err);
            alert("Erro ao processar planilha de pedidos.");
        } finally {
            evt.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
};

// Solicitação Avulsa Manual
window.verificarExameOutro = function() {
    const sel = document.getElementById('ped_objeto');
    const inp = document.getElementById('ped_objeto_custom');
    if (sel && inp) {
        if (sel.value === 'OUTRO') {
            inp.disabled = false;
            inp.classList.remove('bg-slate-100');
            inp.classList.add('bg-white');
            inp.focus();
        } else {
            inp.disabled = true;
            inp.value = '';
            inp.classList.add('bg-slate-100');
        }
    }
};

window.addOrderItem = function() {
    const trab = document.getElementById('ped_trab_cpf').value.trim();
    const selObj = document.getElementById('ped_objeto').value;
    const customObj = document.getElementById('ped_objeto_custom').value.trim();
    const obj = selObj === 'OUTRO' ? customObj : selObj;
    const qtd = document.getElementById('ped_qtd').value;
    const valor = document.getElementById('ped_valor').value;

    if (!trab || !obj) return alert("Preencha Trabalhador e Objeto Solicitado.");

    orderItemsList.push({ trab, obj, qtd, valor });
    renderOrderTable();
    document.getElementById('ped_trab_cpf').value = '';
};

window.renderOrderTable = function() {
    const tbody = document.getElementById('pedidos-current-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (orderItemsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-slate-400 italic">Nenhum item adicionado ao pedido atual.</td></tr>';
        return;
    }
    orderItemsList.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "border-b";
        tr.innerHTML = `
            <td class="p-2 font-bold">${item.trab}</td>
            <td class="p-2 font-bold text-blue-900">${item.obj}</td>
            <td class="p-2 text-center font-bold">${item.qtd}</td>
            <td class="p-2 text-center col-valor-sigilo font-bold text-emerald-700">R$ ${item.valor}</td>
            <td class="p-2 text-center"><button onclick="orderItemsList.splice(${index}, 1); renderOrderTable();" class="text-red-600 font-bold">✕</button></td>
        `;
        tbody.appendChild(tr);
    });
};

window.dispatchOrder = async function() {
    if (orderItemsList.length === 0) return alert("Adicione itens ao pedido!");
    const tipoDestino = document.getElementById('ped_destino_tipo')?.value;
    const parceiroNome = document.getElementById('ped_destino_parceiro')?.value || 'PARCEIRO NÃO INFORMADO';
    const activeCli = document.getElementById('active-cliente-select')?.value || 'CLIENTE';
    const clienteNome = activeCli === 'ALL' ? (clientesCadastrados[0]?.nome || 'CLIENTE') : activeCli;

    if (tipoDestino === 'MEDICO_INDEPENDENTE') {
        // Envia direto para a Fila de Atendimento do ASO
        orderItemsList.forEach(item => {
            const partes = item.trab.split('-');
            asoQueueData.unshift({
                id: Date.now() + Math.floor(Math.random() * 10000),
                nome: (partes[0] ? partes[0].trim() : item.trab).toUpperCase(),
                cpf: partes[1] ? partes[1].trim() : "000.000.000-00",
                nasc: '',
                matricula: '-',
                cliente: clienteNome,
                cargo: "OPERACIONAL",
                funcao: "OPERACIONAL",
                lotacao: "OPERACIONAL",
                tipo: item.obj,
                riscos: 'AUSÊNCIA DE RISCOS ESPECÍFICOS',
                medicoDestino: parceiroNome,
                status: "AGUARDANDO",
                anamnese: null
            });
        });
        renderFilaAso();
        alert(`✅ Pedidos despachados diretamente para a Fila de Atendimento do ${parceiroNome}!`);
    } else {
        // Envia para o Monitor de Agendamento da Clínica
        let novos = [];
        orderItemsList.forEach(item => {
            const pId = Date.now() + Math.floor(Math.random() * 10000);
            const obj = {
                id: pId,
                fecha: new Date().toLocaleDateString('pt-BR'),
                cliente: clienteNome,
                trab: item.trab,
                obj: item.obj,
                qtd: parseInt(item.qtd) || 1,
                valor: item.valor || '0,00',
                clinica: parceiroNome,
                respostaAgendamento: "Aguardando confirmação de horário na clínica",
                status: "PENDENTE"
            };
            monitorRequestsData.unshift(obj);
            novos.push(obj);
        });

        salvarPedidosLocalStorage();
        if (supabaseClient && novos.length > 0) {
            try {
                await supabaseClient.from('pedidos_agendamento').upsert(novos.map(p => ({
                    id: Math.floor(Number(p.id)),
                    fecha: p.fecha,
                    cliente: p.cliente,
                    trab: p.trab,
                    obj: p.obj,
                    qtd: p.qtd,
                    valor: p.valor,
                    clinica: p.clinica,
                    resposta_agendamento: p.respostaAgendamento,
                    status: p.status
                })));
            } catch(e){}
        }
        renderMonitorTable();
        renderProducaoTable();
        alert(`✅ Solicitação de agendamento despachada para a clínica ${parceiroNome}!`);
    }

    orderItemsList = [];
    renderOrderTable();
};

// TECLA APAGAR INDIVIDUAL DA TABELA DE PEDIDOS
window.apagarPedidoIndividual = async function(id) {
    if (!confirm("Deseja apagar este pedido de agendamento?")) return;
    monitorRequestsData = monitorRequestsData.filter(p => p.id !== id);
    salvarPedidosLocalStorage();
    renderMonitorTable();
    renderProducaoTable();

    if (supabaseClient) {
        try { await supabaseClient.from('pedidos_agendamento').delete().eq('id', id); } catch(e){}
    }
};

// TECLA APAGAR TODOS OS PEDIDOS ACUMULADOS
window.limparPedidosAgendamentoSelecionados = async function() {
    if (!confirm("Deseja realmente apagar TODOS os pedidos acumulados de agendamento?")) return;
    monitorRequestsData = [];
    salvarPedidosLocalStorage();
    renderMonitorTable();
    renderProducaoTable();

    if (supabaseClient) {
        try { await supabaseClient.from('pedidos_agendamento').delete().neq('id', 0); } catch(e){}
    }
    alert("✅ Todos os pedidos de agendamento foram apagados com sucesso!");
};

function salvarPedidosLocalStorage() {
    try { localStorage.setItem('boreal_pedidos_agendamento', JSON.stringify(monitorRequestsData)); } catch(e){}
}
function carregarPedidosLocalStorage() {
    try {
        const raw = localStorage.getItem('boreal_pedidos_agendamento');
        if (raw) monitorRequestsData = JSON.parse(raw);
    } catch(e){}
}

// 5. MÓDULO 2 & 3: FILA DO ASO E BANCO DE ASOS DEFINITIVO
window.salvarAsoAvulso = function() {
    const nome = document.getElementById('avulso_nome').value.trim();
    const cpf = document.getElementById('avulso_cpf').value.trim();
    const cliente = document.getElementById('avulso_cliente').value;
    const tipo = document.getElementById('avulso_tipo').value;

    if (!nome || !cpf) return alert("Preencha Nome e CPF.");

    asoQueueData.unshift({
        id: Date.now(),
        nome, cpf, cliente,
        cargo: "OPERACIONAL",
        funcao: "OPERACIONAL",
        lotacao: "OPERACIONAL",
        tipo,
        status: "AGUARDANDO",
        anamnese: null
    });

    renderFilaAso();
    fecharModal('modal-novo-aso-avulso');
    document.getElementById('avulso_nome').value = '';
    document.getElementById('avulso_cpf').value = '';
};

window.renderFilaAso = function() {
    const tbody = document.getElementById('aso-queue-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    asoQueueData.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2.5 font-bold">${item.nome}<br><span class="text-slate-500 font-normal">${item.cpf}</span></td>
            <td class="p-2.5">${item.cliente}</td>
            <td class="p-2.5 font-bold">${item.cargo}</td>
            <td class="p-2.5 font-bold text-blue-900">${item.tipo}</td>
            <td class="p-2.5 text-center">
                <button onclick="abrirAnamneseModal(${item.id})" class="bg-indigo-700 hover:bg-indigo-800 text-white px-2.5 py-1 rounded font-bold text-[11px] shadow">
                    📋 ${item.anamnese ? 'Ficha Salva (Editar)' : 'Preencher Anamnese'}
                </button>
            </td>
            <td class="p-2.5 text-center">
                <button onclick="abrirAsoModalBoreal(${item.id})" class="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded font-extrabold text-[11px] shadow">
                    🩺 Abrir & Editar ASO Boreal
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.abrirAsoModalBoreal = function(id) {
    selectedAsoId = id;
    const item = asoQueueData.find(x => x.id === id);
    if (!item) return;

    if (document.getElementById('aso_edit_nome')) document.getElementById('aso_edit_nome').value = item.nome || '';
    if (document.getElementById('aso_edit_cpf')) document.getElementById('aso_edit_cpf').value = item.cpf || '';
    if (document.getElementById('aso_edit_razao')) document.getElementById('aso_edit_razao').value = item.cliente || '';
    if (document.getElementById('aso_edit_cargo')) document.getElementById('aso_edit_cargo').value = item.cargo || '';
    if (document.getElementById('aso_edit_funcao')) document.getElementById('aso_edit_funcao').value = item.funcao || item.cargo || '';
    if (document.getElementById('aso_edit_lotacao')) document.getElementById('aso_edit_lotacao').value = item.lotacao || 'OPERACIONAL';
    if (document.getElementById('aso_edit_matricula')) document.getElementById('aso_edit_matricula').value = item.matricula || '-';
    if (document.getElementById('aso_edit_nasc')) document.getElementById('aso_edit_nasc').value = item.nasc || '';
    if (document.getElementById('aso_doc_agentes_especificos')) document.getElementById('aso_doc_agentes_especificos').value = item.riscos || 'AUSÊNCIA DE RISCOS ESPECÍFICOS';
    if (document.getElementById('aso_edit_data')) document.getElementById('aso_edit_data').value = new Date().toLocaleDateString('pt-BR');

    const cli = clientesCadastrados.find(c => c.nome === item.cliente);
    if (cli && document.getElementById('aso_lbl_medico_pcmso')) {
        document.getElementById('aso_lbl_medico_pcmso').textContent = `${cli.medPcmso} — ${cli.crmPcmso}`;
    }

    document.getElementById('modal-aso').classList.remove('hidden');
};

// TRANSIÇÃO LIMPA: AO CONCLUIR, SOME DA FILA E FIXA NO BANCO DE ASOS
window.concluirEmissaoAsoBoreal = async function() {
    const item = asoQueueData.find(x => x.id === selectedAsoId);
    if (!item) return;

    const radioConclusao = document.querySelector('input[name="aso_conclusao"]:checked');
    const conclusaoTxt = radioConclusao ? radioConclusao.value : "Apto";

    const novoId = Date.now();
    const asoObj = {
        id: novoId,
        fecha: document.getElementById('aso_edit_data')?.value || new Date().toLocaleDateString('pt-BR'),
        local: document.getElementById('aso_edit_local')?.value || "Cidade de Atendimento",
        nome: document.getElementById('aso_edit_nome')?.value || item.nome,
        cpf: document.getElementById('aso_edit_cpf')?.value || item.cpf,
        nasc: document.getElementById('aso_edit_nasc')?.value || 'Não informada',
        matricula: document.getElementById('aso_edit_matricula')?.value || '-',
        cliente: document.getElementById('aso_edit_razao')?.value || item.cliente,
        cargo: document.getElementById('aso_edit_cargo')?.value || item.cargo,
        funcao: document.getElementById('aso_edit_funcao')?.value || item.funcao || item.cargo,
        lotacao: document.getElementById('aso_edit_lotacao')?.value || item.lotacao || 'OPERACIONAL',
        cnpj: document.getElementById('aso_edit_cnpj')?.value || '00.000.000/0001-00',
        tipoExame: item.tipo || 'ASO CLÍNICO',
        origem: "SISTEMA_BOREAL",
        resultado: conclusaoTxt.toUpperCase(),
        medico: document.getElementById('aso_med_nome')?.value || "DR. MÉDICO EXAMINADOR",
        medicoPcmso: document.getElementById('aso_lbl_medico_pcmso')?.textContent || "-",
        agentes: document.getElementById('aso_doc_agentes_especificos')?.value || 'AUSÊNCIA DE RISCOS ESPECÍFICOS',
        arquivoAssinadoUrl: null,
        arquivoAssinadoNome: null,
        anamneseDados: item.anamnese || null
    };

    // 1. Grava no Banco Permanente
    asoHistoryData.unshift(asoObj);
    salvarBancoAsoLocal();

    // 2. Remove imediatamente da Fila de ASO
    asoQueueData = asoQueueData.filter(x => x.id !== selectedAsoId);

    // 3. Salva no Supabase
    if (supabaseClient) {
        try {
            await supabaseClient.from('asos').upsert([{
                id: asoObj.id,
                fecha: asoObj.fecha,
                local: asoObj.local,
                nome: asoObj.nome,
                cpf: asoObj.cpf,
                nasc: asoObj.nasc,
                matricula: asoObj.matricula,
                cliente: asoObj.cliente,
                cargo: asoObj.cargo,
                funcao: asoObj.funcao,
                lotacao: asoObj.lotacao,
                cnpj: asoObj.cnpj,
                tipo_exame: asoObj.tipoExame,
                origem: asoObj.origem,
                resultado: asoObj.resultado,
                medico: asoObj.medico,
                medico_pcmso: asoObj.medicoPcmso,
                agentes: asoObj.agentes,
                anamnese_dados: asoObj.anamneseDados
            }]);
        } catch(eDb){}
    }

    renderFilaAso();
    renderHistoryTabela();
    fecharModal('modal-aso');
    alert("✅ ASO emitido com sucesso!\nO documento foi transferido para o Banco de ASOs e removido da Fila.");
};

function salvarBancoAsoLocal() {
    try { localStorage.setItem('boreal_banco_asos', JSON.stringify(asoHistoryData)); } catch(e){}
}
function carregarBancoAsoLocal() {
    try {
        const raw = localStorage.getItem('boreal_banco_asos');
        if (raw) asoHistoryData = JSON.parse(raw);
    } catch(e){}
}

window.renderHistoryTabela = function() {
    const tbody = document.getElementById('aso-history-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';

    asoHistoryData
        .filter(h => activeCli === 'ALL' || h.cliente === activeCli)
        .forEach(h => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50";
            tr.innerHTML = `
                <td class="p-2.5 text-xs">${h.fecha}</td>
                <td class="p-2.5 font-bold text-xs">${h.nome}<br><span class="text-slate-500 font-normal">${h.cpf}</span></td>
                <td class="p-2.5 font-bold text-xs">${h.cliente}</td>
                <td class="p-2.5 text-center"><span class="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded text-[11px]">${h.resultado}</span></td>
                <td class="p-2.5 font-bold text-xs">${h.medico}</td>
                <td class="p-2.5 text-center">
                    <button onclick="visualizarAnamneseAnexada(${h.id})" class="bg-indigo-100 text-indigo-900 px-2 py-1 rounded font-bold text-[11px] shadow-sm">📋 Anamnese (PDF)</button>
                </td>
                <td class="p-2.5 text-center">
                    <button onclick="visualizarAsoAnexado(${h.id})" class="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded font-bold text-[11px] shadow">📄 Abrir ASO A4</button>
                </td>
                <td class="p-2.5 text-center">
                    ${currentRole === 'GESTOR' ? `<button onclick="apagarAsoPermanente(${h.id})" class="text-red-600 font-bold hover:underline text-xs">🗑️ Apagar</button>` : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });
};

window.apagarAsoPermanente = async function(id) {
    if (currentRole !== 'GESTOR') return alert("Somente o Gestor pode apagar ASOs do banco!");
    if (!confirm("Tem certeza que deseja apagar permanentemente este ASO?")) return;

    asoHistoryData = asoHistoryData.filter(h => h.id !== id);
    salvarBancoAsoLocal();
    renderHistoryTabela();

    if (supabaseClient) {
        try { await supabaseClient.from('asos').delete().eq('id', id); } catch(e){}
    }
};

// 6. VISUALIZAÇÃO E IMPRESSÃO COM TÍTULOS CORRETOS
window.visualizarAsoAnexado = function(id) {
    const item = asoHistoryData.find(x => x.id === id);
    if (!item) return;

    const paper = document.getElementById('aso-paper-visualizar');
    const modalTitulo = document.getElementById('modal-visualizar-titulo');
    if (modalTitulo) modalTitulo.textContent = "📄 ATESTADO DE SAÚDE OCUPACIONAL - ASO";

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
                <span>EMPREGADOR: ${item.cliente}</span>
                <span>DATA: ${item.fecha}</span>
            </div>

            <div class="border border-black p-2.5 space-y-1 text-[11px]">
                <strong class="block border-b border-black font-extrabold uppercase text-[10px] pb-0.5">IDENTIFICAÇÃO DO TRABALHADOR</strong>
                <div class="grid grid-cols-2 gap-x-2 pt-0.5">
                    <div><strong>NOME:</strong> ${item.nome}</div>
                    <div><strong>CPF:</strong> ${item.cpf}</div>
                    <div><strong>FUNÇÃO / CARGO:</strong> ${item.cargo}</div>
                    <div><strong>SETOR:</strong> ${item.lotacao || '-'}</div>
                    <div><strong>TIPO DE EXAME:</strong> ${item.tipoExame}</div>
                    <div><strong>CONCLUSÃO MÉDICA:</strong> <span class="font-extrabold text-emerald-800">${item.resultado}</span></div>
                </div>
            </div>

            <div class="border border-black p-2.5 text-[11px] bg-slate-50">
                <strong class="font-black text-xs uppercase block mb-1">RISCOS OCUPACIONAIS:</strong>
                <p class="font-semibold">${item.agentes || 'AUSÊNCIA DE RISCOS'}</p>
            </div>

            <div class="border border-black p-3 text-center space-y-3 text-[11px] bg-white mt-3">
                <div class="grid grid-cols-2 gap-6 border-t border-black pt-3 items-end">
                    <div>
                        <div class="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <strong class="block text-[11px] uppercase">Assinatura do Trabalhador</strong>
                        <span class="text-[10px] text-slate-600 block mt-0.5">Data: ${item.fecha}</span>
                    </div>
                    <div>
                        <div class="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <strong class="block text-[11px] uppercase">${item.medico}</strong>
                        <span class="text-[10px] text-slate-600 block mt-0.5">Médico(a) Examinador(a)</span>
                    </div>
                </div>
            </div>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado').classList.remove('hidden');
};

// 7. MÓDULO 5: HOMOLOGAÇÃO MANUAL SALVA NO SUPABASE
window.adicionarHomologacaoDireta = async function() {
    try {
        const trabInput = document.getElementById('hom_top_trab');
        const trab = trabInput ? trabInput.value.trim() : '';
        const setor = document.getElementById('hom_top_setor')?.value.trim() || 'OPERACIONAL';
        const cargo = document.getElementById('hom_top_cargo')?.value.trim() || '-';
        const dias = parseInt(document.getElementById('hom_top_dias')?.value) || 1;
        const cid = document.getElementById('hom_top_cid')?.value.trim() || 'A DEFINIR';
        const medInput = document.getElementById('hom_top_medico');
        let medico = medInput && medInput.value.trim() !== '' ? medInput.value.trim() : 'DR. EMISSOR';

        const empInput = document.getElementById('hom_top_empresa');
        let clienteNome = empInput && empInput.value.trim() !== '' ? empInput.value.trim() : '';
        if (!clienteNome) {
            clienteNome = document.getElementById('active-cliente-select')?.value || 'CLIENTE';
        }
        if (clienteNome === 'ALL') clienteNome = clientesCadastrados[0]?.nome || 'CLIENTE';

        if (!trab) return alert("Por favor, preencha o Nome do Trabalhador.");

        const novoId = Date.now();
        const novoItem = {
            id: novoId,
            cliente: clienteNome,
            trab: trab,
            setor: setor,
            cargo: cargo,
            data: new Date().toLocaleDateString('pt-BR'),
            dias: dias,
            cid: cid,
            medico: medico,
            status: "PENDENTE DE HOMOLOGAÇÃO",
            parecerTexto: "",
            medicoHomologador: "DR. MÉDICO HOMOLOGADOR",
            crmHomologador: "CRM SP 000000",
            arquivoNome: tempFileAtestadoTop ? tempFileAtestadoTop.nome : "Atestado.pdf",
            arquivoUrl: tempFileAtestadoTop ? tempFileAtestadoTop.url : "#",
            ativo: true
        };

        atestadosHomologacaoData.unshift(novoItem);
        tempFileAtestadoTop = null;
        renderHomologacaoTabela();

        if (supabaseClient) {
            await supabaseClient.from('atestados_homologacao').upsert([{
                id: novoItem.id,
                cliente: novoItem.cliente,
                trab: novoItem.trab,
                setor: novoItem.setor,
                cargo: novoItem.cargo,
                data: novoItem.data,
                dias: novoItem.dias,
                cid: novoItem.cid,
                medico: novoItem.medico,
                status: novoItem.status,
                parecer_texto: "",
                medico_homologador: novoItem.medicoHomologador,
                crm_homologador: novoItem.crmHomologador,
                arquivo_nome: novoItem.arquivoNome,
                arquivo_url: novoItem.arquivoUrl,
                ativo: true
            }]);
        }

        if (trabInput) trabInput.value = '';
        alert("✅ Atestado relacionado com sucesso e sincronizado em nuvem!");
    } catch(e){
        alert("Erro ao adicionar atestado.");
    }
};

window.visualizarLaudoHomologacao = function(id) {
    const item = atestadosHomologacaoData.find(x => x.id === id);
    if (!item) return;

    const paper = document.getElementById('aso-paper-visualizar');
    const modalTitulo = document.getElementById('modal-visualizar-titulo');
    if (modalTitulo) modalTitulo.textContent = "📄 PARECER DE HOMOLOGAÇÃO DE ATESTADO MÉDICO";

    if (paper) {
        paper.className = "bg-white p-6 max-w-4xl mx-auto text-slate-900 border-2 border-black shadow-2xl text-[12px] leading-snug space-y-3 folha-homologacao-print";
        paper.innerHTML = `
            <div class="border-b-2 border-black pb-2 flex justify-between items-center">
                <div>
                    <strong class="text-sm block font-black uppercase text-blue-950">Boreal Engenharia e Medicina</strong>
                    <span class="text-[10px] text-slate-600 font-semibold">CRM Nº 1011385 | Tel. (19) 99156-7153</span>
                </div>
                <div class="text-right">
                    <strong class="text-sm font-black uppercase tracking-tight">PARECER DE HOMOLOGAÇÃO DE ATESTADO MÉDICO</strong>
                </div>
            </div>

            <div class="border border-black p-2 bg-slate-100 font-bold uppercase text-[10px] flex justify-between">
                <span>EMPRESA CLIENTE: ${item.cliente}</span>
                <span>DATA: ${new Date().toLocaleDateString('pt-BR')}</span>
            </div>

            <div class="border border-black p-2.5 space-y-1 text-[11px]">
                <strong class="block border-b border-black font-extrabold uppercase text-[10px] pb-0.5">DADOS DO EMPREGADO E DO ATESTADO</strong>
                <div class="grid grid-cols-2 gap-x-2 pt-0.5">
                    <div><strong>TRABALHADOR:</strong> ${item.trab}</div>
                    <div><strong>SETOR:</strong> ${item.setor}</div>
                    <div><strong>FUNÇÃO:</strong> ${item.cargo}</div>
                    <div><strong>TEMPO SOLICITADO:</strong> ${item.dias} DIA(S)</div>
                    <div><strong>CID-10:</strong> ${item.cid}</div>
                    <div><strong>MÉDICO EMISSOR:</strong> ${item.medico}</div>
                </div>
            </div>

            <div class="border border-black p-3 text-[11px] bg-purple-50">
                <strong class="font-black text-xs uppercase block mb-1">PARECER MÉDICO: ${item.status}</strong>
                <p class="font-semibold leading-relaxed">${item.parecerTexto || "Atestado submetido à conferência técnica ocupacional e homologado com parecer favorável."}</p>
            </div>

            <div class="border border-black p-3 text-center space-y-3 text-[11px] bg-slate-50 mt-3">
                <div class="grid grid-cols-2 gap-6 border-t border-black pt-3 items-end">
                    <div>
                        <div class="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <strong class="block text-[11px] uppercase">Ciente do Empregado</strong>
                        <span class="text-[10px] text-slate-600 block mt-0.5">Data: ${item.data}</span>
                    </div>
                    <div>
                        <div class="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <strong class="block text-[11px] uppercase">${item.medicoHomologador}</strong>
                        <span class="text-[10px] text-slate-600 block mt-0.5">Médico Ocupacional Homologador</span>
                    </div>
                </div>
            </div>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado').classList.remove('hidden');
};

window.renderHomologacaoTabela = function() {
    const tbody = document.getElementById('atestados-homologacao-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';

    atestadosHomologacaoData
        .filter(a => activeCli === 'ALL' || a.cliente === activeCli)
        .forEach(a => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50";
            tr.innerHTML = `
                <td class="p-2 font-bold">${a.cliente}</td>
                <td class="p-2 font-bold">${a.trab}</td>
                <td class="p-2">${a.setor}</td>
                <td class="p-2">${a.cargo}</td>
                <td class="p-2">${a.data}</td>
                <td class="p-2 text-center font-bold">${a.dias} dias</td>
                <td class="p-2 text-center font-bold text-purple-900">${a.cid}</td>
                <td class="p-2">${a.medico}</td>
                <td class="p-2 text-center"><span class="bg-indigo-50 border px-1.5 py-0.5 rounded text-[10px]">📄 Original</span></td>
                <td class="p-2 text-center"><span class="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold text-[10px]">${a.status}</span></td>
                <td class="p-2 text-center">
                    <button onclick="visualizarLaudoHomologacao(${a.id})" class="bg-purple-800 hover:bg-purple-900 text-white px-2 py-1 rounded text-[10px] font-bold shadow">
                        🩺 Parecer
                    </button>
                </td>
                <td class="p-2 text-center">
                    ${currentRole === 'GESTOR' ? `<button onclick="apagarHomologacao(${a.id})" class="text-red-600 font-bold hover:underline text-[10px]">🗑️ Apagar</button>` : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });
};

window.apagarHomologacao = async function(id) {
    if (currentRole !== 'GESTOR') return alert("Somente o Gestor pode apagar!");
    if (!confirm("Deseja apagar este registro de afastamento?")) return;

    atestadosHomologacaoData = atestadosHomologacaoData.filter(a => a.id !== id);
    renderHomologacaoTabela();

    if (supabaseClient) {
        try { await supabaseClient.from('atestados_homologacao').delete().eq('id', id); } catch(e){}
    }
};

// 8. MÓDULO 10: MATRIZ DE VÍNCULOS COMERCIAIS COM CÉLULA DE QUANTIDADE EDITÁVEL
window.calcularTotalVinculo = function() {
    const qtd = parseFloat(document.getElementById('vinc_qtd')?.value) || 1;
    const unit = parseFloat(document.getElementById('vinc_unit')?.value) || 0;
    const totalEl = document.getElementById('vinc_total');
    if (totalEl) totalEl.value = `R$ ${(qtd * unit).toFixed(2)}`;
};

window.atualizarListaParceirosVinculo = function() {
    const tipo = document.getElementById('vinc_tipo_select')?.value;
    const selParceiro = document.getElementById('vinc_parceiro_select');
    if (!selParceiro) return;
    selParceiro.innerHTML = '';

    if (tipo === 'CLINICA') {
        clinicasCadastradas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome; opt.innerText = c.nome;
            selParceiro.appendChild(opt);
        });
    } else {
        medicosCadastrados.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.nome; opt.innerText = `${m.nome} (${m.crm || ''})`;
            selParceiro.appendChild(opt);
        });
    }
};

window.salvarNovoVinculoComercial = async function() {
    const cli = document.getElementById('vinc_cli_select')?.value;
    const tipo = document.getElementById('vinc_tipo_select')?.value;
    const parceiro = document.getElementById('vinc_parceiro_select')?.value;
    const objeto = document.getElementById('vinc_objeto')?.value.trim();
    const qtd = parseFloat(document.getElementById('vinc_qtd')?.value) || 1;
    const unit = parseFloat(document.getElementById('vinc_unit')?.value) || 0;

    if (!cli || !parceiro || !objeto) return alert("Preencha Cliente, Parceiro e Objeto.");

    const novoVinc = {
        id: Date.now(),
        cliente_nome: cli,
        tipo_vinculo: tipo,
        entidade_nome: parceiro,
        objeto: objeto,
        quantidade_solicitada: qtd,
        quantidade_real: qtd,
        valor_unitario: unit,
        valor_total: qtd * unit,
        ativo: true
    };

    let vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    vinculos.push(novoVinc);
    localStorage.setItem('boreal_vinculos_db', JSON.stringify(vinculos));

    if (supabaseClient) {
        try {
            await supabaseClient.from('vinculos_comerciais').upsert([{
                id: novoVinc.id,
                cliente_nome: novoVinc.cliente_nome,
                tipo_vinculo: novoVinc.tipo_vinculo,
                entidade_nome: novoVinc.entidade_nome,
                objeto: novoVinc.objeto,
                valor_unitario: novoVinc.valor_unitario,
                ativo: true
            }]);
        } catch(e){}
    }

    renderTabelaVinculos();
    renderProducaoTable();
    document.getElementById('vinc_objeto').value = '';
    alert("✅ Novo vínculo e ordem de serviço comercial gravados com sucesso!");
};

window.alterarQtdRealVinculo = function(idx, novaQtd) {
    let vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    if (!vinculos[idx]) return;

    const valQtd = parseFloat(novaQtd) || 0;
    vinculos[idx].quantidade_real = valQtd;
    vinculos[idx].valor_total = valQtd * Number(vinculos[idx].valor_unitario || 0);

    localStorage.setItem('boreal_vinculos_db', JSON.stringify(vinculos));
    renderTabelaVinculos();
    renderProducaoTable();
};

window.renderTabelaVinculos = function() {
    const tbody = document.getElementById('tabela-vinculos-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    vinculos.forEach((v, index) => {
        const qtdReal = v.quantidade_real !== undefined ? v.quantidade_real : (v.quantidade || 1);
        const subtotal = Number(qtdReal) * Number(v.valor_unitario || 0);

        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2 font-bold">${v.cliente_nome}</td>
            <td class="p-2">${v.tipo_vinculo}</td>
            <td class="p-2 font-bold text-slate-900">${v.entidade_nome}</td>
            <td class="p-2 font-semibold text-blue-900">${v.objeto}</td>
            <td class="p-2 text-center bg-amber-50/70 border-x">
                <input type="number" min="0" value="${qtdReal}" onchange="alterarQtdRealVinculo(${index}, this.value)" class="w-16 border rounded p-1 text-center font-black text-amber-950 bg-white shadow-sm">
            </td>
            <td class="p-2 text-right">R$ ${Number(v.valor_unitario).toFixed(2)}</td>
            <td class="p-2 text-right font-extrabold text-emerald-800">R$ ${subtotal.toFixed(2)}</td>
            <td class="p-2 text-center">
                <button onclick="removerVinculo(${index})" class="text-rose-600 font-bold hover:underline">Apagar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.removerVinculo = function(idx) {
    if (!confirm("Deseja apagar este vínculo comercial?")) return;
    let vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    vinculos.splice(idx, 1);
    localStorage.setItem('boreal_vinculos_db', JSON.stringify(vinculos));
    renderTabelaVinculos();
    renderProducaoTable();
};

// 9. MÓDULO 8: RELATÓRIO DA POSIÇÃO FINANCEIRA CONSOLIDADA (CLÍNICAS + MÉDICOS EXECUTADOS)
window.renderProducaoTable = function() {
    const tbody = document.getElementById('relatorio-producao-tbody');
    const totalEl = document.getElementById('valor-soma-total-producao');
    if (!tbody) return;
    tbody.innerHTML = '';
    let somaTotal = 0;

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';

    // 1. Linhas das Clínicas (vindos dos agendamentos)
    monitorRequestsData
        .filter(r => activeCli === 'ALL' || r.cliente === activeCli)
        .forEach(r => {
            const unit = parseFloat(String(r.valor).replace(',', '.')) || 0;
            const tot = (parseInt(r.qtd) || 1) * unit;
            somaTotal += tot;

            const tr = document.createElement('tr');
            tr.className = "border-b";
            tr.innerHTML = `
                <td class="p-2.5 font-bold text-sky-800">CLÍNICA (AGENDAMENTO)</td>
                <td class="p-2.5 font-bold">${r.clinica}</td>
                <td class="p-2.5">${r.cliente}</td>
                <td class="p-2.5 font-bold text-blue-900">${r.obj}</td>
                <td class="p-2.5 text-center font-bold">${r.qtd}</td>
                <td class="p-2.5 text-center col-valor-sigilo font-bold">R$ ${r.valor}</td>
                <td class="p-2.5 text-center col-valor-sigilo font-bold text-emerald-600">R$ ${tot.toFixed(2).replace('.', ',')}</td>
            `;
            tbody.appendChild(tr);
        });

    // 2. Linhas dos Médicos e Contratos Executados (vindos dos Vínculos Comerciais)
    const vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    vinculos
        .filter(v => activeCli === 'ALL' || v.cliente_nome === activeCli)
        .forEach(v => {
            const qtdReal = v.quantidade_real !== undefined ? v.quantidade_real : (v.quantidade || 1);
            const tot = Number(qtdReal) * Number(v.valor_unitario || 0);
            somaTotal += tot;

            const tr = document.createElement('tr');
            tr.className = "border-b bg-amber-50/20";
            tr.innerHTML = `
                <td class="p-2.5 font-bold text-indigo-800">MÉDICO / VÍNCULO DIRETO</td>
                <td class="p-2.5 font-bold">${v.entidade_nome}</td>
                <td class="p-2.5">${v.cliente_nome}</td>
                <td class="p-2.5 font-bold text-purple-900">${v.objeto}</td>
                <td class="p-2.5 text-center font-bold text-amber-950">${qtdReal}</td>
                <td class="p-2.5 text-center col-valor-sigilo font-bold">R$ ${Number(v.valor_unitario).toFixed(2)}</td>
                <td class="p-2.5 text-center col-valor-sigilo font-extrabold text-emerald-700">R$ ${tot.toFixed(2).replace('.', ',')}</td>
            `;
            tbody.appendChild(tr);
        });

    if (totalEl) totalEl.textContent = `R$ ${somaTotal.toFixed(2).replace('.', ',')}`;
};

// 10. CADASTROS: CLIENTES, CLÍNICAS E MÉDICOS
window.salvarNovoCliente = async function() {
    if (currentRole !== 'GESTOR') return alert("Apenas o GESTOR realiza cadastros.");
    const nome = document.getElementById('cad_cli_nome').value.trim();
    const cnpj = document.getElementById('cad_cli_cnpj').value.trim();
    const tel = document.getElementById('cad_cli_tel').value.trim();
    const email = document.getElementById('cad_cli_email').value.trim();
    const end = document.getElementById('cad_cli_end').value.trim();
    const medPcmso = document.getElementById('cad_cli_med_pcmso').value.trim();
    const crmPcmso = document.getElementById('cad_cli_med_crm').value.trim();
    const medWhats = document.getElementById('cad_cli_med_whats').value.trim();
    const medEmail = document.getElementById('cad_cli_med_email').value.trim();

    if (!nome || !cnpj) return alert("Preencha Razão Social e CNPJ.");

    const id = Date.now();
    const novoCli = { id, nome, cnpj, tel, email, end, medPcmso, crmPcmso, medWhats, medEmail, ativo: true };
    clientesCadastrados.push(novoCli);
    salvarCadastrosLocalStorage();
    renderClientesTabela();
    atualizarDropdownsClientes();

    if (supabaseClient) {
        try {
            await supabaseClient.from('cadastros_clientes').upsert([{
                id, nome, cnpj, tel, email, endereco: end, med_pcmso: medPcmso, crm_pcmso: crmPcmso, med_whats: medWhats, med_email: medEmail, ativo: true
            }]);
        } catch(e){}
    }

    document.getElementById('cad_cli_nome').value = '';
    document.getElementById('cad_cli_cnpj').value = '';
    alert("Cliente salvo com sucesso!");
};

window.renderClientesTabela = function() {
    const tbody = document.getElementById('clientes-cadastrados-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    clientesCadastrados.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "border-b";
        tr.innerHTML = `
            <td class="p-2 font-bold">${c.nome}</td>
            <td class="p-2">${c.cnpj}</td>
            <td class="p-2">${c.tel}</td>
            <td class="p-2">${c.email || '-'}</td>
            <td class="p-2 font-bold text-blue-900">${c.medPcmso || '-'} (${c.crmPcmso || ''})</td>
            <td class="p-2 text-center"><button class="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">Avisar</button></td>
            <td class="p-2 text-center"><span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">ATIVO</span></td>
            <td class="p-2 text-center">
                ${currentRole === 'GESTOR' ? `<button onclick="apagarClienteCadastrado(${c.id})" class="text-xs text-red-600 font-bold hover:underline">Apagar</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.apagarClienteCadastrado = async function(id) {
    if (currentRole !== 'GESTOR') return;
    if (!confirm("Deseja apagar esta empresa?")) return;
    clientesCadastrados = clientesCadastrados.filter(c => c.id !== id);
    salvarCadastrosLocalStorage();
    renderClientesTabela();
    atualizarDropdownsClientes();
    if (supabaseClient) { try { await supabaseClient.from('cadastros_clientes').delete().eq('id', id); } catch(e){} }
};

window.salvarNovaClinica = async function() {
    if (currentRole !== 'GESTOR') return alert("Apenas o GESTOR cadastra clínicas.");
    const nome = document.getElementById('cad_clin_nome').value.trim();
    const cnpj = document.getElementById('cad_clin_cnpj').value.trim();
    const whats = document.getElementById('cad_clin_whats').value.trim();
    const email = document.getElementById('cad_clin_email').value.trim();
    const endereco = document.getElementById('cad_clin_endereco').value.trim();

    if (!nome) return alert("Preencha o nome da clínica.");

    const id = Date.now();
    const novaClin = { id, nome, cnpj, whats, email, endereco, ativo: true };
    clinicasCadastradas.push(novaClin);
    salvarCadastrosLocalStorage();
    renderClinicasTabela();
    atualizarDropdownsClinicas();

    if (supabaseClient) {
        try {
            await supabaseClient.from('cadastros_clinicas').upsert([{ id, nome, cnpj, whats, email, endereco, ativo: true }]);
        } catch(e){}
    }

    document.getElementById('cad_clin_nome').value = '';
    document.getElementById('cad_clin_endereco').value = '';
    alert("Clínica salva com sucesso!");
};

window.renderClinicasTabela = function() {
    const tbody = document.getElementById('clinicas-cadastradas-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    clinicasCadastradas.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "border-b";
        tr.innerHTML = `
            <td class="p-2 font-bold">${c.nome}</td>
            <td class="p-2">${c.cnpj}</td>
            <td class="p-2 font-semibold text-slate-600">${c.endereco || '-'}</td>
            <td class="p-2">${c.whats}</td>
            <td class="p-2">${c.email || '-'}</td>
            <td class="p-2 text-center"><span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">ATIVO</span></td>
            <td class="p-2 text-center">
                ${currentRole === 'GESTOR' ? `<button onclick="apagarClinicaCadastrada(${c.id})" class="text-xs text-red-600 font-bold hover:underline">Apagar</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.apagarClinicaCadastrada = async function(id) {
    if (currentRole !== 'GESTOR') return;
    if (!confirm("Deseja apagar esta clínica?")) return;
    clinicasCadastradas = clinicasCadastradas.filter(c => c.id !== id);
    salvarCadastrosLocalStorage();
    renderClinicasTabela();
    atualizarDropdownsClinicas();
    if (supabaseClient) { try { await supabaseClient.from('cadastros_clinicas').delete().eq('id', id); } catch(e){} }
};

window.salvarNovoMedico = async function() {
    if (currentRole !== 'GESTOR') return alert("Apenas o GESTOR cadastra médicos.");
    const nome = document.getElementById('cad_med_nome').value.trim();
    const crm = document.getElementById('cad_med_crm').value.trim();
    const rqe = document.getElementById('cad_med_rqe').value.trim();
    const tipo = document.getElementById('cad_med_tipo').value;
    const tel = document.getElementById('cad_med_tel').value.trim();
    const email = document.getElementById('cad_med_email').value.trim();

    if (!nome || !crm) return alert("Preencha Nome e CRM.");

    const id = Date.now();
    const novoMed = { id, nome, crm, rqe, tipo, tel, email, ativo: true };
    medicosCadastrados.push(novoMed);
    salvarCadastrosLocalStorage();
    renderMedicosTabela();

    if (supabaseClient) {
        try {
            await supabaseClient.from('cadastros_medicos').upsert([{ id, nome, crm, rqe, tipo, tel, email, ativo: true }]);
        } catch(e){}
    }

    document.getElementById('cad_med_nome').value = '';
    document.getElementById('cad_med_crm').value = '';
    alert("Médico salvo com sucesso!");
};

window.renderMedicosTabela = function() {
    const tbody = document.getElementById('medicos-cadastrados-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    medicosCadastrados.forEach(m => {
        const tr = document.createElement('tr');
        tr.className = "border-b";
        tr.innerHTML = `
            <td class="p-2 font-bold">${m.nome}</td>
            <td class="p-2 font-bold text-blue-900">${m.crm} ${m.rqe ? '('+m.rqe+')' : ''}</td>
            <td class="p-2"><span class="bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded text-[10px]">${m.tipo}</span></td>
            <td class="p-2">${m.tel}</td>
            <td class="p-2">${m.email}</td>
            <td class="p-2 text-center"><span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">ATIVO</span></td>
            <td class="p-2 text-center">
                ${currentRole === 'GESTOR' ? `<button onclick="apagarMedico(${m.id})" class="text-xs text-red-600 font-bold hover:underline">Apagar</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.apagarMedico = async function(id) {
    if (currentRole !== 'GESTOR') return;
    if (!confirm("Deseja apagar este médico?")) return;
    medicosCadastrados = medicosCadastrados.filter(m => m.id !== id);
    salvarCadastrosLocalStorage();
    renderMedicosTabela();
    if (supabaseClient) { try { await supabaseClient.from('cadastros_medicos').delete().eq('id', id); } catch(e){} }
};

function salvarCadastrosLocalStorage() {
    try {
        localStorage.setItem('boreal_cadastros_clientes', JSON.stringify(clientesCadastrados));
        localStorage.setItem('boreal_cadastros_clinicas', JSON.stringify(clinicasCadastradas));
        localStorage.setItem('boreal_cadastros_medicos', JSON.stringify(medicosCadastrados));
    } catch(e){}
}

function carregarCadastrosLocalStorage() {
    try {
        const rc = localStorage.getItem('boreal_cadastros_clientes');
        if (rc) clientesCadastrados = JSON.parse(rc);
        const rcl = localStorage.getItem('boreal_cadastros_clinicas');
        if (rcl) clinicasCadastradas = JSON.parse(rcl);
        const rm = localStorage.getItem('boreal_cadastros_medicos');
        if (rm) medicosCadastrados = JSON.parse(rm);
    } catch(e){}
}

function atualizarDropdownsClientes() {
    const s1 = document.getElementById('active-cliente-select');
    const s2 = document.getElementById('vinc_cli_select');
    const s3 = document.getElementById('avulso_cliente');

    if (s1) {
        s1.innerHTML = '<option value="ALL">TODOS OS CLIENTES</option>';
        clientesCadastrados.forEach(c => {
            const o = document.createElement('option');
            o.value = c.nome; o.innerText = c.nome;
            s1.appendChild(o);
        });
    }
    if (s2) {
        s2.innerHTML = '';
        clientesCadastrados.forEach(c => {
            const o = document.createElement('option');
            o.value = c.nome; o.innerText = c.nome;
            s2.appendChild(o);
        });
    }
    if (s3) {
        s3.innerHTML = '';
        clientesCadastrados.forEach(c => {
            const o = document.createElement('option');
            o.value = c.nome; o.innerText = c.nome;
            s3.appendChild(o);
        });
    }
}

function atualizarDropdownsClinicas() {
    const s = document.getElementById('ped_destino_parceiro');
    if (s && document.getElementById('ped_destino_tipo')?.value === 'CLINICA') {
        s.innerHTML = '';
        clinicasCadastradas.forEach(c => {
            const o = document.createElement('option');
            o.value = c.nome; o.innerText = c.nome;
            s.appendChild(o);
        });
    }
}

// 11. CARREGAMENTO DOS DADOS DO SUPABASE
async function carregarTodosDadosSupabase() {
    if (!supabaseClient) return;
    try {
        await Promise.all([
            carregarAsosDoBanco(),
            carregarHomologacaoDoBanco(),
            carregarPedidosDoBanco(),
            carregarCadastrosClientesDoBanco(),
            carregarCadastrosClinicasDoBanco(),
            carregarCadastrosMedicosDoBanco()
        ]);
    } catch(e){}
}

async function carregarAsosDoBanco() {
    try {
        const { data, error } = await supabaseClient.from('asos').select('*').order('id', { ascending: false });
        if (!error && data && data.length > 0) {
            asoHistoryData = data.map(d => ({
                id: d.id,
                fecha: d.fecha,
                local: d.local,
                nome: d.nome,
                cpf: d.cpf,
                nasc: d.nasc,
                matricula: d.matricula,
                cliente: d.cliente,
                cargo: d.cargo,
                funcao: d.funcao,
                lotacao: d.lotacao,
                cnpj: d.cnpj,
                tipoExame: d.tipo_exame,
                origem: d.origem,
                resultado: d.resultado,
                medico: d.medico,
                medicoPcmso: d.medico_pcmso,
                agentes: d.agentes,
                anamneseDados: d.anamnese_dados
            }));
            salvarBancoAsoLocal();
            renderHistoryTabela();
        }
    } catch(e){}
}

async function carregarHomologacaoDoBanco() {
    try {
        const { data, error } = await supabaseClient.from('atestados_homologacao').select('*').order('id', { ascending: false });
        if (!error && data && data.length > 0) {
            atestadosHomologacaoData = data.map(d => ({
                id: Number(d.id),
                cliente: d.cliente,
                trab: d.trab,
                setor: d.setor,
                cargo: d.cargo,
                data: d.data,
                dias: parseInt(d.dias) || 1,
                cid: d.cid,
                medico: d.medico,
                status: d.status,
                parecerTexto: d.parecer_texto || '',
                medicoHomologador: d.medico_homologador || 'DR. MÉDICO HOMOLOGADOR',
                crmHomologador: d.crm_homologador || 'CRM SP 000000',
                arquivoNome: d.arquivo_nome || 'Atestado.pdf',
                arquivoUrl: d.arquivo_url || '#',
                ativo: d.ativo !== false
            }));
            renderHomologacaoTabela();
        }
    } catch(e){}
}

async function carregarPedidosDoBanco() {
    try {
        const { data, error } = await supabaseClient.from('pedidos_agendamento').select('*').order('id', { ascending: false });
        if (!error && data && data.length > 0) {
            monitorRequestsData = data.map(d => ({
                id: Number(d.id),
                fecha: d.fecha,
                cliente: d.cliente,
                trab: d.trab,
                obj: d.obj,
                qtd: parseInt(d.qtd) || 1,
                valor: d.valor || '0,00',
                clinica: d.clinica,
                respostaAgendamento: d.resposta_agendamento || '',
                status: d.status || 'PENDENTE'
            }));
            salvarPedidosLocalStorage();
            renderMonitorTable();
            renderProducaoTable();
        }
    } catch(e){}
}

async function carregarCadastrosClientesDoBanco() {
    try {
        const { data, error } = await supabaseClient.from('cadastros_clientes').select('*');
        if (!error && data && data.length > 0) {
            clientesCadastrados = data.map(d => ({
                id: Number(d.id),
                nome: d.nome,
                cnpj: d.cnpj,
                tel: d.tel,
                email: d.email,
                end: d.endereco,
                medPcmso: d.med_pcmso,
                crmPcmso: d.crm_pcmso,
                medWhats: d.med_whats,
                medEmail: d.med_email,
                ativo: d.ativo !== false
            }));
            salvarCadastrosLocalStorage();
            renderClientesTabela();
            atualizarDropdownsClientes();
        }
    } catch(e){}
}

async function carregarCadastrosClinicasDoBanco() {
    try {
        const { data, error } = await supabaseClient.from('cadastros_clinicas').select('*');
        if (!error && data && data.length > 0) {
            clinicasCadastradas = data.map(d => ({
                id: Number(d.id),
                nome: d.nome,
                cnpj: d.cnpj,
                whats: d.whats,
                email: d.email,
                endereco: d.endereco,
                ativo: d.ativo !== false
            }));
            salvarCadastrosLocalStorage();
            renderClinicasTabela();
            atualizarDropdownsClinicas();
        }
    } catch(e){}
}

async function carregarCadastrosMedicosDoBanco() {
    try {
        const { data, error } = await supabaseClient.from('cadastros_medicos').select('*');
        if (!error && data && data.length > 0) {
            medicosCadastrados = data.map(d => ({
                id: Number(d.id),
                nome: d.nome,
                crm: d.crm,
                rqe: d.rqe,
                tipo: d.tipo,
                tel: d.tel,
                email: d.email,
                ativo: d.ativo !== false
            }));
            salvarCadastrosLocalStorage();
            renderMedicosTabela();
        }
    } catch(e){}
}

// 12. FUNÇÕES DE SUPORTE
window.fecharModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
};

window.fecharModalVisualizacaoAso = function() {
    const el = document.getElementById('modal-visualizar-aso-anexado');
    if (el) el.classList.add('hidden');
};

window.abrirModalNovoAso = function() {
    document.getElementById('modal-novo-aso-avulso')?.classList.remove('hidden');
};

window.abrirModalPrimeiroAcesso = function() {
    document.getElementById('modal-primeiro-acesso')?.classList.remove('hidden');
};

window.fecharModalPrimeiroAcesso = function() {
    document.getElementById('modal-primeiro-acesso')?.classList.add('hidden');
};

window.alterarSenhaMaster = function() {
    const s = prompt("Digite a nova Senha Master:");
    if (s) alert("Senha Master redefinida com sucesso!");
};

window.alterarChaveGemini = function() {
    const k = prompt("Digite sua chave de API do Gemini:");
    if (k) localStorage.setItem('gemini_api_key', k.trim());
};

window.renderMonitorTable = function() {
    const tbody = document.getElementById('monitor-requests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    monitorRequestsData.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2">${r.fecha}</td>
            <td class="p-2 font-bold">${r.cliente}</td>
            <td class="p-2">${r.trab}</td>
            <td class="p-2 font-bold text-blue-900">${r.obj}</td>
            <td class="p-2 text-center font-bold">${r.qtd}</td>
            <td class="p-2 text-center col-valor-sigilo font-bold text-emerald-700">R$ ${r.valor}</td>
            <td class="p-2 font-bold">${r.clinica}</td>
            <td class="p-2 text-blue-950 font-semibold bg-blue-50/50">${r.respostaAgendamento}</td>
            <td class="p-2 text-center">
                <button onclick="apagarPedidoIndividual(${r.id})" class="text-rose-600 font-bold hover:underline text-xs flex items-center gap-1 mx-auto">
                    🗑️ Apagar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

function popularDropdownCid10() {
    const dl = document.getElementById('lista-cid10-homologacao');
    if (!dl) return;
    dl.innerHTML = `
        <option value="M54.5 - Dor lombar baixa (Lombalgia)">
        <option value="M54.2 - Cervicalgia">
        <option value="J06.9 - Infecção respiratória aguda">
        <option value="A09 - Gastroenterite">
        <option value="Z73.0 - Burnout">
    `;
}

function popularDropdownExamesPcmso() {
    const sel = document.getElementById('pcmso_add_exame');
    if (!sel) return;
    sel.innerHTML = `
        <option value="">-- Selecione o Exame --</option>
        <option value="CLÍNICO">CLÍNICO</option>
        <option value="AUDIOMETRIA">AUDIOMETRIA</option>
        <option value="ESPIROMETRIA">ESPIROMETRIA</option>
        <option value="ACUIDADE VISUAL">ACUIDADE VISUAL</option>
        <option value="ECG">ECG</option>
        <option value="HEMOGRAMA COMPLETO">HEMOGRAMA COMPLETO</option>
    `;
}

window.atualizarHeaderPcmsoMedico = function() {
    const sel = document.getElementById('active-cliente-select')?.value || 'ALL';
    const cli = clientesCadastrados.find(c => c.nome === sel);
    const lblMed = document.getElementById('pcmso_lbl_medico_nome');
    const lblCli = document.getElementById('pcmso_lbl_cliente_nome');
    if (lblCli) lblCli.textContent = sel;
    if (lblMed) lblMed.textContent = cli ? `${cli.medPcmso} (${cli.crmPcmso})` : "A DEFINIR NO CADASTRO";
};

window.formatarCidSelecionado = function(inp) {
    if (inp && inp.value.includes('-')) inp.value = inp.value.split('-')[0].trim().toUpperCase();
};

window.processarArquivoAtestadoTop = function(evt) {
    const f = evt.target.files[0];
    if (f) tempFileAtestadoTop = { nome: f.name, url: URL.createObjectURL(f) };
};

window.gerarLoteESocial = function() {
    const c = document.getElementById('esocial-preview-container');
    if (c) c.textContent = JSON.stringify({ evtMonit: { ideEmpregador: { cnpj: "00000000000000" }, registros: asoHistoryData } }, null, 2);
};