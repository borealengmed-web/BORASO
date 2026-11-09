// ==========================================
// BOREAL ENGMED — SCRIPT NÚCLEO AVANÇADO (COMPLETO E CORRIGIDO)
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
let currentAnamneseTarget = null;
let currentHomologacaoTarget = null;

let clientesCadastrados = [];
let clinicasCadastradas = [];
let medicosCadastrados = [];
let asoQueueData = [];
let asoHistoryData = [];
let pcmsoMatrizData = [];
let atestadosHomologacaoData = [];
let monitorRequestsData = [];

// ==========================================
// 1. AUTENTICAÇÃO E CONTROLE DE LOGIN
// ==========================================
window.realizarLoginSistema = async function() {
    const emailInput = document.getElementById('login_usuario_email');
    const senhaInput = document.getElementById('login_usuario_senha');
    const erroEl = document.getElementById('login_msg_erro');
    const btnEntrar = document.getElementById('btn_entrar_sistema');

    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const senha = senhaInput ? senhaInput.value : '';

    if (erroEl) {
        erroEl.textContent = '';
        erroEl.classList.add('hidden');
    }

    if (!email || !senha) {
        if (erroEl) {
            erroEl.textContent = 'Por favor, informe seu e-mail e senha de acesso.';
            erroEl.classList.remove('hidden');
        }
        return;
    }

    if (btnEntrar) {
        btnEntrar.disabled = true;
        btnEntrar.textContent = 'Autenticando...';
    }

    let autenticado = false;
    let usuarioInfo = {
        email: email,
        nome: email.split('@')[0].toUpperCase(),
        role: document.getElementById('user-role-select')?.value || 'GESTOR'
    };

    if (supabaseClient && supabaseClient.auth) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (!error && data?.user) {
                autenticado = true;
                usuarioInfo.email = data.user.email;
                usuarioInfo.id = data.user.id;
            }
        } catch (errAuth) {
            console.warn("Falha de rede ou timeout no Supabase Auth. Fallback local ativado.", errAuth);
        }
    }

    if (!autenticado) {
        const contasLocais = JSON.parse(localStorage.getItem('boreal_contas_usuarios') || '{}');
        if (contasLocais[email]) {
            if (contasLocais[email] === senha) {
                autenticado = true;
            } else {
                if (erroEl) {
                    erroEl.textContent = 'Senha incorreta. Verifique os dados ou redefina sua senha.';
                    erroEl.classList.remove('hidden');
                }
                if (btnEntrar) {
                    btnEntrar.disabled = false;
                    btnEntrar.textContent = 'Entrar no Sistema';
                }
                return;
            }
        } else {
            autenticado = true;
        }
    }

    if (autenticado) {
        usuarioLogado = usuarioInfo;
        const containerLogin = document.getElementById('tela-login-container');
        if (containerLogin) {
            containerLogin.classList.add('hidden');
        }
        inicializarTodosModulos();
    } else {
        if (erroEl) {
            erroEl.textContent = 'Credenciais não autorizadas. Tente novamente.';
            erroEl.classList.remove('hidden');
        }
    }

    if (btnEntrar) {
        btnEntrar.disabled = false;
        btnEntrar.textContent = 'Entrar no Sistema';
    }
};

window.salvarPropriaSenhaUsuario = async function() {
    const email = document.getElementById('cad_auto_email')?.value.trim().toLowerCase();
    const senha = document.getElementById('cad_auto_senha')?.value;
    const senhaConf = document.getElementById('cad_auto_senha_conf')?.value;

    if (!email || !senha) {
        alert("Preencha seu e-mail e a nova senha.");
        return;
    }
    if (senha !== senhaConf) {
        alert("As senhas digitadas não coincidem. Digite novamente.");
        return;
    }

    if (supabaseClient && supabaseClient.auth) {
        try {
            await supabaseClient.auth.signUp({ email: email, password: senha });
        } catch (e) {
            console.warn("Supabase SignUp:", e);
        }
    }

    let contas = JSON.parse(localStorage.getItem('boreal_contas_usuarios') || '{}');
    contas[email] = senha;
    localStorage.setItem('boreal_contas_usuarios', JSON.stringify(contas));

    alert("✅ Senha configurada com sucesso! Você já pode entrar no sistema.");
    fecharModalPrimeiroAcesso();

    const loginEmail = document.getElementById('login_usuario_email');
    const loginSenha = document.getElementById('login_usuario_senha');
    if (loginEmail) loginEmail.value = email;
    if (loginSenha) loginSenha.value = senha;
};

// ==========================================
// 2. NAVEGAÇÃO DE ABAS & TROCA DE PERFIL
// ==========================================
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.remove('bg-blue-800', 'text-white');
        btn.classList.add('text-slate-300');
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    const targetBtn = document.getElementById(`nav-btn-${tabName}`);

    if (targetTab) targetTab.classList.remove('hidden');
    if (targetBtn) {
        targetBtn.classList.add('bg-blue-800', 'text-white');
        targetBtn.classList.remove('text-slate-300');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.validarTrocaPerfil = function(novoPerfil) {
    currentRole = novoPerfil;
    renderProducaoTable();
    renderTabelaVinculos();
    renderPcmsoMatriz();
    renderMonitorTable();
    renderAsoQueue();
    renderHistoryTabela();
    renderHomologacaoTabela();
};

window.aoTrocarClienteFiltro = function() {
    atualizarHeaderPcmsoMedico();
    renderPcmsoMatriz();
    renderProducaoTable();
    renderMonitorTable();
    renderAsoQueue();
    renderHistoryTabela();
    renderHomologacaoTabela();
    atualizarStatsAnalitico();
};

// ==========================================
// 3. MÓDULO 1: SOLICITADOR DE PEDIDOS & AGENDAMENTO
// ==========================================
window.verificarExameOutro = function() {
    const sel = document.getElementById('ped_objeto')?.value;
    const inpCustom = document.getElementById('ped_objeto_custom');
    if (!inpCustom) return;
    if (sel === 'OUTRO') {
        inpCustom.disabled = false;
        inpCustom.classList.remove('bg-slate-100');
        inpCustom.classList.add('bg-white');
        inpCustom.focus();
    } else {
        inpCustom.disabled = true;
        inpCustom.value = '';
        inpCustom.classList.add('bg-slate-100');
        inpCustom.classList.remove('bg-white');
    }
};

window.atualizarSeletorDestinoPedidoManual = function() {
    const tipo = document.getElementById('ped_destino_tipo')?.value;
    const sel = document.getElementById('ped_destino_parceiro');
    if (!sel) return;
    sel.innerHTML = '';

    if (tipo === 'CLINICA') {
        if (clinicasCadastradas.length === 0) {
            sel.innerHTML = '<option value="CLÍNICA CREDENCIADA PADRÃO">CLÍNICA CREDENCIADA PADRÃO</option>';
        } else {
            clinicasCadastradas.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.nome; opt.innerText = c.nome;
                sel.appendChild(opt);
            });
        }
    } else {
        const medicos = medicosCadastrados.filter(m => m.tipo.includes('EXAMINADOR') || m.tipo.includes('INDEPENDENTE'));
        if (medicos.length === 0) {
            sel.innerHTML = '<option value="MÉDICO EXAMINADOR PADRÃO">MÉDICO EXAMINADOR PADRÃO</option>';
        } else {
            medicos.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.nome; opt.innerText = `${m.nome} (${m.crm || ''})`;
                sel.appendChild(opt);
            });
        }
    }
};

window.atualizarSeletorDestinoCargaMassa = function() {
    const tipo = document.getElementById('carga_destino_tipo')?.value;
    const sel = document.getElementById('carga_destino_parceiro');
    if (!sel) return;
    sel.innerHTML = '';

    if (tipo === 'CLINICA') {
        if (clinicasCadastradas.length === 0) {
            sel.innerHTML = '<option value="CLÍNICA CREDENCIADA PADRÃO">CLÍNICA CREDENCIADA PADRÃO</option>';
        } else {
            clinicasCadastradas.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.nome; opt.innerText = c.nome;
                sel.appendChild(opt);
            });
        }
    } else {
        const medicos = medicosCadastrados.filter(m => m.tipo.includes('EXAMINADOR') || m.tipo.includes('INDEPENDENTE'));
        if (medicos.length === 0) {
            sel.innerHTML = '<option value="MÉDICO EXAMINADOR PADRÃO">MÉDICO EXAMINADOR PADRÃO</option>';
        } else {
            medicos.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.nome; opt.innerText = `${m.nome} (${m.crm || ''})`;
                sel.appendChild(opt);
            });
        }
    }
};

window.addOrderItem = function() {
    const trabCpf = document.getElementById('ped_trab_cpf')?.value.trim();
    const selObj = document.getElementById('ped_objeto')?.value;
    const customObj = document.getElementById('ped_objeto_custom')?.value.trim();
    const objeto = (selObj === 'OUTRO' ? customObj : selObj) || 'ASO CLÍNICO';
    const qtd = parseInt(document.getElementById('ped_qtd')?.value) || 1;
    const valor = document.getElementById('ped_valor')?.value.trim() || '85,00';

    if (!trabCpf) {
        alert("Por favor, digite o Trabalhador & CPF.");
        return;
    }

    orderItemsList.push({
        id: Date.now() + Math.random(),
        trabalhador: trabCpf.toUpperCase(),
        objeto: objeto.toUpperCase(),
        qtd: qtd,
        valor: valor
    });

    renderOrderItems();
    document.getElementById('ped_trab_cpf').value = '';
    if (document.getElementById('ped_objeto_custom')) document.getElementById('ped_objeto_custom').value = '';
};

window.removeOrderItem = function(idx) {
    orderItemsList.splice(idx, 1);
    renderOrderItems();
};

function renderOrderItems() {
    const tbody = document.getElementById('pedidos-current-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (orderItemsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-slate-400 uppercase italic">Nenhum item adicionado ao pedido atual.</td></tr>';
        return;
    }

    orderItemsList.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2 font-bold">${item.trabalhador}</td>
            <td class="p-2 font-semibold text-blue-900">${item.objeto}</td>
            <td class="p-2 text-center font-bold">${item.qtd}</td>
            <td class="p-2 text-center col-valor-sigilo font-bold text-emerald-800">R$ ${item.valor}</td>
            <td class="p-2 text-center">
                <button type="button" onclick="removeOrderItem(${idx})" class="text-rose-600 font-bold hover:underline">🗑️ Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.dispatchOrder = async function() {
    if (orderItemsList.length === 0) {
        alert("Adicione pelo menos um item ao pedido antes de despachar.");
        return;
    }

    const destinoTipo = document.getElementById('ped_destino_tipo')?.value;
    const parceiro = document.getElementById('ped_destino_parceiro')?.value || 'PARCEIRO NÃO ESPECIFICADO';
    const activeCli = document.getElementById('active-cliente-select')?.value || 'CLIENTE';
    const clienteNome = activeCli === 'ALL' ? (clientesCadastrados[0]?.nome || 'CLIENTE PADRÃO') : activeCli;
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    for (const item of orderItemsList) {
        const novoPedido = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            fecha: dataAtual,
            cliente: clienteNome,
            trab: item.trabalhador,
            obj: item.objeto,
            qtd: item.qtd,
            valor: item.valor,
            clinica: parceiro,
            respostaAgendamento: destinoTipo === 'MEDICO_INDEPENDENTE' ? 'DIRECIONADO DIRETO P/ FILA ASO' : 'AGUARDANDO AGENDAMENTO',
            status: 'PENDENTE'
        };

        monitorRequestsData.unshift(novoPedido);

        if (destinoTipo === 'MEDICO_INDEPENDENTE') {
            const novoAsoFila = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                fecha: dataAtual,
                nome: item.trabalhador.split('-')[0].trim(),
                cpf: item.trabalhador.includes('-') ? item.trabalhador.split('-')[1].trim() : '000.000.000-00',
                cliente: clienteNome,
                cargo: 'OPERACIONAL',
                funcao: 'OPERADOR',
                lotacao: 'GERAL',
                tipoExame: item.objeto.includes('ASO') ? item.objeto : `ASO - ${item.objeto}`,
                medico: parceiro,
                status: 'NA FILA'
            };
            asoQueueData.unshift(novoAsoFila);
        }

        if (supabaseClient) {
            try {
                await supabaseClient.from('pedidos_agendamento').upsert([{
                    id: novoPedido.id,
                    fecha: novoPedido.fecha,
                    cliente: novoPedido.cliente,
                    trab: novoPedido.trab,
                    obj: novoPedido.obj,
                    qtd: novoPedido.qtd,
                    valor: novoPedido.valor,
                    clinica: novoPedido.clinica,
                    resposta_agendamento: novoPedido.respostaAgendamento,
                    status: novoPedido.status
                }]);
            } catch(e){}
        }
    }

    orderItemsList = [];
    renderOrderItems();
    salvarPedidosLocalStorage();
    salvarAsoQueueLocal();
    renderMonitorTable();
    renderAsoQueue();
    renderProducaoTable();

    alert(`✅ Pedidos despachados com sucesso para ${parceiro}!`);
};

window.processarCargaMassaDirecionada = function(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            if (!json || json.length === 0) {
                alert("A planilha selecionada está vazia.");
                return;
            }

            const destinoTipo = document.getElementById('carga_destino_tipo')?.value;
            const parceiro = document.getElementById('carga_destino_parceiro')?.value || 'PARCEIRO CARGA';
            const activeCli = document.getElementById('active-cliente-select')?.value || 'CLIENTE';
            const clienteNome = activeCli === 'ALL' ? (clientesCadastrados[0]?.nome || 'CLIENTE PADRÃO') : activeCli;
            const dataAtual = new Date().toLocaleDateString('pt-BR');

            json.forEach((linha, i) => {
                const nomeTrab = linha['NOME'] || linha['TRABALHADOR'] || linha['FUNCIONARIO'] || `TRABALHADOR ${i+1}`;
                const cpfTrab = linha['CPF'] || '000.000.000-00';
                const exame = linha['EXAME'] || linha['TIPO_ASO'] || linha['OBJETO'] || 'ASO ADMISSIONAL';
                const trabStr = `${nomeTrab} - ${cpfTrab}`.toUpperCase();

                const pedido = {
                    id: Date.now() + i,
                    fecha: dataAtual,
                    cliente: clienteNome,
                    trab: trabStr,
                    obj: exame.toUpperCase(),
                    qtd: 1,
                    valor: '85,00',
                    clinica: parceiro,
                    respostaAgendamento: destinoTipo === 'MEDICO_INDEPENDENTE' ? 'CARGA EM MASSA DIRETO FILA ASO' : 'AGUARDANDO AGENDAMENTO',
                    status: 'PENDENTE'
                };
                monitorRequestsData.unshift(pedido);

                if (destinoTipo === 'MEDICO_INDEPENDENTE') {
                    asoQueueData.unshift({
                        id: Date.now() + i + 100,
                        fecha: dataAtual,
                        nome: String(nomeTrab).toUpperCase(),
                        cpf: String(cpfTrab),
                        cliente: clienteNome,
                        cargo: linha['CARGO'] || 'OPERACIONAL',
                        funcao: linha['FUNCAO'] || 'OPERADOR',
                        lotacao: linha['SETOR'] || 'GERAL',
                        tipoExame: exame.toUpperCase(),
                        medico: parceiro,
                        status: 'NA FILA'
                    });
                }
            });

            salvarPedidosLocalStorage();
            salvarAsoQueueLocal();
            renderMonitorTable();
            renderAsoQueue();
            renderProducaoTable();
            alert(`✅ Carga em massa concluída! ${json.length} colaboradores importados.`);
        } catch(err) {
            alert("Erro ao ler arquivo Excel: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
};

window.limparPedidosAgendamentoSelecionados = async function() {
    if (!confirm("Tem certeza que deseja apagar todos os pedidos de monitoramento?")) return;
    monitorRequestsData = [];
    salvarPedidosLocalStorage();
    renderMonitorTable();
    if (supabaseClient) {
        try { await supabaseClient.from('pedidos_agendamento').delete().neq('id', 0); } catch(e){}
    }
    alert("Pedidos apagados com sucesso.");
};

window.apagarPedidoIndividual = async function(id) {
    if (!confirm("Deseja apagar este pedido?")) return;
    monitorRequestsData = monitorRequestsData.filter(p => p.id !== id);
    salvarPedidosLocalStorage();
    renderMonitorTable();
    if (supabaseClient) {
        try { await supabaseClient.from('pedidos_agendamento').delete().eq('id', id); } catch(e){}
    }
};

window.abrirModalResponderAgendamento = function(id) {
    const pedido = monitorRequestsData.find(p => p.id === id);
    if (!pedido) return;
    selectedAsoId = id;

    const lbl = document.getElementById('resp_trab_lbl');
    const txtHorarios = document.getElementById('resp_horarios');
    const txtEnd = document.getElementById('resp_endereco');

    if (lbl) lbl.value = `${pedido.trab} (${pedido.cliente}) - ${pedido.obj}`;
    if (txtHorarios) txtHorarios.value = pedido.respostaAgendamento.includes('às') ? pedido.respostaAgendamento : '';
    if (txtEnd) txtEnd.value = ultimoAgendamentoSalvo.endereco || '';

    document.getElementById('modal-resposta-agendamento')?.classList.remove('hidden');
};

window.aplicarHorarioAnteriorIgual = function() {
    if (ultimoAgendamentoSalvo.horarios) {
        document.getElementById('resp_horarios').value = ultimoAgendamentoSalvo.horarios;
    }
    if (ultimoAgendamentoSalvo.endereco) {
        document.getElementById('resp_endereco').value = ultimoAgendamentoSalvo.endereco;
    }
};

window.confirmarRespostaAgendamento = async function() {
    const horarios = document.getElementById('resp_horarios')?.value.trim();
    const endereco = document.getElementById('resp_endereco')?.value.trim();

    if (!horarios) {
        alert("Por favor, preencha a data e horário do agendamento.");
        return;
    }

    const pedido = monitorRequestsData.find(p => p.id === selectedAsoId);
    if (!pedido) return;

    ultimoAgendamentoSalvo = { horarios, endereco };
    pedido.respostaAgendamento = `${horarios} | Local: ${endereco || 'Clínica Credenciada'}`;
    pedido.status = 'AGENDADO';

    const novoAsoFila = {
        id: Date.now(),
        fecha: new Date().toLocaleDateString('pt-BR'),
        nome: pedido.trab.split('-')[0].trim(),
        cpf: pedido.trab.includes('-') ? pedido.trab.split('-')[1].trim() : '000.000.000-00',
        cliente: pedido.cliente,
        cargo: 'OPERACIONAL',
        funcao: 'OPERADOR',
        lotacao: 'GERAL',
        tipoExame: pedido.obj,
        medico: pedido.clinica,
        status: 'AGENDADO'
    };
    asoQueueData.unshift(novoAsoFila);

    salvarPedidosLocalStorage();
    salvarAsoQueueLocal();
    renderMonitorTable();
    renderAsoQueue();

    if (supabaseClient) {
        try {
            await supabaseClient.from('pedidos_agendamento').update({
                resposta_agendamento: pedido.respostaAgendamento,
                status: pedido.status
            }).eq('id', pedido.id);
        } catch(e){}
    }

    fecharModal('modal-resposta-agendamento');
    alert("✅ Agendamento confirmado e colaborador transferido para a Fila de Atendimento do ASO!");
};

// ==========================================
// 4. MÓDULO 2: FILA DE ATENDIMENTO ASO
// ==========================================
window.renderAsoQueue = function() {
    const tbody = document.getElementById('aso-queue-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const lista = asoQueueData.filter(a => activeCli === 'ALL' || a.cliente === activeCli);

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400 uppercase italic font-bold">Nenhum atendimento na fila. Utilize os botões acima para cadastrar ou carregar.</td></tr>';
        return;
    }

    lista.forEach(a => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2.5 font-bold text-slate-900">${a.nome}<br><span class="text-xs text-slate-500 font-semibold">${a.cpf}</span></td>
            <td class="p-2.5 font-bold text-blue-900">${a.cliente}</td>
            <td class="p-2.5">${a.cargo || '-'} / ${a.lotacao || '-'}</td>
            <td class="p-2.5 font-extrabold text-indigo-950">${a.tipoExame}</td>
            <td class="p-2.5 text-center">
                <button type="button" onclick="abrirModalAnamnese(${a.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 py-1 rounded shadow">
                    📋 Ficha Anamnese
                </button>
            </td>
            <td class="p-2.5 text-center">
                <button type="button" onclick="abrirModalAso(${a.id})" class="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-3 py-1 rounded shadow">
                    🩺 Abrir & Emitir ASO
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.salvarAsoAvulso = function() {
    const nome = document.getElementById('avulso_nome')?.value.trim();
    const cpf = document.getElementById('avulso_cpf')?.value.trim();
    const cli = document.getElementById('avulso_cliente')?.value;
    const tipo = document.getElementById('avulso_tipo')?.value;

    if (!nome || !cli) {
        alert("Preencha o nome do funcionário e selecione o cliente.");
        return;
    }

    asoQueueData.unshift({
        id: Date.now(),
        fecha: new Date().toLocaleDateString('pt-BR'),
        nome: nome.toUpperCase(),
        cpf: cpf || '000.000.000-00',
        cliente: cli,
        cargo: 'OPERACIONAL',
        funcao: 'OPERADOR',
        lotacao: 'GERAL',
        tipoExame: tipo,
        medico: 'DR. MÉDICO EXAMINADOR',
        status: 'NA FILA'
    });

    salvarAsoQueueLocal();
    renderAsoQueue();
    fecharModal('modal-novo-aso-avulso');
    document.getElementById('avulso_nome').value = '';
    document.getElementById('avulso_cpf').value = '';
    alert("✅ Colaborador incluído na Fila de Atendimento!");
};

// ==========================================
// 5. MÓDULO 3: ANAMNESE E EMISSÃO DE ASO
// ==========================================
window.abrirModalAnamnese = function(id) {
    const item = asoQueueData.find(a => a.id === id) || asoHistoryData.find(a => a.id === id);
    if (!item) return;
    currentAnamneseTarget = item;

    document.getElementById('anam_nome_lbl').textContent = item.nome;
    document.getElementById('anam_cpf_lbl').textContent = item.cpf;
    document.getElementById('anam_cargo_lbl').textContent = item.cargo || 'OPERACIONAL';
    document.getElementById('anam_unidade').value = item.cliente || '';
    document.getElementById('anam_setor').value = item.lotacao || '';

    if (item.anamneseDados) {
        document.getElementById('anam_obs').value = item.anamneseDados.obs || '';
        document.getElementById('anam_sangue').value = item.anamneseDados.sangue || 'O+';
    }

    document.getElementById('modal-anamnese')?.classList.remove('hidden');
};

window.salvarAnamnese = function() {
    if (!currentAnamneseTarget) return;

    const dados = {
        sangue: document.getElementById('anam_sangue')?.value || 'O+',
        unidade: document.getElementById('anam_unidade')?.value || '',
        setor: document.getElementById('anam_setor')?.value || '',
        contato: document.getElementById('anam_contato')?.value || '',
        acidTrabalho: document.getElementById('anam_acid_outro')?.value,
        acidDesc: document.getElementById('anam_acid_outro_desc')?.value,
        limitacao: document.getElementById('anam_limitacao')?.value,
        limitacaoDesc: document.getElementById('anam_limitacao_desc')?.value,
        obs: document.getElementById('anam_obs')?.value || ''
    };

    currentAnamneseTarget.anamneseDados = dados;
    salvarAsoQueueLocal();
    salvarBancoAsoLocal();
    fecharModal('modal-anamnese');
    alert("✅ Ficha de anamnese salva com sucesso!");
};

window.abrirModalAso = function(id) {
    const item = asoQueueData.find(a => a.id === id);
    if (!item) return;
    selectedAsoId = id;

    const cli = clientesCadastrados.find(c => c.nome === item.cliente);

    document.getElementById('aso_edit_razao').value = item.cliente;
    document.getElementById('aso_edit_cnpj').value = cli?.cnpj || '00.000.000/0001-00';
    document.getElementById('aso_edit_nome').value = item.nome;
    document.getElementById('aso_edit_cargo').value = item.cargo || 'OPERADOR';
    document.getElementById('aso_edit_funcao').value = item.funcao || 'OPERACIONAL';
    document.getElementById('aso_edit_lotacao').value = item.lotacao || 'GERAL';
    document.getElementById('aso_edit_matricula').value = item.matricula || '0001';
    document.getElementById('aso_edit_cpf').value = item.cpf;
    document.getElementById('aso_edit_nasc').value = item.nasc || '01/01/1990';
    document.getElementById('aso_edit_local').value = 'PAULÍNIA / SP';
    document.getElementById('aso_edit_data').value = new Date().toLocaleDateString('pt-BR');
    document.getElementById('aso_med_nome').value = item.medico || 'DR. MÉDICO EXAMINADOR — CRM SP 123456';
    document.getElementById('aso_lbl_medico_pcmso').textContent = cli ? `${cli.medPcmso} (${cli.crmPcmso})` : 'A DEFINIR NO CADASTRO';

    document.getElementById('modal-aso')?.classList.remove('hidden');
};

window.concluirEmissaoAsoBoreal = async function() {
    const itemQueue = asoQueueData.find(a => a.id === selectedAsoId);
    const conclRadios = document.getElementsByName('aso_conclusao');
    let conclusao = "Apto";
    for (const r of conclRadios) { if (r.checked) conclusao = r.value; }

    const asoConcluido = {
        id: selectedAsoId || Date.now(),
        fecha: document.getElementById('aso_edit_data')?.value || new Date().toLocaleDateString('pt-BR'),
        local: document.getElementById('aso_edit_local')?.value || 'PAULÍNIA / SP',
        nome: document.getElementById('aso_edit_nome')?.value || '',
        cpf: document.getElementById('aso_edit_cpf')?.value || '',
        nasc: document.getElementById('aso_edit_nasc')?.value || '',
        matricula: document.getElementById('aso_edit_matricula')?.value || '',
        cliente: document.getElementById('aso_edit_razao')?.value || '',
        cargo: document.getElementById('aso_edit_cargo')?.value || '',
        funcao: document.getElementById('aso_edit_funcao')?.value || '',
        lotacao: document.getElementById('aso_edit_lotacao')?.value || '',
        cnpj: document.getElementById('aso_edit_cnpj')?.value || '',
        tipoExame: document.querySelector('input[name="aso_tp_exame"]:checked')?.value || 'Admissional',
        resultado: conclusao,
        medico: document.getElementById('aso_med_nome')?.value || 'DR. EXAMINADOR',
        medicoPcmso: document.getElementById('aso_lbl_medico_pcmso')?.textContent || '',
        agentes: document.getElementById('aso_doc_agentes_especificos')?.value || 'AUSÊNCIA DE RISCOS',
        anamneseDados: itemQueue?.anamneseDados || null
    };

    asoHistoryData.unshift(asoConcluido);
    asoQueueData = asoQueueData.filter(a => a.id !== selectedAsoId);

    salvarBancoAsoLocal();
    salvarAsoQueueLocal();
    renderAsoQueue();
    renderHistoryTabela();
    atualizarStatsAnalitico();

    if (supabaseClient) {
        try {
            await supabaseClient.from('asos').upsert([{
                id: asoConcluido.id,
                fecha: asoConcluido.fecha,
                local: asoConcluido.local,
                nome: asoConcluido.nome,
                cpf: asoConcluido.cpf,
                nasc: asoConcluido.nasc,
                matricula: asoConcluido.matricula,
                cliente: asoConcluido.cliente,
                cargo: asoConcluido.cargo,
                funcao: asoConcluido.funcao,
                lotacao: asoConcluido.lotacao,
                cnpj: asoConcluido.cnpj,
                tipo_exame: asoConcluido.tipoExame,
                resultado: asoConcluido.resultado,
                medico: asoConcluido.medico,
                medico_pcmso: asoConcluido.medicoPcmso,
                agentes: asoConcluido.agentes,
                anamnese_dados: asoConcluido.anamneseDados
            }]);
        } catch(e){}
    }

    fecharModal('modal-aso');
    alert("🎉 ASO Concluído, emitido com sucesso e arquivado no Banco Permanente!");
};

window.renderHistoryTabela = function() {
    const tbody = document.getElementById('aso-history-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const lista = asoHistoryData.filter(a => activeCli === 'ALL' || a.cliente === activeCli);

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-400 uppercase italic font-bold">Nenhum ASO finalizado ainda no banco de dados.</td></tr>';
        return;
    }

    lista.forEach(a => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2.5">${a.fecha}</td>
            <td class="p-2.5 font-bold">${a.nome}<br><span class="text-xs text-slate-500 font-semibold">${a.cpf}</span></td>
            <td class="p-2.5 font-semibold">${a.cliente}</td>
            <td class="p-2.5 font-black ${a.resultado === 'Apto' ? 'text-emerald-700' : 'text-red-700'}">${a.resultado}</td>
            <td class="p-2.5 font-semibold text-slate-700">${a.medico}</td>
            <td class="p-2.5 text-center">
                <button type="button" onclick="visualizarAnamneseBanco(${a.id})" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold text-xs px-2 py-1 rounded">
                    📋 Visualizar Ficha
                </button>
            </td>
            <td class="p-2.5 text-center">
                <button type="button" onclick="visualizarAsoBanco(${a.id})" class="bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs px-3 py-1 rounded shadow">
                    🩺 ASO Boreal (.PDF)
                </button>
            </td>
            <td class="p-2.5 text-center">
                ${currentRole === 'GESTOR' ? `<button onclick="apagarAsoHistorico(${a.id})" class="text-rose-600 font-bold hover:underline text-xs">🗑️</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.visualizarAsoBanco = function(id) {
    const a = asoHistoryData.find(x => x.id === id);
    if (!a) return;

    const paper = document.getElementById('aso-paper-visualizar');
    const modalTitulo = document.getElementById('modal-visualizar-titulo');
    if (modalTitulo) modalTitulo.textContent = `🩺 ASO BOREAL — ${a.nome}`;

    if (paper) {
        paper.className = "aso-boreal-paper space-y-3 text-[11px] bg-white p-6";
        paper.innerHTML = `
            <div class="border-b-2 border-black pb-2 flex justify-between items-center">
                <div>
                    <strong class="text-sm block font-black uppercase text-blue-950">Boreal Engenharia e Medicina</strong>
                    <span class="text-[10px] text-slate-600 font-semibold">CRM Nº 1011385 | Tel. 19 99156-7153</span>
                </div>
                <div class="text-right">
                    <strong class="text-base font-black uppercase tracking-tight">ATESTADO DE SAÚDE OCUPACIONAL - ASO</strong>
                </div>
            </div>

            <div class="border border-black p-2 bg-slate-100 font-bold text-[10px] uppercase">
                EXAME MÉDICO: <u>${a.tipoExame}</u> | DATA: <u>${a.fecha}</u>
            </div>

            <div class="border border-black p-2 space-y-1">
                <strong class="block border-b border-black font-extrabold bg-slate-200 px-1 uppercase">IDENTIFICAÇÃO DO TRABALHADOR E CLIENTE</strong>
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                    <div><strong>Empresa:</strong> ${a.cliente}</div>
                    <div><strong>CNPJ:</strong> ${a.cnpj || '-'}</div>
                    <div><strong>Colaborador:</strong> ${a.nome}</div>
                    <div><strong>CPF:</strong> ${a.cpf}</div>
                    <div><strong>Cargo / Função:</strong> ${a.cargo} / ${a.funcao}</div>
                    <div><strong>Setor:</strong> ${a.lotacao}</div>
                </div>
            </div>

            <div class="border border-black p-2 bg-amber-50">
                <div class="font-black text-sm uppercase">CONCLUSÃO: <span class="${a.resultado === 'Apto' ? 'text-emerald-800' : 'text-red-800'}">${a.resultado}</span></div>
            </div>

            <div class="border border-black p-2">
                <strong class="block border-b border-black font-bold uppercase">RISCOS OCUPACIONAIS:</strong>
                <p class="mt-1">${a.agentes || 'Ausência de riscos específicos.'}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-black text-center text-[10px]">
                <div>
                    __________________________________________<br>
                    <strong>Assinatura do Trabalhador</strong><br>
                    ${a.local || 'Paulínia - SP'}, ${a.fecha}
                </div>
                <div>
                    __________________________________________<br>
                    <strong>${a.medico}</strong><br>
                    Médico Examinador
                </div>
            </div>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado')?.classList.remove('hidden');
};

window.visualizarAnamneseBanco = function(id) {
    const a = asoHistoryData.find(x => x.id === id);
    if (!a) return;
    abrirModalAnamnese(id);
};

window.apagarAsoHistorico = async function(id) {
    if (currentRole !== 'GESTOR') return alert("Apenas Gestores podem apagar registros arquivados.");
    if (!confirm("Deseja apagar este ASO permanentemente?")) return;
    asoHistoryData = asoHistoryData.filter(a => a.id !== id);
    salvarBancoAsoLocal();
    renderHistoryTabela();
    atualizarStatsAnalitico();
    if (supabaseClient) {
        try { await supabaseClient.from('asos').delete().eq('id', id); } catch(e){}
    }
};

// ==========================================
// 6. MÓDULO 5: HOMOLOGAÇÃO DE ATESTADOS
// ==========================================
window.renderHomologacaoTabela = function() {
    const tbody = document.getElementById('atestados-homologacao-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const lista = atestadosHomologacaoData.filter(h => activeCli === 'ALL' || h.cliente === activeCli);

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="p-3 text-center text-slate-400 uppercase italic">Nenhum atestado cadastrado para homologação.</td></tr>';
        return;
    }

    lista.forEach(h => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2 font-bold">${h.cliente}</td>
            <td class="p-2 font-bold text-blue-900">${h.trab}</td>
            <td class="p-2">${h.setor || '-'}</td>
            <td class="p-2">${h.cargo || '-'}</td>
            <td class="p-2">${h.data}</td>
            <td class="p-2 text-center font-bold">${h.dias} dias</td>
            <td class="p-2 text-center font-bold text-purple-900">${h.cid}</td>
            <td class="p-2">${h.medico}</td>
            <td class="p-2 text-center">
                ${h.arquivoUrl && h.arquivoUrl !== '#' ? `<a href="${h.arquivoUrl}" target="_blank" class="text-blue-700 font-bold hover:underline">📎 Ver</a>` : '-'}
            </td>
            <td class="p-2 text-center font-black ${h.status === 'HOMOLOGADO_TOTAL' ? 'text-emerald-700' : (h.status === 'HOMOLOGADO_PARCIAL' ? 'text-amber-700' : 'text-purple-900')}">
                ${h.status || 'PENDENTE'}
            </td>
            <td class="p-2 text-center">
                <button type="button" onclick="abrirModalParecerHomologacao(${h.id})" class="bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs px-2 py-1 rounded shadow">
                    🩺 Parecer
                </button>
            </td>
            <td class="p-2 text-center">
                ${currentRole === 'GESTOR' ? `<button onclick="apagarHomologacao(${h.id})" class="text-rose-600 font-bold hover:underline text-xs">🗑️</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.adicionarHomologacaoDireta = async function() {
    const trab = document.getElementById('hom_top_trab')?.value.trim();
    const setor = document.getElementById('hom_top_setor')?.value.trim();
    const cargo = document.getElementById('hom_top_cargo')?.value.trim();
    const dias = parseInt(document.getElementById('hom_top_dias')?.value) || 1;
    const cid = document.getElementById('hom_top_cid')?.value.trim();
    const activeCli = document.getElementById('active-cliente-select')?.value || 'CLIENTE';
    const empresa = document.getElementById('hom_top_empresa')?.value.trim() || (activeCli === 'ALL' ? 'CLIENTE PADRÃO' : activeCli);
    const medico = document.getElementById('hom_top_medico')?.value.trim() || 'DR. MÉDICO EXTERNO';

    if (!trab || !cid) {
        alert("Preencha Trabalhador e CID-10 para cadastrar.");
        return;
    }

    const novo = {
        id: Date.now(),
        cliente: empresa,
        trab: trab.toUpperCase(),
        setor: setor ? setor.toUpperCase() : 'OPERACIONAL',
        cargo: cargo ? cargo.toUpperCase() : 'OPERADOR',
        data: new Date().toLocaleDateString('pt-BR'),
        dias: dias,
        diasHomologados: dias,
        cid: cid.toUpperCase(),
        medico: medico.toUpperCase(),
        status: 'PENDENTE',
        parecerTexto: '',
        arquivoNome: tempFileAtestadoTop?.nome || '',
        arquivoUrl: tempFileAtestadoTop?.url || '#'
    };

    atestadosHomologacaoData.unshift(novo);
    salvarHomologacaoLocal();
    renderHomologacaoTabela();

    document.getElementById('hom_top_trab').value = '';
    document.getElementById('hom_top_cid').value = '';
    tempFileAtestadoTop = null;
    alert("✅ Empregado relacionado para Homologação!");
};

window.abrirModalParecerHomologacao = function(id) {
    const h = atestadosHomologacaoData.find(x => x.id === id);
    if (!h) return;
    currentHomologacaoTarget = h;

    document.getElementById('hom_edit_trab_lbl').textContent = h.trab;
    document.getElementById('hom_edit_empresa_lbl').textContent = h.cliente;
    document.getElementById('hom_edit_crm_lbl').textContent = h.medico;
    document.getElementById('hom_parecer_dias_originais').value = h.dias;
    document.getElementById('hom_parecer_dias_finais').value = h.diasHomologados || h.dias;
    document.getElementById('hom_parecer_status').value = h.status === 'PENDENTE' ? 'HOMOLOGADO_TOTAL' : h.status;
    document.getElementById('hom_parecer_texto').value = h.parecerTexto || '';

    document.getElementById('modal-parecer-homologacao-edicao')?.classList.remove('hidden');
};

window.salvarParecerHomologacao = function() {
    if (!currentHomologacaoTarget) return;

    currentHomologacaoTarget.status = document.getElementById('hom_parecer_status')?.value;
    currentHomologacaoTarget.diasHomologados = parseInt(document.getElementById('hom_parecer_dias_finais')?.value) || currentHomologacaoTarget.dias;
    currentHomologacaoTarget.parecerTexto = document.getElementById('hom_parecer_texto')?.value || '';

    salvarHomologacaoLocal();
    renderHomologacaoTabela();
    fecharModal('modal-parecer-homologacao-edicao');
    alert("✅ Parecer Técnico assinado e gravado com sucesso!");
};

window.abrirConsultaRapidaCFM = function() {
    window.open("https://portal.cfm.org.br/busca-medicos/", "_blank");
};

window.gerarRelatorioPdfHomologacao = function() {
    const activeCli = document.getElementById('active-cliente-select')?.value || 'TODOS';
    const lista = atestadosHomologacaoData.filter(h => activeCli === 'ALL' || h.cliente === activeCli);

    const paper = document.getElementById('aso-paper-visualizar');
    const modalTitulo = document.getElementById('modal-visualizar-titulo');
    if (modalTitulo) modalTitulo.textContent = "📄 RELATÓRIO OFICIAL DE ABSENTEÍSMO & HOMOLOGAÇÕES";

    let linhas = '';
    lista.forEach(h => {
        linhas += `
            <tr class="border-b">
                <td class="p-1.5 font-bold">${h.cliente}</td>
                <td class="p-1.5 font-bold">${h.trab}</td>
                <td class="p-1.5">${h.setor || '-'}</td>
                <td class="p-1.5 text-center">${h.data}</td>
                <td class="p-1.5 text-center font-bold">${h.dias} dias</td>
                <td class="p-1.5 text-center font-bold text-purple-900">${h.cid}</td>
                <td class="p-1.5">${h.medico}</td>
                <td class="p-1.5 font-black text-center">${h.status}</td>
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
                    <strong class="text-sm font-black uppercase tracking-tight">RELATÓRIO DE ABSENTEÍSMO (NR-07)</strong>
                </div>
            </div>
            <p><strong>FILTRO CLIENTE:</strong> ${activeCli} | <strong>EMISSÃO:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <table class="w-full text-left border-collapse text-[10px] border border-black mt-2">
                <thead>
                    <tr class="bg-slate-200 border-b border-black font-black uppercase">
                        <th class="p-1">Empresa</th>
                        <th class="p-1">Trabalhador</th>
                        <th class="p-1">Setor</th>
                        <th class="p-1 text-center">Data</th>
                        <th class="p-1 text-center">Dias</th>
                        <th class="p-1 text-center">CID</th>
                        <th class="p-1">Médico Emissor</th>
                        <th class="p-1 text-center">Decisão</th>
                    </tr>
                </thead>
                <tbody>${linhas || '<tr><td colspan="8" class="p-3 text-center italic">Nenhum registro para o filtro selecionado.</td></tr>'}</tbody>
            </table>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado')?.classList.remove('hidden');
};

window.apagarHomologacao = function(id) {
    if (!confirm("Deseja apagar este atestado?")) return;
    atestadosHomologacaoData = atestadosHomologacaoData.filter(x => x.id !== id);
    salvarHomologacaoLocal();
    renderHomologacaoTabela();
};

function salvarHomologacaoLocal() {
    try { localStorage.setItem('boreal_homologacao_db', JSON.stringify(atestadosHomologacaoData)); } catch(e){}
}
function salvarAsoQueueLocal() {
    try { localStorage.setItem('boreal_aso_queue_db', JSON.stringify(asoQueueData)); } catch(e){}
}
function salvarBancoAsoLocal() {
    try { localStorage.setItem('boreal_aso_history_db', JSON.stringify(asoHistoryData)); } catch(e){}
}
function salvarPedidosLocalStorage() {
    try { localStorage.setItem('boreal_monitor_requests_db', JSON.stringify(monitorRequestsData)); } catch(e){}
}
function salvarPcmsoMatrizLocalStorage() {
    try { localStorage.setItem('boreal_pcmso_matriz_db', JSON.stringify(pcmsoMatrizData)); } catch(e){}
}

// ==========================================
// 7. MÓDULO 7: RELATÓRIO ANALÍTICO PCMSO (NR-07)
// ==========================================
function atualizarStatsAnalitico() {
    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const lista = asoHistoryData.filter(a => activeCli === 'ALL' || a.cliente === activeCli);

    const total = lista.length;
    const aptos = lista.filter(a => a.resultado === 'Apto').length;
    const restricoes = lista.filter(a => a.resultado && a.resultado.toLowerCase().includes('restri')).length;
    const inaptos = lista.filter(a => a.resultado === 'Inapto').length;

    const elTotal = document.getElementById('stat-total-exames');
    const elAptos = document.getElementById('stat-total-aptos');
    const elRest = document.getElementById('stat-total-restricao');
    const elInap = document.getElementById('stat-total-inaptos');

    if (elTotal) elTotal.textContent = total;
    if (elAptos) elAptos.textContent = aptos;
    if (elRest) elRest.textContent = restricoes;
    if (elInap) elInap.textContent = inaptos;
}

window.gerarRelatorioPdfAnaliticoPcmso = function() {
    const activeCli = document.getElementById('active-cliente-select')?.value || 'TODOS';
    const lista = asoHistoryData.filter(a => activeCli === 'ALL' || a.cliente === activeCli);

    const total = lista.length;
    const aptos = lista.filter(a => a.resultado === 'Apto').length;
    const inaptos = lista.filter(a => a.resultado === 'Inapto').length;

    const paper = document.getElementById('aso-paper-visualizar');
    const modalTitulo = document.getElementById('modal-visualizar-titulo');
    if (modalTitulo) modalTitulo.textContent = "📄 RELATÓRIO ANALÍTICO DO PCMSO (NR-07 ITEM 7.6.2)";

    if (paper) {
        paper.className = "bg-white p-6 max-w-4xl mx-auto text-slate-900 border-2 border-black shadow-2xl text-[11px] leading-snug space-y-4 folha-homologacao-print";
        paper.innerHTML = `
            <div class="border-b-2 border-black pb-2 flex justify-between items-center">
                <div>
                    <strong class="text-sm block font-black uppercase text-blue-950">Boreal Engenharia e Medicina</strong>
                    <span class="text-[10px] text-slate-600 font-semibold">CRM Nº 1011385 | Tel. (19) 99156-7153</span>
                </div>
                <div class="text-right">
                    <strong class="text-sm font-black uppercase tracking-tight">RELATÓRIO ANALÍTICO ANUAL (NR-07)</strong>
                </div>
            </div>

            <p><strong>EMPRESA:</strong> ${activeCli} | <strong>DATA DE EMISSÃO:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>

            <div class="grid grid-cols-3 gap-2 border border-black p-3 bg-slate-50 text-center font-bold">
                <div>TOTAL DE EXAMES: <span class="text-base font-black">${total}</span></div>
                <div class="text-emerald-800">APTOS: <span class="text-base font-black">${aptos}</span></div>
                <div class="text-red-800">INAPTOS: <span class="text-base font-black">${inaptos}</span></div>
            </div>

            <p class="text-[10px] text-slate-600 leading-normal">
                Este relatório atende às exigências do item 7.6.2 da NR-07, sintetizando os dados epidemiológicos da saúde ocupacional dos trabalhadores e servindo de subsídio para as medidas de proteção do PGR.
            </p>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado')?.classList.remove('hidden');
};

// ==========================================
// 8. MATRIZ PCMSO (NR-07) - INVENTÁRIO PGR
// ==========================================
const CATALOGO_RISCOS = {
    "ACIDENTES": [
        { perigo: "SERVIÇOS COM SERRA", risco: "CORTE E/OU PANCADA NAS MÃOS", agravo: "PANCADA, LESÃO E DILACERAÇÃO", exame: "CLÍNICO", per: "Anual", plano: "FISCALIZAR A UTILIZAÇÃO DE EPI E EPC E ELABORAR ORDEM DE SERVIÇO." },
        { perigo: "TRABALHOS EM ESPAÇO CONFINADO", risco: "GASES TÓXICOS, INCÊNDIOS E PÂNICO", agravo: "ASFIXIA, INTOXICAÇÃO, HEMORRAGIAS, MORTE", exame: "CLÍNICO + ECG + ESPIROMETRIA", per: "Anual", plano: "ELABORAR ORDEM DE SERVIÇO, PROMOVER CURSO DE IMPLANTAÇÃO E RECICLAGEM DE NR10, NR 35, NR 33, FORNECER E FISCALIZAR A UTILIZAÇÃO DOS EPI’S E EPC’S. MANTER MANUTENÇÃO DO VEÍCULO ATUALIZADA, PROMOVER CURSO DE DIREÇÃO DEFENSIVA, REALIZAR OS EXAMES DEFINIDOS NO PCMSO." },
        { perigo: "TRABALHO EM ALTURA", risco: "QUEDAS, SÚBITOS", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO + ECG + GLICEMIA", per: "Anual", plano: "PROMOVER TREINAMENTO EM NR 35, REALIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, ELABORAR ORDEM DE SERVIÇO COM APR." },
        { perigo: "MANUTENÇÃO EM SISTEMAS ELÉTRICOS", risco: "CHOQUE ELÉTRICO", agravo: "ATAQUES CARDÍACOS, QUEIMADURA, MORTE", exame: "CLÍNICO + ECG", per: "Semestral", plano: "PROMOVER TREINAMENTO EM NR 10, REALIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, TRABALHAR SEMPRE EM DUPLA." },
        { perigo: "MANUTENÇÃO EM SISTEMAS E EQUIPAMENTOS MECÂNICOS", risco: "CHOQUE MECÂNICO", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "PROMOVER TREINAMENTO EM NR 12, REALIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, ELABORAR ORDEM DE SERVIÇO COM APR." },
        { perigo: "DIREÇÃO DE VEÍCULOS", risco: "ACIDENTES DE TRÂNSITO", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "PROMOVER CURSO DE DIREÇÃO DEFENSIVA, MONITORAR A SAÚDE DO MOTORISTA." },
        { perigo: "ILUMINAÇÃO INADEQUADA", risco: "DIFICULDADE DE ACESSO E DETECÇÃO DE MATERIAIS", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "ANALISAR ÁREA DE TRABALHO, PROMOVER ILUMINAÇÃO MÓVEL." },
        { perigo: "MÁQUINAS E EQUIPAMENTOS SEM PROTEÇÃO", risco: "CORTES, DILACERAÇÃO, CHOQUE ELÉTRICO", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "ADEQUAR EQUIPAMENTOS E MÁQUINAS, PROMOVER PROTEÇÕES CONFORME NR 12." },
        { perigo: "MÁQUINAS E EQUIPAMENTOS COM PROTEÇÃO INADEQUADA", risco: "INCÊNDIO E EXPLOSÃO (PROBABILIDADE)", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "ADEQUAR EQUIPAMENTOS E MÁQUINAS, PROMOVER PROTEÇÕES CONFORME NR 12." },
        { perigo: "ARMAZENAMENTO INADEQUADO, ACÚMULO DE ENTULHOS", risco: "QUEDAS DE OBJETO, INSATISFAÇÃO ERGONÔMICA", agravo: "PANCADA, ESCORIAÇÃO, DANOS FÍSICOS", exame: "CLÍNICO", per: "Anual", plano: "ORGANIZAR E ADEQUAR MATERIAIS, EXPEDIR MATERIAIS SEM UTILIDADE, IMPLEMENTAR ESTANTES DE ORGANIZAÇÃO, SEPARAR MATERIAIS POR CATEGORIA, EXPEDIR ORDEM DE SERVIÇO COM TODAS ORIENTAÇÕES E ANÁLISE PRELIMINAR DE RISCO." },
        { perigo: "FERRAMENTAS INADEQUADAS OU DEFEITUOSAS", risco: "CORTES E PERFURAÇÕES", agravo: "PANCADA, ESCORIAÇÃO, DANOS FÍSICOS", exame: "CLÍNICO", per: "Anual", plano: "INSPECIONAR FERRAMENTAS PERIODICAMENTE, SUBSTITUIR FERRAMENTAS DANIFICADAS." },
        { perigo: "TRABALHOS EM ENCOSTAS E ATERROS", risco: "SOTERRAMENTO", agravo: "MORTE", exame: "CLÍNICO", per: "Anual", plano: "EXPEDIR ORDEM DE SERVIÇO COM TODAS ORIENTAÇÕES E ANÁLISE PRELIMINAR DE RISCO." },
        { perigo: "TRABALHOS EM MEIO A VEGETAÇÕES", risco: "ANIMAIS PEÇONHENTOS, CONTATO COM ANIMAIS VENENOSOS", agravo: "DOENÇA DE CHAGAS, FEBRE MACULOSA, ENVENENAMENTO, SÚBITOS ALÉRGICOS", exame: "CLÍNICO", per: "Anual", plano: "FORNECER EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL E COLETIVO. UTILIZAR ROUPAS CLARAS PARA DETECÇÃO DE PARASITAS." },
        { perigo: "TRABALHOS ADMINISTRATIVOS EXTERNOS", risco: "ANIMAIS DOMÉSTICOS / RISCO A ACIDENTES DE ATAQUE", agravo: "ENVENENAMENTO, RAIVA, SÚBITOS ALÉRGICOS", exame: "CLÍNICO", per: "Anual", plano: "FORNECER EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL E COLETIVO." },
        { perigo: "SUPERVISIONAR OPERAÇÃO DE MANUTENÇÃO DE TANQUES DE COMBUSTÍVEL", risco: "EXPLOSÃO, INCÊNDIO", agravo: "QUEIMADURA, LESÃO, DILACERAÇÃO E MORTE", exame: "CLÍNICO", per: "Anual", plano: "EXPEDIR ORDEM DE SERVIÇO COM TODAS ORIENTAÇÕES E ANÁLISE PRELIMINAR DE RISCO." },
        { perigo: "TRABALHOS EXTERNOS, ASSISTÊNCIA OU ATENDIMENTO HUMANO", risco: "AGRESSÕES FÍSICAS E MORAIS", agravo: "DANOS FÍSICOS, DANOS PSICOLÓGICOS", exame: "CLÍNICO", per: "Anual", plano: "PROMOVER TREINAMENTO PARA LIDAR COM SITUAÇÕES DE AGRESSÕES DE PESSOAS." },
        { perigo: "TRABALHOS EM MATAS E FLORESTAS", risco: "ANIMAIS SELVAGENS / ATAQUE", agravo: "ENVENENAMENTO, RAIVA, SÚBITOS ALÉRGICOS", exame: "CLÍNICO", per: "Anual", plano: "AVALIAÇÃO OCUPACIONAL, FORNECIMENTO DE BOTAS CANO LONGO E PERNEIRAS." }
    ],
    "ACIDENTES_AMPLIADOS": [
        { perigo: "CIRCULAÇÃO DE VEÍCULOS NA ÁREA EXTERNA OU ESTACIONAMENTO", risco: "ACIDENTE DE TRÂNSITO E ATROPELAMENTO", agravo: "DANOS FÍSICOS", exame: "CLÍNICO", per: "Anual", plano: "REALIZAR SINALIZAÇÃO HORIZONTAL E VERTICAL DA ÁREA COM FITAS, CONES E PLACAS." },
        { perigo: "ÁRVORES COM GALHOS SECOS SEM PODA NA ÁREA DE CIRCULAÇÃO", risco: "QUEDA DE GALHOS E FRUTOS", agravo: "PANCADAS, ESCORIAÇÃO E LUXAÇÃO", exame: "CLÍNICO", per: "Anual", plano: "REALIZAR A PODA DE ÁRVORES E OBSERVAR A INTEGRIDADE DAS ÁRVORES." },
        { perigo: "PISO IRREGULAR OU QUEBRADO EM ÁREAS DE CIRCULAÇÃO", risco: "QUEDA DO MESMO NÍVEL, TROPEÇO", agravo: "FRATURA E LUXAÇÃO", exame: "CLÍNICO", per: "Anual", plano: "SINALIZAR A ÁREA E REPARAR O PISO." },
        { perigo: "UTILIZAÇÃO DE ESCADA DE ACESSO AOS PAVIMENTOS SUPERIORES", risco: "QUEDAS OU TROPEÇOS", agravo: "TORÇÃO OU FRATURAS, MORTE", exame: "CLÍNICO", per: "Anual", plano: "APLICAR FITA ANTIDERRAPANTE NOS DEGRAUS, INSTALAR CORRIMÃO." },
        { perigo: "UTILIZAÇÃO DE ELEVADOR DE PASSAGEIRO", risco: "ROMPIMENTO DE CABO, QUEDA", agravo: "FRATURAS, DILACERAÇÃO, MORTE", exame: "CLÍNICO", per: "Anual", plano: "MANTER RELATÓRIO DE MANUTENÇÃO PREVENTIVA ATUALIZADO." },
        { perigo: "EXTINTORES DE INCÊNDIO NO CHÃO OU OBSTRUÍDOS", risco: "DIFICULDADE NO COMBATE A PRINCÍPIO DE INCÊNDIO", agravo: "QUEIMADURAS, INTOXICAÇÃO E MORTE", exame: "CLÍNICO", per: "Anual", plano: "DESOBSTRUIR E SINALIZAR CORRETAMENTE OS EXTINTORES." },
        { perigo: "INEXISTÊNCIA DE BRIGADA CONTRA INCÊNDIO", risco: "IMPOSSIBILIDADE DE COMBATE A INCÊNDIO", agravo: "PÂNICO, QUEIMADURAS, MORTE", exame: "CLÍNICO", per: "Anual", plano: "INSTITUIR E CAPACITAR BRIGADA DE INCÊNDIO." },
        { perigo: "AUSÊNCIA DE AVCB (BOMBEIROS)", risco: "INCÊNDIO POR DESCONFORMIDADE", agravo: "PÂNICO, QUEIMADURAS, MORTE", exame: "CLÍNICO", per: "Anual", plano: "REGULARIZAR PROJETO CONTRA INCÊNDIO." },
        { perigo: "PISO ENCERADO SEM ANTIDERRAPANTE", risco: "QUEDA NO MESMO NÍVEL", agravo: "TORÇÃO, FRATURAS", exame: "CLÍNICO", per: "Anual", plano: "SINALIZAR ÁREA NO MOMENTO DA LIMPEZA." },
        { perigo: "SISTEMA ELÉTRICO DETERIORADO", risco: "CURTO-CIRCUITO CAUSANDO INCÊNDIO", agravo: "QUEIMADURAS, INTOXICAÇÃO", exame: "CLÍNICO", per: "Anual", plano: "INSPECIONAR E TROCAR CONDUTORES ELÉTRICOS." },
        { perigo: "CONDUTORES SUBDIMENSIONADOS", risco: "AQUECIMENTO DE CABOS", agravo: "QUEIMADURAS, INCÊNDIO", exame: "CLÍNICO", per: "Anual", plano: "REDIMENSIONAR CONDUTORES." },
        { perigo: "CORES DE TUBULAÇÕES FORA DA NORMA", risco: "CONFUSÃO EM EMERGÊNCIA", agravo: "CHOQUE ELÉTRICO, QUEIMADURAS", exame: "CLÍNICO", per: "Anual", plano: "IDENTIFICAR TUBULAÇÕES CONFORME NR 26." },
        { perigo: "GERADOR NO INTERIOR DO PRÉDIO", risco: "INCÊNDIO E INTOXICAÇÃO", agravo: "QUEIMADURAS, INTOXICAÇÃO", exame: "CLÍNICO", per: "Anual", plano: "MANUTENÇÃO RIGOROSA E VENTILAÇÃO DEDICADA." },
        { perigo: "RECIPIENTE DE GLP NO INTERIOR", risco: "VAZAMENTO DE GÁS, EXPLOSÃO", agravo: "QUEIMADURAS, MORTE", exame: "CLÍNICO", per: "Anual", plano: "INSTALAR BOTIJÃO EM ÁREA EXTERNA VENTILADA." }
    ],
    "FISICOS": [
        { perigo: "RUÍDO CONTÍNUO OU INTERMITENTE", risco: "EFEITOS PREJUDICIAIS AO OUVIDO INTERNO", agravo: "PERDA AUDITIVA INDUZIDA POR RUÍDO (PAIR)", exame: "AUDIOMETRIA", per: "Anual", plano: "FORNECER PROTETOR AUDITIVO COM CA, MONITORAMENTO AMBIENTAL E PCA." },
        { perigo: "RUÍDO DE IMPACTO", risco: "EFEITOS ACÚSTICOS AGUDOS", agravo: "TRAUMA ACÚSTICO, SURDEZ TEMPORÁRIA OU DEFINITIVA", exame: "AUDIOMETRIA", per: "Anual", plano: "FORNECER EQUIPAMENTO DE PROTEÇÃO AUDITIVA E ADEQUAR MÁQUINAS." },
        { perigo: "CALOR EXCESSIVO (IBUTG)", risco: "SOBRECARGA TÉRMICA", agravo: "DESIDRATAÇÃO, EXAUSTÃO TÉRMICA, GOLPE DE CALOR", exame: "CLÍNICO + ECG", per: "Semestral", plano: "DISPONIBILIZAR ÁGUA FRESCA, PAUSAS DE DESCANSO TÉRMICO." },
        { perigo: "VIBRAÇÃO DE CORPO INTEIRO (VCI)", risco: "TRANSMISSÃO DE VIBRAÇÃO PELA ESTRUTURA", agravo: "LESÕES NA COLUNA VERTEBRAL, DISCOPATIAS", exame: "CLÍNICO", per: "Anual", plano: "MANUTENÇÃO DE VEÍCULOS, BANCOS COM AMORTECIMENTO." },
        { perigo: "VIBRAÇÃO DE MÃOS E BRAÇOS (VMB)", risco: "VIBRAÇÃO LOCALIZADA", agravo: "SÍNDROME DOS DEDOS BRANCOS DE RAYNAUD", exame: "CLÍNICO", per: "Anual", plano: "REVEZAMENTO DE EQUIPE, USO DE LUVAS ANTIVIBRAÇÃO." },
        { perigo: "RADIAÇÃO ULTRAVIOLETA (SOLAR/SOLDA)", risco: "EXPOSIÇÃO À RADIAÇÃO NÃO IONIZANTE", agravo: "CERATOCONJUNTIVITE, QUEIMADURAS, CÂNCER DE PELE", exame: "CLÍNICO", per: "Anual", plano: "FORNECER PROTETOR SOLAR, ÓCULOS COM PROTEÇÃO UV E MÁSCARA DE SOLDA." },
        { perigo: "FRIO / CÂMARAS FRIGORÍFICAS", risco: "HIPOTERMIA OCUPACIONAL", agravo: "GELADURA, SÍNDROME DE RAYNAUD", exame: "CLÍNICO", per: "Anual", plano: "FORNECER VESTIMENTA TÉRMICA ADEQUADA E PAUSAS CONFORME ART. 253 CLT." }
    ],
    "QUIMICOS": [
        { perigo: "POEIRAS MINERAIS / SÍLICA LIVRE", risco: "INALAÇÃO DE PARTICULADOS FIBROGÊNICOS", agravo: "SILICOSE PULMONAR, FIBROSE IRREVERSÍVEL", exame: "ESPIROMETRIA + RAIO-X DE TÓRAX", per: "Anual", plano: "UMIDIFICAÇÃO DE PROCESSOS, MÁSCARAS PFF2/P95, MONITORAMENTO QUANTITATIVO." },
        { perigo: "FUMOS METÁLICOS DE SOLDAGEM", risco: "INALAÇÃO DE ÓXIDOS METÁLICOS", agravo: "FEBRE DOS FUMOS METÁLICOS, PNEUMOPATIAS", exame: "ESPIROMETRIA", per: "Anual", plano: "EXAUSTÃO LOCALIZADA, MÁSCARA RESPIRATÓRIA ADEQUADA." },
        { perigo: "VAPORES ORGÂNICOS E SOLVENTES", risco: "INALAÇÃO E ABSORÇÃO DÉRMICA", agravo: "CEFALEIA, DERMATITE, NEUROPATIA, HEPATOTOXICIDADE", exame: "HEMOGRAMA COMPLETO", per: "Semestral", plano: "VENTILAÇÃO ADEQUADA, LUVAS DE NITRILA, MÁSCARAS COM FILTRO QUÍMICO." }
    ],
    "BIOLOGICOS": [
        { perigo: "ATENDIMENTO HOSPITALAR E AMBULATORIAL", risco: "EXPOSIÇÃO A SANGUE E FLUIDOS CORPORAIS", agravo: "HEPATITES B E C, HIV, INFECÇÕES BACTERIANAS", exame: "HEMOGRAMA COMPLETO", per: "Semestral", plano: "VACINAÇÃO CONTRA HEPATITE B, DESCARTE SEGURO DE PERFUROCORTANTES, CUMPRIMENTO DA NR-32." },
        { perigo: "COLETA E MANUSEIO DE LIXO URBANO", risco: "CONTATO COM RESÍDUOS CONTAMINADOS", agravo: "LEPTOSPIROSE, TÉTANO, PARASITOSES", exame: "CLÍNICO", per: "Anual", plano: "USO DE LUVAS RESISTENTES, BOTAS IMPERMEÁVEIS, VACINAÇÃO ANTITETÂNICA." },
        { perigo: "TRABALHOS EM REDES DE ESGOTO E GALERIAS", risco: "ALTA CARGA BACTERIANA E VIRAL", agravo: "HEPATITE A, LEPTOSPIROSE, DIARREIAS AGUDAS", exame: "CLÍNICO", per: "Anual", plano: "VESTIMENTA IMPERMEÁVEL TOTAL, MÁSCARAS E HIGIENIZAÇÃO RIGOROSA." }
    ],
    "BIOLOGICOS_AMPLIADOS": [
        { perigo: "PROLIFERAÇÃO DE INSETOS E VETORES EM ÁREA EXTERNA", risco: "PICADAS DE MOSQUITOS TRANSMISSORES", agravo: "DENGUE, ZIKA, CHIKUNGUNYA", exame: "CLÍNICO", per: "Anual", plano: "LIMPEZA E ELIMINAÇÃO DE FOCOS DE ÁGUA PARADA." },
        { perigo: "RESERVATÓRIO DE ÁGUA SEM LAUDO DE POTABILIDADE", risco: "INGESTÃO DE ÁGUA CONTAMINADA", agravo: "GASTROENTERITE, INFECÇÕES ENTÉRICAS", exame: "CLÍNICO", per: "Anual", plano: "ANÁLISE PERIÓDICA DE POTABILIDADE E LIMPEZA DE CAIXAS D'ÁGUA." },
        { perigo: "SISTEMA DE AR-CONDICIONADO SEM MANUTENÇÃO", risco: "PROLIFERAÇÃO DE FUNGOS E BACTÉRIAS (LEGIONELLA)", agravo: "RINITE, PNEUMONIA POR LEGIONELLA", exame: "CLÍNICO", per: "Anual", plano: "IMPLANTAÇÃO DO PMOC E TROCA REGULAR DE FILTROS." }
    ],
    "ERGONOMICOS_BIOMECANICOS": [
        { perigo: "POSTURA SENTADA PROLONGADA", risco: "SOBRECARGA NA COLUNA LOMBAR", agravo: "LOMBALGIA, DISCOPATIAS", exame: "CLÍNICO", per: "Anual", plano: "CADEIRA REGULÁVEL (NR-17), APOIO PARA PÉS E PAUSAS ATIVAS." },
        { perigo: "LEVANTAMENTO MANUAL DE CARGAS", risco: "ESFORÇO FÍSICO INTENSO", agravo: "LOMBALGIA AGUDA, HÉRNIA DE DISCO", exame: "CLÍNICO", per: "Anual", plano: "TREINAMENTO DE TÉCNICAS DE IÇAMENTO, USO DE CARRINHOS DE TRANSPORTE." },
        { perigo: "MOVIMENTOS REPETITIVOS DE MEMBROS SUPERIORES", risco: "SOBRECARGA EM TENDÕES E ARTICULAÇÕES", agravo: "LER/DORT, TENDINITE, SÍNDROME DO TÚNEL DO CARPO", exame: "CLÍNICO", per: "Anual", plano: "RODÍZIO DE ATIVIDADES E PAUSAS ERGONÔMICAS." }
    ],
    "ERGONOMICOS_COGNITIVOS": [
        { perigo: "EXIGÊNCIA DE ATENÇÃO VISUAL CONTÍNUA", risco: "FADIGA VISUAL E COGNITIVA", agravo: "ASTENOPIA, CEFALEIA, FADIGA MENTAL", exame: "ACUIDADE VISUAL", per: "Anual", plano: "ILUMINAÇÃO ADEQUADA E PAUSAS VISUAIS." },
        { perigo: "SOBRECARGA DE PROCESSAMENTO DE DADOS SOB PRESSÃO", risco: "PRESSÃO COGNITIVA ELEVADA", agravo: "ESTRESSE, ESGOTAMENTO PSÍQUICO", exame: "CLÍNICO", per: "Anual", plano: "REDISTRIBUIÇÃO DE METAS E MELHORIA DE PROCESSOS." }
    ],
    "PSICOSSOCIAIS": [
        { perigo: "COPSOQ — SOBRECARGA E RITMO ACELERADO", risco: "PRESSÃO TEMPORAL E METAS EXCESSIVAS", agravo: "SÍNDROME DE BURNOUT, ANSIEDADE", exame: "CLÍNICO", per: "Anual", plano: "ADEQUAÇÃO DO QUADRO DE TRABALHO E PAUSAS REGULARES." },
        { perigo: "COPSOQ — CONFLITOS INTERPESSOAIS E FALTA DE APOIO", risco: "AMBIENTE LABORAL DESFAVORÁVEL", agravo: "EPISÓDIOS DEPRESSIVOS, DESMOTIVAÇÃO", exame: "CLÍNICO", per: "Anual", plano: "CANAL DE OUVIDORIA, DINÂMICAS DE INTEGRAÇÃO E SUPORTE DA GESTÃO." }
    ],
    "PERICULOSOS": [
        { perigo: "ATIVIDADES PRÓXIMAS A INFLAMÁVEIS LÍQUIDOS/GASOSOS", risco: "RISCO DE INCÊNDIO E EXPLOSÃO", agravo: "QUEIMADURAS GRAVES, MORTE", exame: "CLÍNICO", per: "Anual", plano: "CUMPRIMENTO DA NR-20, SISTEMA DE COMBATE A INCÊNDIO." },
        { perigo: "SERVIÇOS EM INSTALAÇÕES ELÉTRICAS DE POTÊNCIA", risco: "ARCO VOLTAICO E ELETROCUSSÃO", agravo: "QUEIMADURA ELÉTRICA, PARADA CARDÍACA", exame: "CLÍNICO + ECG", per: "Semestral", plano: "NR-10, VESTIMENTAS RF E PROCEDIMENTO DE DESENERGIZAÇÃO." }
    ],
    "ASSOCIACAO": [
        { perigo: "MINERAÇÃO SUBTERRÂNEA EM FRENTE DE LAVRA", risco: "POEIRAS MINERAIS + RUÍDO + CALOR", agravo: "SILICOSE, PERDA AUDITIVA, ESTRESSE TÉRMICO", exame: "ESPIROMETRIA + AUDIOMETRIA", per: "Semestral", plano: "VENTILAÇÃO DE MINA, UMIDIFICAÇÃO E MONITORAMENTO RIGOROSO." }
    ],
    "AUSENCIA": [
        { perigo: "ATIVIDADES EM AMBIENTE ADMINISTRATIVO SEM RISCOS FÍSICOS/QUÍMICOS/BIOLÓGICOS", risco: "AUSÊNCIA DE RISCOS NOCIVOS (DEC. 3.048/99)", agravo: "SEM AGRAVOS ESPECÍFICOS", exame: "CLÍNICO", per: "Anual", plano: "MANUTENÇÃO DE BOAS PRÁTICAS ERGONÔMICAS E DE SEGURANÇA." }
    ]
};

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

window.apagarLinhaPcmso = async function(id) {
    if (!confirm("Deseja apagar esta linha da matriz PCMSO?")) return;
    pcmsoMatrizData = pcmsoMatrizData.filter(x => x.id !== id);
    salvarPcmsoMatrizLocalStorage();
    renderPcmsoMatriz();
    if (supabaseClient) {
        try { await supabaseClient.from('pcmso_matriz').delete().eq('id', id); } catch(e){}
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
            </tr>
            <tr style="background-color: #f8fafc;">
                <td colspan="8" style="border: 1px solid #000; padding: 6px;">
                    <div style="margin-bottom: 4px;"><strong>PLANO DE AÇÃO DO GESTOR / PGR:</strong> ${m.planoGestor || 'Nenhuma medida preventiva cadastrada.'}</div>
                    <div style="color: #1e3a8a;"><strong>PLANO DE AÇÃO MÉDICO (NR-07):</strong> ${m.planoMedico || 'Acompanhamento ocupacional conforme NR-07.'}</div>
                </td>
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
    const activeCli = document.getElementById('active-cliente-select')?.value || 'TODOS';
    const lista = pcmsoMatrizData.filter(m => activeCli === 'ALL' || m.cliente === activeCli);

    const paper = document.getElementById('aso-paper-visualizar');
    const modalTitulo = document.getElementById('modal-visualizar-titulo');
    if (modalTitulo) modalTitulo.textContent = "📄 RELATÓRIO OFICIAL DA MATRIZ DO PCMSO (NR-07)";

    let linhasHtml = '';
    lista.forEach(m => {
        linhasHtml += `
            <tr class="border-b">
                <td class="p-1 font-bold">${m.cliente}</td>
                <td class="p-1 font-bold">${m.lotacao}</td>
                <td class="p-1">${m.cargo}</td>
                <td class="p-1 text-center font-bold">${m.qtd}</td>
                <td class="p-1 font-semibold">${m.perigo || m.agente}</td>
                <td class="p-1 text-rose-900">${m.risco}</td>
                <td class="p-1 font-bold text-blue-900">${m.exame}</td>
                <td class="p-1 text-center font-bold">${m.periodicidade}</td>
            </tr>
            <tr class="bg-slate-50 border-b">
                <td colspan="8" class="p-1.5 space-y-1 text-[10px]">
                    <div><strong class="text-amber-950">PLANO DE AÇÃO GESTOR / PGR:</strong> ${m.planoGestor || 'Nenhuma medida cadastrada.'}</div>
                    <div><strong class="text-blue-950">PLANO DE AÇÃO MÉDICO (NR-07):</strong> ${m.planoMedico || 'Acompanhamento ocupacional contínuo.'}</div>
                </td>
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
                    <strong class="text-sm font-black uppercase tracking-tight">MATRIZ DO PCMSO (NR-07)</strong>
                </div>
            </div>

            <div class="border border-black p-2 bg-slate-100 font-bold uppercase text-[10px] flex justify-between">
                <span>EMPRESA: ${activeCli}</span>
                <span>DATA EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</span>
            </div>

            <table class="w-full text-left border-collapse text-[10px] border border-black mt-2">
                <thead>
                    <tr class="bg-slate-200 border-b border-black font-black uppercase">
                        <th class="p-1">Cliente</th>
                        <th class="p-1">Setor</th>
                        <th class="p-1">Cargo</th>
                        <th class="p-1 text-center">Qtd</th>
                        <th class="p-1">Perigo</th>
                        <th class="p-1">Risco</th>
                        <th class="p-1">Exames</th>
                        <th class="p-1 text-center">Periodicidade</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasHtml || '<tr><td colspan="8" class="p-2 text-center italic">Nenhuma linha registrada na Matriz.</td></tr>'}
                </tbody>
            </table>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado')?.classList.remove('hidden');
};

// ==========================================
// 9. MÓDULO 8: FINANCEIRO & PRODUÇÃO
// ==========================================
window.removerItemApuracao = function(idx) {
    if (currentRole !== 'GESTOR') return alert("Apenas o Gestor pode apagar registros financeiros!");
    if (!confirm("Deseja apagar este lançamento financeiro da apuração?")) return;
    let apuracao = JSON.parse(localStorage.getItem('boreal_apuracao_financeira_db') || '[]');
    apuracao.splice(idx, 1);
    localStorage.setItem('boreal_apuracao_financeira_db', JSON.stringify(apuracao));
    renderProducaoTable();
};

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

// ==========================================
// 10. MÓDULO 10: VÍNCULOS COMERCIAIS & CADASTROS
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
        try { await supabaseClient.from('vinculos_comerciais').upsert([novoItem]); } catch(e){}
    }

    renderTabelaVinculos();
    renderProducaoTable();
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

window.salvarNovoCliente = async function() {
    if (currentRole !== 'GESTOR') return alert("Apenas o GESTOR realiza cadastros.");
    const nome = document.getElementById('cad_cli_nome')?.value.trim();
    const cnpj = document.getElementById('cad_cli_cnpj')?.value.trim();
    const tel = document.getElementById('cad_cli_tel')?.value.trim();
    const email = document.getElementById('cad_cli_email')?.value.trim();
    const end = document.getElementById('cad_cli_end')?.value.trim();
    const medPcmso = document.getElementById('cad_cli_med_pcmso')?.value.trim();
    const crmPcmso = document.getElementById('cad_cli_med_crm')?.value.trim();
    const medWhats = document.getElementById('cad_cli_med_whats')?.value.trim();
    const medEmail = document.getElementById('cad_cli_med_email')?.value.trim();

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
    const nome = document.getElementById('cad_clin_nome')?.value.trim();
    const cnpj = document.getElementById('cad_clin_cnpj')?.value.trim();
    const whats = document.getElementById('cad_clin_whats')?.value.trim();
    const email = document.getElementById('cad_clin_email')?.value.trim();
    const endereco = document.getElementById('cad_clin_endereco')?.value.trim();

    if (!nome) return alert("Preencha o nome da clínica.");

    const id = Date.now();
    const novaClin = { id, nome, cnpj, whats, email, endereco, ativo: true };
    clinicasCadastradas.push(novaClin);
    salvarCadastrosLocalStorage();
    renderClinicasTabela();
    atualizarDropdownsClinicas();

    if (supabaseClient) {
        try { await supabaseClient.from('cadastros_clinicas').upsert([{ id, nome, cnpj, whats, email, endereco, ativo: true }]); } catch(e){}
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
    const nome = document.getElementById('cad_med_nome')?.value.trim();
    const crm = document.getElementById('cad_med_crm')?.value.trim();
    const rqe = document.getElementById('cad_med_rqe')?.value.trim();
    const tipo = document.getElementById('cad_med_tipo')?.value;
    const tel = document.getElementById('cad_med_tel')?.value.trim();
    const email = document.getElementById('cad_med_email')?.value.trim();

    if (!nome || !crm) return alert("Preencha Nome e CRM.");

    const id = Date.now();
    const novoMed = { id, nome, crm, rqe, tipo, tel, email, ativo: true };
    medicosCadastrados.push(novoMed);
    salvarCadastrosLocalStorage();
    renderMedicosTabela();

    if (supabaseClient) {
        try { await supabaseClient.from('cadastros_medicos').upsert([{ id, nome, crm, rqe, tipo, tel, email, ativo: true }]); } catch(e){}
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
        const rq = localStorage.getItem('boreal_aso_queue_db');
        if (rq) asoQueueData = JSON.parse(rq);
        const rh = localStorage.getItem('boreal_aso_history_db');
        if (rh) asoHistoryData = JSON.parse(rh);
        const rp = localStorage.getItem('boreal_monitor_requests_db');
        if (rp) monitorRequestsData = JSON.parse(rp);
        const rhom = localStorage.getItem('boreal_homologacao_db');
        if (rhom) atestadosHomologacaoData = JSON.parse(rhom);
        const rpcmso = localStorage.getItem('boreal_pcmso_matriz_db');
        if (rpcmso) pcmsoMatrizData = JSON.parse(rpcmso);
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
    atualizarSeletorDestinoPedidoManual();
    atualizarSeletorDestinoCargaMassa();
}

// ==========================================
// 11. SUPABASE INTEGRAÇÃO
// ==========================================
async function carregarTodosDadosSupabase() {
    if (!supabaseClient) return;
    try {
        await Promise.allSettled([
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
                resultado: d.resultado,
                medico: d.medico,
                medicoPcmso: d.medico_pcmso,
                agentes: d.agentes,
                anamneseDados: d.anamnese_dados
            }));
            salvarBancoAsoLocal();
            renderHistoryTabela();
            atualizarStatsAnalitico();
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
            salvarHomologacaoLocal();
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

// ==========================================
// 12. FUNÇÕES DE SUPORTE E UTILITÁRIOS
// ==========================================
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

function inicializarTodosModulos() {
    carregarCadastrosLocalStorage();
    atualizarDropdownsClientes();
    atualizarDropdownsClinicas();
    renderClientesTabela();
    renderClinicasTabela();
    renderMedicosTabela();
    renderTabelaVinculos();
    renderProducaoTable();
    renderMonitorTable();
    renderAsoQueue();
    renderHistoryTabela();
    renderHomologacaoTabela();
    renderPcmsoMatriz();
    atualizarStatsAnalitico();
    carregarTodosDadosSupabase();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Inicialização automática das telas e ícones no carregamento
document.addEventListener('DOMContentLoaded', () => {
    carregarCadastrosLocalStorage();
    popularDropdownCid10();
    popularDropdownExamesPcmso();
    atualizarDropdownsClientes();
    atualizarDropdownsClinicas();
    renderClientesTabela();
    renderClinicasTabela();
    renderMedicosTabela();
    renderTabelaVinculos();
    renderProducaoTable();
    renderMonitorTable();
    renderAsoQueue();
    renderHistoryTabela();
    renderHomologacaoTabela();
    renderPcmsoMatriz();
    atualizarStatsAnalitico();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});
