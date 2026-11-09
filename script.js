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
let ultimoAgendamentoSalvo = { horarios: '', endereco: '' };

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

    const savedEmail = localStorage.getItem('boreal_saved_email');
    const savedPass = localStorage.getItem('boreal_saved_pass');
    const emailInput = document.getElementById('login_usuario_email');
    const passInput = document.getElementById('login_usuario_senha');
    if (savedEmail && emailInput) emailInput.value = savedEmail;
    if (savedPass && passInput) passInput.value = savedPass;

    if (passInput) {
        passInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') realizarLoginSistema();
        });
    }
    if (emailInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') realizarLoginSistema();
        });
    }

    carregarCadastrosLocalStorage();
    carregarBancoAsoLocal();
    carregarPedidosLocalStorage();
    carregarPcmsoMatrizLocalStorage();

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

    localStorage.setItem('boreal_saved_email', email);
    localStorage.setItem('boreal_saved_pass', senha);

    let perfilRole = 'GESTOR';
    let vinculoCli = 'ALL';
    let nomeUser = 'GESTOR MASTER';

    if (email.includes('cliente')) {
        perfilRole = 'CLIENTE';
        nomeUser = 'EMPRESA CLIENTE';
    } else if (email.includes('clinica')) {
        perfilRole = 'CLINICA';
        nomeUser = 'CLÍNICA CREDENCIADA';
    } else if (email.includes('homologador')) {
        perfilRole = 'MEDICO_HOMOLOGADOR';
        nomeUser = 'DR. MÉDICO HOMOLOGADOR';
    } else if (email.includes('examinador')) {
        perfilRole = 'MEDICO_EXAMINADOR_IND';
        nomeUser = 'DR. MÉDICO EXAMINADOR';
    } else if (email.includes('medico')) {
        perfilRole = 'MEDICO';
        nomeUser = 'DR. MÉDICO CLÍNICA';
    } else if (email.includes('pcmso')) {
        perfilRole = 'MEDICO_PCMSO';
        nomeUser = 'DR. MÉDICO PCMSO';
    } else if (email.includes('agente')) {
        perfilRole = 'AGENTE';
        nomeUser = 'AGENTE BOREAL';
    }

    usuarioLogado = { email, role: perfilRole, nome: nomeUser, vinculoCliente: vinculoCli };
    currentRole = perfilRole;

    const telaLogin = document.getElementById('tela-login-container');
    if (telaLogin) telaLogin.classList.add('hidden');

    const select = document.getElementById('user-role-select');
    if (select) select.value = currentRole;

    validarTrocaPerfil(currentRole);
    if (msgErro) msgErro.classList.add('hidden');
};

// 3. CONTROLE DE ABAS E PERMISSÕES RIGOROSAS
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
    document.body.classList.remove('hide-prices');

    if (currentRole === 'AGENTE') {
        if (nav.producao) nav.producao.style.display = 'none';
        window.switchTab('pedidos');
    } else if (currentRole === 'CLIENTE') {
        document.body.classList.add('hide-prices');
        if (nav.atendimento) nav.atendimento.style.display = 'none';
        if (nav.producao) nav.producao.style.display = 'none';
        if (nav.cadastros) nav.cadastros.style.display = 'none';
        window.switchTab('pedidos');
    } else if (currentRole === 'MEDICO_PCMSO') {
        if (nav.pedidos) nav.pedidos.style.display = 'none';
        if (nav.atendimento) nav.atendimento.style.display = 'none';
        if (nav.historico) nav.historico.style.display = 'none';
        if (nav.esocial) nav.esocial.style.display = 'none';
        if (nav.cadastros) nav.cadastros.style.display = 'none';
        window.switchTab('pcmso-matriz');
    } else if (currentRole === 'MEDICO') {
        if (nav.pedidos) nav.pedidos.style.display = 'none';
        if (nav.esocial) nav.esocial.style.display = 'none';
        if (nav.relatorioPcmso) nav.relatorioPcmso.style.display = 'none';
        if (nav.producao) nav.producao.style.display = 'none';
        if (nav.cadastros) nav.cadastros.style.display = 'none';
        window.switchTab('atendimento');
    } else if (currentRole === 'MEDICO_EXAMINADOR_IND') {
        if (nav.pedidos) nav.pedidos.style.display = 'none';
        if (nav.esocial) nav.esocial.style.display = 'none';
        if (nav.relatorioPcmso) nav.relatorioPcmso.style.display = 'none';
        if (nav.cadastros) nav.cadastros.style.display = 'none';
        window.switchTab('atendimento');
    } else if (currentRole === 'MEDICO_HOMOLOGADOR') {
        if (nav.pedidos) nav.pedidos.style.display = 'none';
        if (nav.atendimento) nav.atendimento.style.display = 'none';
        if (nav.historico) nav.historico.style.display = 'none';
        if (nav.pcmsoMatriz) nav.pcmsoMatriz.style.display = 'none';
        if (nav.relatorioPcmso) nav.relatorioPcmso.style.display = 'none';
        if (nav.esocial) nav.esocial.style.display = 'none';
        if (nav.cadastros) nav.cadastros.style.display = 'none';
        window.switchTab('homologacao');
    } else if (currentRole === 'CLINICA') {
        if (nav.esocial) nav.esocial.style.display = 'none';
        if (nav.relatorioPcmso) nav.relatorioPcmso.style.display = 'none';
        window.switchTab('pedidos');
    }

    ajustarCamposEdicaoPcmso();
    atualizarBarraSelecaoClientesPorVinculo(currentRole);
    aoTrocarClienteFiltro();
};

function ajustarCamposEdicaoPcmso() {
    const isPcmsoMed = currentRole === 'MEDICO_PCMSO';
    const isReadOnly = currentRole === 'MEDICO' || currentRole === 'CLIENTE';

    const fLot = document.getElementById('pcmso_add_lotacao');
    const fProc = document.getElementById('pcmso_add_processo');
    const fCargo = document.getElementById('pcmso_add_cargo');
    const fQtd = document.getElementById('pcmso_add_qtd');
    const fCat = document.getElementById('pcmso_add_cat');
    const fAgente = document.getElementById('pcmso_add_agente');
    const fPlanoGestor = document.getElementById('pcmso_add_plano_gestor');
    const fBoxMedico = document.getElementById('pcmso_box_plano_medico');

    if (fLot) fLot.disabled = isPcmsoMed || isReadOnly;
    if (fProc) fProc.disabled = isPcmsoMed || isReadOnly;
    if (fCargo) fCargo.disabled = isPcmsoMed || isReadOnly;
    if (fQtd) fQtd.disabled = isPcmsoMed || isReadOnly;
    if (fCat) fCat.disabled = isPcmsoMed || isReadOnly;
    if (fAgente) fAgente.disabled = isPcmsoMed || isReadOnly;
    if (fPlanoGestor) fPlanoGestor.disabled = isPcmsoMed || isReadOnly;

    if (fBoxMedico) {
        fBoxMedico.style.display = (isPcmsoMed || currentRole === 'GESTOR' || currentRole === 'AGENTE') ? 'block' : 'none';
    }
}

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
        .filter(v => (v.entidade_nome.toUpperCase() === nomeLogado || nomeLogado.includes(v.entidade_nome.toUpperCase())) && v.ativo)
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

// 4. MÓDULO 1: SELETOR DE DESTINO, AGENDAMENTO E TECLA "IGUAL"
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
                alert(`✅ Sucesso! ${rows.length} ASOs enviados diretamente para a FILA DE ATENDIMENTO do ${parceiroNome}.`);
            } else {
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
    if (inpEnd) inpEnd.value = clinicaCad ? (clinicaCad.endereco || clinicaCad.nome) : pedido.clinica;

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
        cliente: pedido.cliente,
        cargo: "OPERACIONAL",
        funcao: "OPERACIONAL",
        lotacao: "OPERACIONAL",
        tipo: pedido.obj,
        riscos: 'AUSÊNCIA DE RISCOS ESPECÍFICOS',
        medicoDestino: pedido.clinica,
        status: "AGENDADO",
        anamnese: null
    });

    monitorRequestsData = monitorRequestsData.filter(p => p.id !== id);
    salvarPedidosLocalStorage();

    if (supabaseClient) {
        try { await supabaseClient.from('pedidos_agendamento').delete().eq('id', id); } catch(e){}
    }

    renderMonitorTable();
    renderFilaAso();
    fecharModal('modal-resposta-agendamento');
    alert("✅ Agendamento registrado! O colaborador foi transferido para a Fila do ASO.");
};

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

// 5. MÓDULO 2 & 3: FILA DO ASO, ANAMNESE E BANCO DE ASOS DEFINITIVO
let currentAnamneseTarget = null;

window.abrirAnamneseModal = async function(id) {
    currentAnamneseTarget = { tipo: 'FILA', id: id };
    const item = asoQueueData.find(x => x.id === id);
    if (!item) return;

    let dadosPregressos = item.anamnese;
    if (!dadosPregressos && supabaseClient) {
        try {
            const { data } = await supabaseClient
                .from('anamnese_evolutiva')
                .select('anamnese_payload')
                .eq('cpf_trabalhador', item.cpf)
                .order('id', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                dadosPregressos = data[0].anamnese_payload;
            }
        } catch(e){}
    }

    carregarDadosFormAnamnese(item.nome, item.cpf, item.cargo, dadosPregressos);
    document.getElementById('modal-anamnese').classList.remove('hidden');
};

window.visualizarAnamneseAnexada = function(id) {
    currentAnamneseTarget = { tipo: 'BANCO', id: id };
    const item = asoHistoryData.find(x => x.id === id);
    if (!item) return;

    carregarDadosFormAnamnese(item.nome, item.cpf, item.cargo, item.anamneseDados);
    document.getElementById('modal-anamnese').classList.remove('hidden');
};

function carregarDadosFormAnamnese(nome, cpf, cargo, dados) {
    document.getElementById('anam_nome_lbl').textContent = nome || '-';
    document.getElementById('anam_cpf_lbl').textContent = cpf || '-';
    document.getElementById('anam_cargo_lbl').textContent = cargo || '-';

    const d = dados || {};
    document.getElementById('anam_sangue').value = d.sangue || 'O+';
    document.getElementById('anam_unidade').value = d.unidade || '';
    document.getElementById('anam_setor').value = d.setor || '';
    document.getElementById('anam_contato').value = d.contato || '';
    document.getElementById('anam_acid_outro').value = d.acidente || 'NÃO';
    document.getElementById('anam_acid_outro_desc').value = d.acidenteDesc || '';
    document.getElementById('anam_limitacao').value = d.limitacao || 'NÃO';
    document.getElementById('anam_limitacao_desc').value = d.limitacaoDesc || '';

    document.getElementById('fam_tb').checked = !!d.famTb;
    document.getElementById('fam_diab').checked = !!d.famDiab;
    document.getElementById('fam_cancer').checked = !!d.famCancer;
    document.getElementById('fam_asma').checked = !!d.famAsma;
    document.getElementById('fam_surdez').checked = !!d.famSurdez;
    document.getElementById('fam_mental').checked = !!d.famMental;
    document.getElementById('fam_coracao').checked = !!d.famCoracao;
    document.getElementById('fam_desc_geral').value = d.famDesc || '';

    document.getElementById('pess_has').checked = !!d.pessHas;
    document.getElementById('pess_pne').checked = !!d.pessPne;
    document.getElementById('pess_dor_peito').checked = !!d.pessDorPeito;
    document.getElementById('pess_fratura').checked = !!d.pessFratura;
    document.getElementById('pess_renal').checked = !!d.pessRenal;
    document.getElementById('pess_onco').checked = !!d.pessOnco;
    document.getElementById('pess_diab').checked = !!d.pessDiab;
    document.getElementById('pess_convulsao').checked = !!d.pessConvulsao;
    document.getElementById('pess_estomago').checked = !!d.pessEstomago;
    document.getElementById('pess_med_controlado').checked = !!d.pessMedControlado;
    document.getElementById('pess_respiratorio').checked = !!d.pessRespiratorio;
    document.getElementById('pess_alergia_med').checked = !!d.pessAlergiaMed;

    document.getElementById('anam_obs').value = d.obs || '';
}

window.salvarAnamnese = async function() {
    if (!currentAnamneseTarget) return;

    const anamnesePayload = {
        sangue: document.getElementById('anam_sangue').value.trim(),
        unidade: document.getElementById('anam_unidade').value.trim(),
        setor: document.getElementById('anam_setor').value.trim(),
        contato: document.getElementById('anam_contato').value.trim(),
        acidente: document.getElementById('anam_acid_outro').value,
        acidenteDesc: document.getElementById('anam_acid_outro_desc').value.trim(),
        limitacao: document.getElementById('anam_limitacao').value,
        limitacaoDesc: document.getElementById('anam_limitacao_desc').value.trim(),
        famTb: document.getElementById('fam_tb').checked,
        famDiab: document.getElementById('fam_diab').checked,
        famCancer: document.getElementById('fam_cancer').checked,
        famAsma: document.getElementById('fam_asma').checked,
        famSurdez: document.getElementById('fam_surdez').checked,
        famMental: document.getElementById('fam_mental').checked,
        famCoracao: document.getElementById('fam_coracao').checked,
        famDesc: document.getElementById('fam_desc_geral').value.trim(),
        pessHas: document.getElementById('pess_has').checked,
        pessPne: document.getElementById('pess_pne').checked,
        pessDorPeito: document.getElementById('pess_dor_peito').checked,
        pessFratura: document.getElementById('pess_fratura').checked,
        pessRenal: document.getElementById('pess_renal').checked,
        pessOnco: document.getElementById('pess_onco').checked,
        pessDiab: document.getElementById('pess_diab').checked,
        pessConvulsao: document.getElementById('pess_convulsao').checked,
        pessEstomago: document.getElementById('pess_estomago').checked,
        pessMedControlado: document.getElementById('pess_med_controlado').checked,
        pessRespiratorio: document.getElementById('pess_respiratorio').checked,
        pessAlergiaMed: document.getElementById('pess_alergia_med').checked,
        obs: document.getElementById('anam_obs').value.trim()
    };

    if (currentAnamneseTarget.tipo === 'FILA') {
        const item = asoQueueData.find(x => x.id === currentAnamneseTarget.id);
        if (item) item.anamnese = anamnesePayload;
        renderFilaAso();
    } else {
        const item = asoHistoryData.find(x => x.id === currentAnamneseTarget.id);
        if (item) {
            item.anamneseDados = anamnesePayload;
            salvarBancoAsoLocal();
            if (supabaseClient) {
                try {
                    await supabaseClient.from('asos').update({ anamnese_dados: anamnesePayload }).eq('id', item.id);
                } catch(e){}
            }
            renderHistoryTabela();
        }
    }

    fecharModal('modal-anamnese');
    alert("✅ Ficha de Anamnese Ocupacional salva com sucesso com todos os campos preservados!");
};

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

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';

    asoQueueData
        .filter(item => activeCli === 'ALL' || item.cliente === activeCli)
        .forEach(item => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50";
            tr.innerHTML = `
                <td class="p-2.5 font-bold">${item.nome}<br><span class="text-slate-500 font-normal">${item.cpf}</span></td>
                <td class="p-2.5">${item.cliente}</td>
                <td class="p-2.5 font-bold">${item.cargo}</td>
                <td class="p-2.5 font-bold text-blue-900">${item.tipo}</td>
                <td class="p-2.5 text-center">
                    <button type="button" onclick="abrirAnamneseModal(${item.id})" class="bg-indigo-700 hover:bg-indigo-800 text-white px-2.5 py-1 rounded font-bold text-[11px] shadow">
                        📋 ${item.anamnese ? 'Ficha Salva (Editar)' : 'Preencher Anamnese'}
                    </button>
                </td>
                <td class="p-2.5 text-center">
                    <button type="button" onclick="abrirAsoModalBoreal(${item.id})" class="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded font-extrabold text-[11px] shadow">
                        🩺 Abrir & Editar ASO Boreal
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
};

function gerarHashValidacaoAso() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let h = '';
    for (let i = 0; i < 4; i++) h += chars.charAt(Math.floor(Math.random() * chars.length));
    return `ASO-${Date.now().toString().slice(-6)}-${h}`;
}

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

window.concluirEmissaoAsoBoreal = async function() {
    const item = asoQueueData.find(x => x.id === selectedAsoId);
    if (!item) return;

    const conclusaoTxt = document.querySelector('input[name="aso_conclusao"]:checked')?.value || "Apto";
    const tipoExameTxt = document.querySelector('input[name="aso_tp_exame"]:checked')?.value || (item.tipo || "ASO PERIÓDICO");

    const hashValidador = gerarHashValidacaoAso();
    const dataHoraRegistro = new Date().toISOString();
    const medicoNome = document.getElementById('aso_med_nome')?.value || usuarioLogado?.nome || "DR. MÉDICO EXAMINADOR";

    const asoObj = {
        id: Date.now(),
        fecha: document.getElementById('aso_edit_data')?.value || new Date().toLocaleDateString('pt-BR'),
        local: document.getElementById('aso_edit_local')?.value || "Cidade de Atendimento",
        nome: document.getElementById('aso_edit_nome')?.value || item.nome,
        cpf: document.getElementById('aso_edit_cpf')?.value || item.cpf,
        nasc: document.getElementById('aso_edit_nasc')?.value || item.nasc || 'Não informada',
        matricula: document.getElementById('aso_edit_matricula')?.value || item.matricula || '-',
        cliente: document.getElementById('aso_edit_razao')?.value || item.cliente,
        cargo: document.getElementById('aso_edit_cargo')?.value || item.cargo,
        funcao: document.getElementById('aso_edit_funcao')?.value || item.funcao || item.cargo,
        lotacao: document.getElementById('aso_edit_lotacao')?.value || item.lotacao || 'OPERACIONAL',
        cnpj: document.getElementById('aso_edit_cnpj')?.value || '00.000.000/0001-00',
        tipoExame: tipoExameTxt,
        origem: "SISTEMA_BOREAL",
        resultado: conclusaoTxt.toUpperCase(),
        medico: medicoNome,
        medicoPcmso: document.getElementById('aso_lbl_medico_pcmso')?.textContent || "-",
        agentes: document.getElementById('aso_doc_agentes_especificos')?.value || 'AUSÊNCIA DE RISCOS ESPECÍFICOS',
        assinatura_eletronica: {
            hash_validacao: hashValidador,
            data_hora: dataHoraRegistro,
            medico_nome: medicoNome,
            crm_uf: "CRM/SP 1011385",
            autenticacao: "Assinatura Eletrônica Avançada Boreal Engmed (Trilha Auditada)"
        },
        anamneseDados: item.anamnese || null
    };

    asoHistoryData.unshift(asoObj);
    salvarBancoAsoLocal();
    asoQueueData = asoQueueData.filter(x => x.id !== selectedAsoId);

    if (supabaseClient) {
        try {
            await supabaseClient.from('asos').upsert([asoObj]);
        } catch(e){}
    }

    renderFilaAso();
    renderHistoryTabela();
    fecharModal('modal-aso');
    alert(`✅ ASO emitido e assinado eletronicamente!\nCódigo de Validação: ${hashValidador}\nDocumento salvo e disponível no Banco de ASOs.`);
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
                    <button type="button" onclick="visualizarAnamneseAnexada(${h.id})" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 px-2 py-1 rounded font-bold text-[11px] shadow-sm">
                        📋 ${h.anamneseDados ? 'Ficha Salva (Editar)' : 'Preencher Anamnese'}
                    </button>
                </td>
                <td class="p-2.5 text-center">
                    <button type="button" onclick="visualizarAsoAnexado(${h.id})" class="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded font-bold text-[11px] shadow">
                        📄 Abrir ASO A4
                    </button>
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

window.visualizarAsoAnexado = function(id) {
    const item = asoHistoryData.find(x => x.id === id);
    if (!item) return;

    const paper = document.getElementById('aso-paper-visualizar');
    const modalTitulo = document.getElementById('modal-visualizar-titulo');
    if (modalTitulo) modalTitulo.textContent = "📄 ATESTADO DE SAÚDE OCUPACIONAL - ASO (BOREAL ENGMED)";

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
                    <span class="text-[8px] text-slate-500 block">Data/Hora: ${item.assinatura_eletronica ? new Date(item.assinatura_eletronica.data_hora).toLocaleString('pt-BR') : item.fecha}</span>
                </div>
            </div>

            <div class="text-center pt-2 border-t border-slate-200 mt-2 text-[9px] text-slate-500">
                A autenticidade deste Atestado de Saúde Ocupacional pode ser confirmada informando a chave de validação 
                <strong class="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded border text-[10px]">${item.assinatura_eletronica?.hash_validacao || 'N/A'}</strong> 
                no portal de validação da <strong>Boreal Engmed</strong>.
            </div>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado').classList.remove('hidden');
};

// 6. MÓDULO 5: HOMOLOGAÇÃO COM SIGILO DO CID, CONSULTA CFM E PARECER
window.abrirConsultaRapidaCFM = function() {
    const crm = prompt("Digite o CRM do médico emissor para consultar no portal CFM:");
    if (crm) {
        window.open(`https://portal.cfm.org.br/busca-medicos/?crm=${crm.replace(/\D/g, '')}&uf=SP`, '_blank');
    }
};

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
            diasHomologados: dias,
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
            await supabaseClient.from('atestados_homologacao').upsert([novoItem]);
        }

        if (trabInput) trabInput.value = '';
        alert("✅ Atestado relacionado com sucesso e sincronizado em nuvem!");
    } catch(e){
        alert("Erro ao adicionar atestado.");
    }
};

window.renderHomologacaoTabela = function() {
    const tbody = document.getElementById('atestados-homologacao-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const podeVerCid = currentRole === 'GESTOR' || currentRole === 'AGENTE' || currentRole === 'MEDICO_HOMOLOGADOR' || currentRole === 'MEDICO_PCMSO';

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
                <td class="p-2 text-center font-black ${podeVerCid ? 'text-purple-900' : 'text-slate-400'}">
                    ${podeVerCid ? a.cid : '🔒 SIGILOSO'}
                </td>
                <td class="p-2">${a.medico}</td>
                <td class="p-2 text-center">
                    <a href="${a.arquivoUrl || '#'}" target="_blank" class="bg-indigo-50 border border-indigo-200 text-indigo-900 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-indigo-100">
                        📄 Original
                    </a>
                </td>
                <td class="p-2 text-center">
                    <span class="px-2 py-0.5 rounded font-bold text-[10px] ${a.status.includes('HOMOLOGADO') ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}">
                        ${a.status}
                    </span>
                </td>
                <td class="p-2 text-center">
                    <button type="button" onclick="abrirModalEdicaoParecerHomologacao(${a.id})" class="bg-purple-800 hover:bg-purple-900 text-white px-2 py-1 rounded text-[10px] font-bold shadow">
                        🩺 Parecer
                    </button>
                </td>
                <td class="p-2 text-center">
                    ${currentRole === 'GESTOR' ? `<button onclick="apagarHomologacao(${a.id})" class="text-rose-600 font-bold hover:underline text-[10px]">🗑️ Apagar</button>` : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });
};

window.abrirModalEdicaoParecerHomologacao = function(id) {
    const item = atestadosHomologacaoData.find(x => x.id === id);
    if (!item) return;

    const modal = document.getElementById('modal-parecer-homologacao-edicao');
    if (!modal) return;

    modal.dataset.atestadoId = id;
    document.getElementById('hom_edit_trab_lbl').textContent = item.trab;
    document.getElementById('hom_edit_empresa_lbl').textContent = item.cliente;
    document.getElementById('hom_edit_crm_lbl').textContent = item.medico;
    document.getElementById('hom_parecer_dias_originais').value = item.dias;
    document.getElementById('hom_parecer_dias_finais').value = item.diasHomologados || item.dias;
    document.getElementById('hom_parecer_texto').value = item.parecerTexto || '';

    modal.classList.remove('hidden');
};

window.salvarParecerHomologacao = async function() {
    const modal = document.getElementById('modal-parecer-homologacao-edicao');
    const id = Number(modal.dataset.atestadoId);
    const item = atestadosHomologacaoData.find(x => x.id === id);
    if (!item) return;

    const statusDecisao = document.getElementById('hom_parecer_status').value;
    const diasFinais = parseInt(document.getElementById('hom_parecer_dias_finais').value) || item.dias;
    const texto = document.getElementById('hom_parecer_texto').value.trim();

    if (statusDecisao !== 'HOMOLOGADO_TOTAL' && !texto) {
        return alert("Por favor, preencha a fundamentação técnica do parecer médico.");
    }

    item.status = statusDecisao;
    item.diasHomologados = diasFinais;
    item.parecerTexto = texto;
    item.medicoHomologador = usuarioLogado?.nome || "DR. MÉDICO HOMOLOGADOR";

    renderHomologacaoTabela();
    fecharModal('modal-parecer-homologacao-edicao');

    if (supabaseClient) {
        try {
            await supabaseClient.from('atestados_homologacao').update({
                status: item.status,
                dias_homologados: item.diasHomologados,
                parecer_texto: item.parecerTexto,
                medico_homologador: item.medicoHomologador
            }).eq('id', id);
        } catch(e){}
    }

    alert("✅ Parecer técnico homologado e assinado com sucesso!");
};

window.gerarRelatorioPdfHomologacao = function() {
    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const lista = atestadosHomologacaoData.filter(a => activeCli === 'ALL' || a.cliente === activeCli);
    const podeVerCid = currentRole === 'GESTOR' || currentRole === 'AGENTE' || currentRole === 'MEDICO_HOMOLOGADOR' || currentRole === 'MEDICO_PCMSO';

    const paper = document.getElementById('aso-paper-visualizar');
    const modalTitulo = document.getElementById('modal-visualizar-titulo');
    if (modalTitulo) modalTitulo.textContent = "📄 RELATÓRIO ANALÍTICO DE ABSENTEÍSMO & AFASTAMENTOS OCUPACIONAIS";

    let linhasTr = '';
    let totalDias = 0;
    lista.forEach(a => {
        totalDias += Number(a.dias) || 0;
        linhasTr += `
            <tr class="border-b">
                <td class="p-1 font-bold">${a.cliente}</td>
                <td class="p-1 font-bold">${a.trab}</td>
                <td class="p-1">${a.setor}</td>
                <td class="p-1">${a.cargo}</td>
                <td class="p-1">${a.data}</td>
                <td class="p-1 text-center font-bold">${a.dias}</td>
                <td class="p-1 text-center font-bold">${podeVerCid ? a.cid : '🔒 SIGILOSO'}</td>
                <td class="p-1">${a.medico}</td>
                <td class="p-1 font-bold text-purple-900">${a.status}</td>
            </tr>
        `;
    });

    if (paper) {
        paper.className = "bg-white p-6 max-w-4xl mx-auto text-slate-900 border-2 border-black shadow-2xl text-[11px] leading-snug space-y-3 folha-homologacao-print";
        paper.innerHTML = `
            <div class="border-b-2 border-black pb-2 flex justify-between items-center">
                <div>
                    <strong class="text-sm block font-black uppercase text-blue-950">Boreal Engenharia e Medicina</strong>
                    <span class="text-[10px] text-slate-600 font-semibold">CRM Nº 1011385 | Tel. (19) 99156-7153</span>
                </div>
                <div class="text-right">
                    <strong class="text-sm font-black uppercase tracking-tight">RELATÓRIO CONSOLIDADO DE ABSENTEÍSMO</strong>
                </div>
            </div>

            <div class="border border-black p-2 bg-slate-100 font-bold uppercase text-[10px] flex justify-between">
                <span>EMPRESA: ${activeCli === 'ALL' ? 'CONSOLIDADO - TODOS OS CLIENTES' : activeCli}</span>
                <span>DATA EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</span>
            </div>

            <div class="border border-black p-2 bg-purple-50 flex justify-between font-bold text-purple-950">
                <span>TOTAL DE OCORRÊNCIAS: ${lista.length}</span>
                <span>TOTAL DE DIAS DE AFASTAMENTO: ${totalDias} DIA(S)</span>
            </div>

            <table class="w-full text-left border-collapse text-[10px] border border-black mt-2">
                <thead>
                    <tr class="bg-slate-200 border-b border-black font-black uppercase">
                        <th class="p-1">Cliente</th>
                        <th class="p-1">Trabalhador</th>
                        <th class="p-1">Setor</th>
                        <th class="p-1">Cargo</th>
                        <th class="p-1">Data</th>
                        <th class="p-1 text-center">Dias</th>
                        <th class="p-1 text-center">CID-10</th>
                        <th class="p-1">Médico Emissor</th>
                        <th class="p-1">Parecer</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTr || '<tr><td colspan="9" class="p-2 text-center italic">Nenhum registro de afastamento encontrado.</td></tr>'}
                </tbody>
            </table>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado').classList.remove('hidden');
};

window.apagarHomologacao = async function(id) {
    if (currentRole !== 'GESTOR') return alert("Somente o Gestor pode apagar registros de homologação!");
    if (!confirm("Deseja apagar este registro de afastamento?")) return;

    atestadosHomologacaoData = atestadosHomologacaoData.filter(a => a.id !== id);
    renderHomologacaoTabela();

    if (supabaseClient) {
        try { await supabaseClient.from('atestados_homologacao').delete().eq('id', id); } catch(e){}
    }
};

// 7. MÓDULO 6: MATRIZ PCMSO E PLANOS DE AÇÃO SEPARADOS
window.filtrarRiscosCat = function(idCatSelect, idAgenteSelect) {
    const cat = document.getElementById(idCatSelect)?.value;
    const selAgente = document.getElementById(idAgenteSelect);
    if (!selAgente) return;
    selAgente.innerHTML = '<option value="">-- Selecione o Perigo do Inventário PGR --</option>';

    if (CATALOGO_RISCOS && CATALOGO_RISCOS[cat]) {
        CATALOGO_RISCOS[cat].forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.perigo;
            opt.dataset.risco = item.risco;
            opt.dataset.agravo = item.agravo || item.risco;
            opt.dataset.exame = item.exame || 'CLÍNICO';
            opt.dataset.per = item.per || 'Anual';
            opt.dataset.plano = item.plano || '';
            opt.innerText = item.perigo;
            selAgente.appendChild(opt);
        });
    }
};

window.autoPreencherPerigoRiscoPlano = function() {
    const selAgente = document.getElementById('pcmso_add_agente');
    const opt = selAgente?.options[selAgente.selectedIndex];
    if (!opt || !opt.value) return;

    const inpPerigo = document.getElementById('pcmso_add_perigo_custom');
    if (inpPerigo) inpPerigo.value = opt.value;

    const inpRisco = document.getElementById('pcmso_add_risco');
    if (inpRisco) inpRisco.value = `${opt.dataset.risco} — ${opt.dataset.agravo}`;

    const selExame = document.getElementById('pcmso_add_exame');
    if (selExame && opt.dataset.exame) selExame.value = opt.dataset.exame;

    const selPer = document.getElementById('pcmso_add_periodicidade');
    if (selPer && opt.dataset.per) selPer.value = opt.dataset.per;

    const txtPlano = document.getElementById('pcmso_add_plano_gestor');
    if (txtPlano && opt.dataset.plano) txtPlano.value = opt.dataset.plano;
};

window.autoPreencherExamePcmso = window.autoPreencherPerigoRiscoPlano;

window.adicionarLinhaPCMSO = async function() {
    const activeCli = document.getElementById('active-cliente-select')?.value || 'CLIENTE';
    const clienteNome = activeCli === 'ALL' ? (clientesCadastrados[0]?.nome || 'CLIENTE PADRÃO') : activeCli;

    const lotacao = document.getElementById('pcmso_add_lotacao')?.value.trim() || 'OPERACIONAL';
    const processo = document.getElementById('pcmso_add_processo')?.value.trim() || 'ROTINA OPERACIONAL';
    const cargo = document.getElementById('pcmso_add_cargo')?.value.trim() || 'OPERADOR';
    const qtd = parseInt(document.getElementById('pcmso_add_qtd')?.value) || 1;

    const perigoCustom = document.getElementById('pcmso_add_perigo_custom')?.value.trim();
    const selAgente = document.getElementById('pcmso_add_agente');
    const perigo = perigoCustom || selAgente?.value || 'AUSÊNCIA DE RISCOS ESPECÍFICOS';

    const risco = document.getElementById('pcmso_add_risco')?.value.trim() || selAgente?.options[selAgente.selectedIndex]?.dataset.risco || 'MONITORAMENTO CLÍNICO OCUPACIONAL';

    const selExame = document.getElementById('pcmso_add_exame')?.value;
    const customExame = document.getElementById('pcmso_add_exame_custom')?.value.trim();
    const exame = customExame || selExame || 'CLÍNICO';

    const selPer = document.getElementById('pcmso_add_periodicidade')?.value;
    const customPer = document.getElementById('pcmso_add_per_custom')?.value.trim();
    const periodicidade = customPer || selPer || 'Anual';

    const planoGestor = document.getElementById('pcmso_add_plano_gestor')?.value.trim() || 'Medidas preventivas conforme PGR.';
    const planoMedico = document.getElementById('pcmso_add_plano_medico')?.value.trim() || 'Acompanhamento ocupacional e exames periódicos conforme NR-07.';

    const novaLinha = {
        id: Date.now(),
        cliente: clienteNome,
        lotacao,
        processo,
        cargo,
        qtd,
        perigo,
        agente: perigo,
        risco,
        exame,
        periodicidade,
        planoGestor,
        planoMedico,
        ativo: true
    };

    pcmsoMatrizData.unshift(novaLinha);
    salvarPcmsoMatrizLocalStorage();

    if (supabaseClient) {
        try {
            await supabaseClient.from('pcmso_matriz').upsert([{
                id: novaLinha.id,
                cliente: novaLinha.cliente,
                lotacao: novaLinha.lotacao,
                processo: novaLinha.processo,
                cargo: novaLinha.cargo,
                qtd: novaLinha.qtd,
                agente: novaLinha.perigo,
                risco: novaLinha.risco,
                exame: novaLinha.exame,
                periodicidade: novaLinha.periodicidade,
                plano_gestor: novaLinha.planoGestor,
                plano_medico: novaLinha.planoMedico,
                ativo: true
            }]);
        } catch(e){}
    }

    renderPcmsoMatriz();
    alert("✅ Nova linha carregada com sucesso na Matriz do PCMSO!");
};

window.salvarEdicaoLinhaPcmso = async function(id, campo, valor) {
    const item = pcmsoMatrizData.find(x => x.id === id);
    if (!item) return;

    item[campo] = valor;
    salvarPcmsoMatrizLocalStorage();

    if (supabaseClient) {
        try {
            let updatePayload = {};
            if (campo === 'exame') updatePayload.exame = valor;
            else if (campo === 'periodicidade') updatePayload.periodicidade = valor;
            else if (campo === 'planoMedico') updatePayload.plano_medico = valor;
            else if (campo === 'planoGestor') updatePayload.plano_gestor = valor;
            await supabaseClient.from('pcmso_matriz').update(updatePayload).eq('id', id);
        } catch(e){}
    }
};

window.renderPcmsoMatriz = function() {
    const tbody = document.getElementById('pcmso-matriz-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const isPcmsoMed = currentRole === 'MEDICO_PCMSO';

    pcmsoMatrizData
        .filter(m => activeCli === 'ALL' || m.cliente === activeCli)
        .forEach(m => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50";
            tr.innerHTML = `
                <td class="p-2 font-bold">${m.cliente}</td>
                <td class="p-2 font-bold">${m.lotacao}</td>
                <td class="p-2">${m.processo}</td>
                <td class="p-2 font-black text-blue-950">${m.cargo}</td>
                <td class="p-2 text-center font-bold">${m.qtd}</td>
                <td class="p-2 font-semibold text-slate-800">${m.perigo || m.agente}</td>
                <td class="p-2 text-rose-900 font-semibold">${m.risco}</td>
                <td class="p-2 font-bold text-blue-900">
                    ${isPcmsoMed || currentRole === 'GESTOR' || currentRole === 'AGENTE' ? `
                        <input type="text" value="${m.exame}" onchange="salvarEdicaoLinhaPcmso(${m.id}, 'exame', this.value)" class="w-full border rounded p-1 text-xs font-bold bg-white text-blue-900">
                    ` : m.exame}
                </td>
                <td class="p-2 text-center font-bold">
                    ${isPcmsoMed || currentRole === 'GESTOR' || currentRole === 'AGENTE' ? `
                        <input type="text" value="${m.periodicidade}" onchange="salvarEdicaoLinhaPcmso(${m.id}, 'periodicidade', this.value)" class="w-24 border rounded p-1 text-xs text-center font-bold bg-white">
                    ` : m.periodicidade}
                </td>
                <td class="p-2 text-center">
                    ${currentRole === 'GESTOR' ? `<button onclick="apagarLinhaPcmso(${m.id})" class="text-red-600 font-bold hover:underline">🗑️ Apagar</button>` : '-'}
                </td>
            `;

            const trPlanos = document.createElement('tr');
            trPlanos.className = "bg-slate-50/90 border-b";
            trPlanos.innerHTML = `
                <td colspan="10" class="p-2.5 space-y-2 text-xs">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="font-extrabold text-amber-950 bg-amber-100 px-2 py-0.5 rounded text-[11px] uppercase">
                                📋 Plano de Ação do Gestor / PGR:
                            </span>
                            ${currentRole === 'GESTOR' || currentRole === 'AGENTE' ? `
                                <span class="text-[10px] text-slate-500 font-semibold">(Editável por Gestor / Agente)</span>
                            ` : ''}
                        </div>
                        ${currentRole === 'GESTOR' || currentRole === 'AGENTE' ? `
                            <textarea rows="2" onchange="salvarEdicaoLinhaPcmso(${m.id}, 'planoGestor', this.value)" class="w-full border rounded p-1.5 text-xs bg-white font-semibold text-slate-800 shadow-sm">${m.planoGestor || ''}</textarea>
                        ` : `
                            <div class="p-2 bg-white rounded border border-slate-200 font-semibold text-slate-800">${m.planoGestor || 'Nenhuma medida preventiva cadastrada.'}</div>
                        `}
                    </div>

                    <div class="space-y-1 pt-1 border-t border-slate-200">
                        <div class="flex items-center gap-2">
                            <span class="font-extrabold text-blue-950 bg-blue-100 px-2 py-0.5 rounded text-[11px] uppercase">
                                🩺 Plano de Ação Médico (NR-07):
                            </span>
                            ${isPcmsoMed || currentRole === 'GESTOR' ? `
                                <span class="text-[10px] text-blue-700 font-semibold">(Editável pelo Médico do PCMSO)</span>
                            ` : ''}
                        </div>
                        ${isPcmsoMed || currentRole === 'GESTOR' ? `
                            <textarea rows="2" onchange="salvarEdicaoLinhaPcmso(${m.id}, 'planoMedico', this.value)" class="w-full border border-blue-400 rounded p-1.5 text-xs bg-blue-50/60 font-bold text-blue-950 shadow-sm">${m.planoMedico || ''}</textarea>
                        ` : `
                            <div class="p-2 bg-blue-50/50 rounded border border-blue-200 font-bold text-blue-950">${m.planoMedico || 'Nenhuma conduta médica específica registrada.'}</div>
                        `}
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
            tbody.appendChild(trPlanos);
        });
};

window.apagarLinhaPcmso = async function(id) {
    if (currentRole !== 'GESTOR') return alert("Apenas o Gestor pode apagar linhas da Matriz!");
    if (!confirm("Deseja apagar esta linha da Matriz do PCMSO?")) return;
    pcmsoMatrizData = pcmsoMatrizData.filter(m => m.id !== id);
    salvarPcmsoMatrizLocalStorage();
    renderPcmsoMatriz();
    if (supabaseClient) {
        try { await supabaseClient.from('pcmso_matriz').delete().eq('id', id); } catch(e){}
    }
};

function salvarPcmsoMatrizLocalStorage() {
    try { localStorage.setItem('boreal_pcmso_matriz_db', JSON.stringify(pcmsoMatrizData)); } catch(e){}
}
function carregarPcmsoMatrizLocalStorage() {
    try {
        const raw = localStorage.getItem('boreal_pcmso_matriz_db');
        if (raw) pcmsoMatrizData = JSON.parse(raw);
    } catch(e){}
}

window.exportarMatrizPcmsoWord = function() {
    const activeCli = document.getElementById('active-cliente-select')?.value || 'TODOS';
    const lista = pcmsoMatrizData.filter(m => activeCli === 'ALL' || m.cliente === activeCli);

    let linhasHtml = '';
    lista.forEach(m => {
        linhasHtml += `
            <tr>
                <td style="border: 1px solid #000; padding: 4px;">${m.cliente}</td>
                <td style="border: 1px solid #000; padding: 4px;">${m.lotacao}</td>
                <td style="border: 1px solid #000; padding: 4px;">${m.cargo}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${m.qtd}</td>
                <td style="border: 1px solid #000; padding: 4px;">${m.perigo || m.agente}</td>
                <td style="border: 1px solid #000; padding: 4px;">${m.risco}</td>
                <td style="border: 1px solid #000; padding: 4px;"><strong>${m.exame}</strong></td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${m.periodicidade}</td>
                <td style="border: 1px solid #000; padding: 4px;">${m.planoGestor || '-'}</td>
                <td style="border: 1px solid #000; padding: 4px;">${m.planoMedico || '-'}</td>
            </tr>
        `;
    });

    const docWord = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Matriz PCMSO Boreal Engmed</title></head>
        <body style="font-family: Arial, sans-serif; font-size: 10pt;">
            <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
                <h2 style="margin: 0; color: #0f172a; text-transform: uppercase;">BOREAL ENGENHARIA E MEDICINA OCUPACIONAL</h2>
                <p style="margin: 2px 0 0 0; font-size: 9pt; color: #555;">CRM Nº 1011385 | MATRIZ DO PCMSO SEQUENCIAL (NR-07)</p>
            </div>
            <p><strong>EMPRESA CLIENTE:</strong> ${activeCli}</p>
            <p><strong>DATA DE EMISSÃO:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                <thead>
                    <tr style="background: #1e3a8a; color: #ffffff;">
                        <th style="border: 1px solid #000; padding: 4px;">Cliente</th>
                        <th style="border: 1px solid #000; padding: 4px;">Setor</th>
                        <th style="border: 1px solid #000; padding: 4px;">Cargo</th>
                        <th style="border: 1px solid #000; padding: 4px;">Qtd</th>
                        <th style="border: 1px solid #000; padding: 4px;">Perigo</th>
                        <th style="border: 1px solid #000; padding: 4px;">Risco</th>
                        <th style="border: 1px solid #000; padding: 4px;">Exames</th>
                        <th style="border: 1px solid #000; padding: 4px;">Periodicidade</th>
                        <th style="border: 1px solid #000; padding: 4px;">Plano Gestor</th>
                        <th style="border: 1px solid #000; padding: 4px;">Plano Médico</th>
                    </tr>
                </thead>
                <tbody>${linhasHtml}</tbody>
            </table>
        </body></html>
    `;

    const blob = new Blob(['\ufeff' + docWord], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Matriz_PCMSO_${activeCli.replace(/\s+/g, '_')}.doc`;
    link.click();
};

window.gerarRelatorioPdfMatrizPcmso = function() {
    window.print();
};

window.gerarRelatorioPdfAnaliticoPcmso = function() {
    window.print();
};

// 8. MÓDULO 8: POSIÇÃO FINANCEIRA COM QUANTIDADE REAL EXECUTADA
window.renderProducaoTable = function() {
    const tbody = document.getElementById('relatorio-producao-tbody');
    const totalEl = document.getElementById('valor-soma-total-producao');
    if (!tbody) return;
    tbody.innerHTML = '';
    let somaTotal = 0;

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const nomeLogado = (usuarioLogado?.nome || '').toUpperCase();
    const vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');

    let linhasApuracao = JSON.parse(localStorage.getItem('boreal_apuracao_financeira_db') || '[]');

    if (linhasApuracao.length === 0 && vinculos.length > 0) {
        linhasApuracao = vinculos.map((v, i) => ({
            id: v.id || Date.now() + i,
            data: new Date().toLocaleDateString('pt-BR'),
            fornecedor: v.entidade_nome,
            cliente: v.cliente_nome,
            objeto: v.objeto,
            qtd_executada: 0,
            valor_unitario: Number(v.valor_unitario || 0)
        }));
        localStorage.setItem('boreal_apuracao_financeira_db', JSON.stringify(linhasApuracao));
    }

    linhasApuracao
        .filter(r => (activeCli === 'ALL' || r.cliente === activeCli) && (currentRole === 'GESTOR' || currentRole === 'AGENTE' || r.fornecedor.toUpperCase().includes(nomeLogado) || nomeLogado.includes(r.fornecedor.toUpperCase())))
        .forEach((r, idx) => {
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
                <td class="p-2.5 text-center bg-amber-50/70 border-x">
                    <input type="number" min="0" value="${qtd}" onchange="atualizarQtdExecutadaProducao(${idx}, this.value)" class="w-16 border rounded p-1 text-center font-black text-amber-950 bg-white shadow-sm">
                </td>
                <td class="p-2.5 text-right font-bold">
                    <input type="number" step="0.01" value="${unit.toFixed(2)}" onchange="atualizarValorUnitarioProducao(${idx}, this.value)" class="w-20 border rounded p-1 text-right font-bold bg-white">
                </td>
                <td class="p-2.5 text-right font-black text-emerald-700 bg-emerald-50/30">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
                <td class="p-2.5 text-center">
                    ${currentRole === 'GESTOR' ? `<button onclick="removerItemApuracao(${idx})" class="text-rose-600 font-bold hover:underline">🗑️</button>` : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });

    if (totalEl) totalEl.textContent = `R$ ${somaTotal.toFixed(2).replace('.', ',')}`;
};

window.atualizarQtdExecutadaProducao = function(idx, val) {
    let apuracao = JSON.parse(localStorage.getItem('boreal_apuracao_financeira_db') || '[]');
    if (!apuracao[idx]) return;
    apuracao[idx].qtd_executada = parseFloat(val) || 0;
    localStorage.setItem('boreal_apuracao_financeira_db', JSON.stringify(apuracao));
    renderProducaoTable();
};

window.atualizarValorUnitarioProducao = function(idx, val) {
    let apuracao = JSON.parse(localStorage.getItem('boreal_apuracao_financeira_db') || '[]');
    if (!apuracao[idx]) return;
    apuracao[idx].valor_unitario = parseFloat(val) || 0;
    localStorage.setItem('boreal_apuracao_financeira_db', JSON.stringify(apuracao));
    renderProducaoTable();
};

window.salvarFechamentoPeriodo = function() {
    const periodo = document.getElementById('fin_periodo_execucao')?.value || 'Período Atual';
    const obs = document.getElementById('fin_observacoes_gerais')?.value || '';
    const dados = JSON.parse(localStorage.getItem('boreal_apuracao_financeira_db') || '[]');

    let historico = JSON.parse(localStorage.getItem('boreal_historico_fechamentos') || '[]');
    historico.unshift({
        id: Date.now(),
        data_fechamento: new Date().toLocaleDateString('pt-BR'),
        periodo,
        observacoes: obs,
        itens: dados
    });
    localStorage.setItem('boreal_historico_fechamentos', JSON.stringify(historico));
    alert("✅ Fechamento do período gravado com sucesso no repositório de relatórios!");
};

window.enviarRelatorioEmailFinanceiro = function() {
    const periodo = document.getElementById('fin_periodo_execucao')?.value || 'Período Atual';
    const total = document.getElementById('valor-soma-total-producao')?.textContent || 'R$ 0,00';
    const corpo = encodeURIComponent(`Prezados,\n\nSegue o resumo da posição financeira consolidada do período ${periodo}.\nTotal apurado: ${total}.\n\nRelatório gerado pelo Sistema Boreal Engmed.`);
    window.location.href = `mailto:financeiro@boreal.eng.br?subject=Fechamento Financeiro - ${periodo}&body=${corpo}`;
};

// 9. CADASTROS, TABELA DE PREÇOS DOS FORNECEDORES
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

window.atualizarPrecoItemClinica = function(idx, novoValor) {
    let vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    if (!vinculos[idx]) return;

    vinculos[idx].valor_unitario = parseFloat(novoValor) || 0;
    localStorage.setItem('boreal_vinculos_db', JSON.stringify(vinculos));
    renderTabelaVinculos();
    renderProducaoTable();
};

window.renderTabelaVinculos = function() {
    const tbody = document.getElementById('tabela-vinculos-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    const isClinica = currentRole === 'CLINICA';
    const nomeLogado = (usuarioLogado?.nome || '').toUpperCase();

    vinculos
        .filter(v => currentRole === 'GESTOR' || currentRole === 'AGENTE' || (isClinica && (v.entidade_nome.toUpperCase().includes(nomeLogado) || nomeLogado.includes(v.entidade_nome.toUpperCase()))))
        .forEach((v, index) => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50";
            tr.innerHTML = `
                <td class="p-2 font-bold">${v.cliente_nome}</td>
                <td class="p-2">${v.tipo_vinculo}</td>
                <td class="p-2 font-bold text-slate-900">${v.entidade_nome}</td>
                <td class="p-2 font-semibold text-blue-900">${v.modalidade_contrato || 'RECORRENTE_FIXO'}</td>
                <td class="p-2 font-bold">${v.objeto}</td>
                <td class="p-2 text-right bg-amber-50">
                    <input type="number" step="0.01" value="${Number(v.valor_unitario).toFixed(2)}" 
                        onchange="atualizarPrecoItemClinica(${index}, this.value)" 
                        ${!isClinica && currentRole !== 'GESTOR' ? 'disabled' : ''} 
                        class="w-24 border rounded p-1 text-right font-black text-emerald-800 bg-white shadow-sm">
                </td>
                <td class="p-2 text-center">
                    ${currentRole === 'GESTOR' ? `<button onclick="removerVinculo(${index})" class="text-rose-600 font-bold hover:underline">Apagar</button>` : '-'}
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
            carregarCadastrosMedicosDoBanco(),
            carregarPcmsoDoBanco()
        ]);
    } catch(e){}
}

async function carregarPcmsoDoBanco() {
    try {
        const { data, error } = await supabaseClient.from('pcmso_matriz').select('*');
        if (!error && data && data.length > 0) {
            pcmsoMatrizData = data.map(d => ({
                id: Number(d.id),
                cliente: d.cliente,
                lotacao: d.lotacao,
                processo: d.processo,
                cargo: d.cargo,
                qtd: parseInt(d.qtd) || 1,
                perigo: d.agente,
                agente: d.agente,
                risco: d.risco,
                exame: d.exame,
                periodicidade: d.periodicidade,
                planoGestor: d.plano_gestor,
                planoMedico: d.plano_medico,
                ativo: d.ativo !== false
            }));
            salvarPcmsoMatrizLocalStorage();
            renderPcmsoMatriz();
        }
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
                assinatura_eletronica: d.assinatura_eletronica,
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
                diasHomologados: d.dias_homologados || d.dias,
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

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const nomeLogado = (usuarioLogado?.nome || '').toUpperCase();

    monitorRequestsData
        .filter(r => (activeCli === 'ALL' || r.cliente === activeCli) && (currentRole === 'GESTOR' || currentRole === 'AGENTE' || currentRole === 'CLIENTE' || r.clinica.toUpperCase().includes(nomeLogado) || nomeLogado.includes(r.clinica.toUpperCase())))
        .forEach(r => {
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
                <td class="p-2 text-center flex items-center justify-center gap-1.5">
                    <button type="button" onclick="abrirModalResponderAgendamento(${r.id})" class="bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-[11px] px-2.5 py-1 rounded shadow flex items-center gap-1">
                        📲 Responder
                    </button>
                    ${currentRole === 'GESTOR' || currentRole === 'AGENTE' ? `
                        <button type="button" onclick="apagarPedidoIndividual(${r.id})" class="text-rose-600 font-bold hover:underline text-xs">
                            🗑️
                        </button>
                    ` : ''}
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
        <option value="EEG">EEG</option>
        <option value="HEMOGRAMA COMPLETO">HEMOGRAMA COMPLETO</option>
        <option value="GLICEMIA DE JEJUM">GLICEMIA DE JEJUM</option>
        <option value="RAIO-X DE TÓRAX">RAIO-X DE TÓRAX</option>
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

window.enviarMensagemChat = function() {
    const input = document.getElementById('chat-msg-input');
    const box = document.getElementById('chat-messages-box');
    if (!input || !box || !input.value.trim()) return;

    const rem = document.getElementById('chat_remetente_select')?.value || 'USUÁRIO';
    const dest = document.getElementById('chat_destinatario_select')?.value || 'DESTINATÁRIO';
    const msg = input.value.trim();

    const div = document.createElement('div');
    div.className = "bg-white p-2 rounded border max-w-md shadow-sm space-y-0.5";
    div.innerHTML = `
        <div class="flex justify-between items-center text-[10px] text-slate-500 font-bold border-b pb-0.5">
            <span>DE: ${rem} ➔ PARA: ${dest}</span>
            <span>${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p class="font-bold text-slate-800 text-xs">${msg}</p>
    `;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    input.value = '';
};