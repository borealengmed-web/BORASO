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
// CONTROLE DE PERMISSÕES POR PERFIL
// ==========================================
function podeCadastrarHomologacao() {
    return ['GESTOR', 'CLIENTE', 'MEDICO_HOMOLOGADOR'].includes(currentRole);
}

function podeVerCID() {
    return ['MEDICO_HOMOLOGADOR', 'GESTOR', 'AGENTE', 'MEDICO_PCMSO'].includes(currentRole);
}

function podeEditarRiscosPcmso() {
    return ['GESTOR', 'AGENTE'].includes(currentRole);
}

function podeEditarExamesPcmso() {
    return ['MEDICO_PCMSO', 'GESTOR', 'AGENTE'].includes(currentRole);
}

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
    atualizarPermissoesInterface();
    renderProducaoTable();
    renderTabelaVinculos();
    renderPcmsoMatriz();
    renderMonitorTable();
    renderAsoQueue();
    renderHistoryTabela();
    renderHomologacaoTabela();
    popularDropdownCid10();
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
// ATUALIZAÇÃO DE INTERFACE POR PERMISSÃO
// ==========================================
function atualizarPermissoesInterface() {
    // 1. Homologação: Congelar edição para quem não é GESTOR, CLIENTE ou MEDICO_HOMOLOGADOR
    const painelHom = document.getElementById('painel-inclusao-homologacao');
    const avisoHom = document.getElementById('aviso-bloqueio-homologacao');
    const podeHom = podeCadastrarHomologacao();

    if (painelHom) {
        const inputsHom = painelHom.querySelectorAll('input, button');
        inputsHom.forEach(el => el.disabled = !podeHom);
        if (podeHom) {
            painelHom.classList.remove('opacity-40', 'pointer-events-none');
            if (avisoHom) avisoHom.classList.add('hidden');
        } else {
            painelHom.classList.add('opacity-40', 'pointer-events-none');
            if (avisoHom) avisoHom.classList.remove('hidden');
        }
    }

    // 2. PCMSO: Permissões de Riscos/Perigos vs Exames/Planos
    const podeRisco = podeEditarRiscosPcmso();
    const podeExame = podeEditarExamesPcmso();
    const isMedPcmso = currentRole === 'MEDICO_PCMSO';

    const camposRiscos = [
        'pcmso_add_lotacao', 'pcmso_add_processo', 'pcmso_add_cargo',
        'pcmso_add_qtd', 'pcmso_add_cat', 'pcmso_add_agente',
        'pcmso_add_perigo_custom', 'pcmso_add_risco', 'pcmso_add_plano_gestor'
    ];
    camposRiscos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = !podeRisco;
            if (podeRisco) {
                el.classList.remove('bg-slate-200', 'cursor-not-allowed');
            } else {
                el.classList.add('bg-slate-200', 'cursor-not-allowed');
            }
        }
    });

    const camposExames = [
        'pcmso_add_exame', 'pcmso_add_exame_custom',
        'pcmso_add_periodicidade', 'pcmso_add_per_custom', 'pcmso_add_plano_medico'
    ];
    camposExames.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = !podeExame;
            if (podeExame) {
                el.classList.remove('bg-slate-200', 'cursor-not-allowed');
            } else {
                el.classList.add('bg-slate-200', 'cursor-not-allowed');
            }
        }
    });

    const btnCarregarPcmso = document.getElementById('btn_carregar_linha_pcmso');
    if (btnCarregarPcmso) {
        btnCarregarPcmso.disabled = !podeRisco && !isMedPcmso;
    }

    const tagPermissao = document.getElementById('pcmso_tag_permissao');
    if (tagPermissao) {
        if (podeRisco) {
            tagPermissao.textContent = "GESTOR / AGENTE: Edição Total de Riscos e Perigos";
            tagPermissao.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 uppercase";
        } else if (isMedPcmso) {
            tagPermissao.textContent = "MÉDICO PCMSO: Edição Exclusiva de Exames e Condutas Clínicas";
            tagPermissao.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-950 uppercase";
        } else {
            tagPermissao.textContent = "MODO SOMENTE LEITURA";
            tagPermissao.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-950 uppercase";
        }
    }
}

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
// 5. MÓDULO 3: ANAMNESE E EMISSÃO DE ASO (ITEM 1 CORRIGIDO)
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

    const riscosChecks = {
        noh: document.getElementById('chk_r_noh')?.checked || false,
        fis: document.getElementById('chk_r_fis')?.checked || false,
        qui: document.getElementById('chk_r_qui')?.checked || false,
        bio: document.getElementById('chk_r_bio')?.checked || false,
        erg: document.getElementById('chk_r_erg')?.checked || false,
        aci: document.getElementById('chk_r_aci')?.checked || false
    };

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
        riscosChecks: riscosChecks,
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

// ITEM 1: FORMATO DO ASO VISUALIZADO IDÊNTICO AO DA FILA DE ATENDIMENTO
window.visualizarAsoBanco = function(id) {
    const a = asoHistoryData.find(x => x.id === id);
    if (!a) return;

    const paper = document.getElementById('aso-paper-visualizar');
    const modalTitulo = document.getElementById('modal-visualizar-titulo');
    if (modalTitulo) modalTitulo.textContent = `🩺 ASO BOREAL OFICIAL — ${a.nome}`;

    const r = a.riscosChecks || {};
    const tpExame = a.tipoExame || 'Admissional';

    if (paper) {
        paper.className = "aso-boreal-paper space-y-3 text-[11px] bg-white p-4 max-w-4xl mx-auto border-2 border-black";
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

            <div class="border border-black p-2 bg-slate-50 flex flex-wrap gap-4 font-bold text-[10px] uppercase">
                <span>EXAME MÉDICO:</span>
                <span class="${tpExame.includes('Admissional') ? 'bg-blue-900 text-white px-1.5 py-0.5 rounded' : 'text-slate-600'}">[${tpExame.includes('Admissional') ? 'X' : ' '}] Admissional</span>
                <span class="${tpExame.includes('Periódico') ? 'bg-blue-900 text-white px-1.5 py-0.5 rounded' : 'text-slate-600'}">[${tpExame.includes('Periódico') ? 'X' : ' '}] Periódico</span>
                <span class="${tpExame.includes('Retorno') ? 'bg-blue-900 text-white px-1.5 py-0.5 rounded' : 'text-slate-600'}">[${tpExame.includes('Retorno') ? 'X' : ' '}] Retorno ao Trabalho</span>
                <span class="${tpExame.includes('Mudança') ? 'bg-blue-900 text-white px-1.5 py-0.5 rounded' : 'text-slate-600'}">[${tpExame.includes('Mudança') ? 'X' : ' '}] Mudança de Risco</span>
                <span class="${tpExame.includes('Demissional') ? 'bg-blue-900 text-white px-1.5 py-0.5 rounded' : 'text-slate-600'}">[${tpExame.includes('Demissional') ? 'X' : ' '}] Demissional</span>
            </div>

            <div class="border border-black p-2 space-y-2">
                <strong class="block border-b border-black font-extrabold bg-slate-200 px-1 uppercase">IDENTIFICAÇÃO DO TRABALHADOR E CLIENTE</strong>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div class="md:col-span-2">
                        <label class="font-bold block text-slate-600">Razão Social do Empregador</label>
                        <div class="border p-1 font-bold bg-slate-50">${a.cliente}</div>
                    </div>
                    <div>
                        <label class="font-bold block text-slate-600">CNPJ</label>
                        <div class="border p-1 font-bold bg-slate-50">${a.cnpj || '-'}</div>
                    </div>
                    <div class="md:col-span-3">
                        <label class="font-bold block text-slate-600">Nome do Empregado</label>
                        <div class="border p-1 font-black text-blue-950 bg-slate-50">${a.nome}</div>
                    </div>
                    <div>
                        <label class="font-bold block text-slate-600">Cargo</label>
                        <div class="border p-1 font-bold bg-slate-50">${a.cargo || '-'}</div>
                    </div>
                    <div>
                        <label class="font-bold block text-slate-600">Função</label>
                        <div class="border p-1 font-bold bg-slate-50">${a.funcao || '-'}</div>
                    </div>
                    <div>
                        <label class="font-bold block text-slate-600">Lotação / Setor</label>
                        <div class="border p-1 font-bold bg-slate-50">${a.lotacao || '-'}</div>
                    </div>
                    <div>
                        <label class="font-bold block text-slate-600">Matrícula</label>
                        <div class="border p-1 font-bold bg-slate-50">${a.matricula || '-'}</div>
                    </div>
                    <div>
                        <label class="font-bold block text-slate-600">CPF</label>
                        <div class="border p-1 font-bold bg-slate-50">${a.cpf || '-'}</div>
                    </div>
                    <div>
                        <label class="font-bold block text-slate-600">Data Nasc.</label>
                        <div class="border p-1 font-bold bg-slate-50">${a.nasc || '-'}</div>
                    </div>
                </div>
            </div>

            <div class="border border-black p-2 bg-amber-50 space-y-1">
                <div class="flex gap-6 font-black text-sm my-1 uppercase">
                    <span>CONCLUSÃO DO EXAME:</span>
                    <span class="${a.resultado === 'Apto' ? 'text-emerald-800 underline' : 'text-slate-400'}">[${a.resultado === 'Apto' ? 'X' : ' '}] Apto</span>
                    <span class="${a.resultado === 'Inapto' ? 'text-red-800 underline' : 'text-slate-400'}">[${a.resultado === 'Inapto' ? 'X' : ' '}] Inapto</span>
                </div>
            </div>

            <div class="border border-black p-2 space-y-1">
                <strong class="block border-b border-black font-extrabold uppercase">RISCOS OCUPACIONAIS EM NÍVEL DE AÇÃO</strong>
                <div class="flex flex-wrap gap-4 font-bold text-[10px] my-1 uppercase">
                    <span>[${r.noh ? 'X' : ' '}] Não Há Fatores de Riscos</span>
                    <span>[${r.fis ? 'X' : ' '}] Físico</span>
                    <span>[${r.qui ? 'X' : ' '}] Químico</span>
                    <span>[${r.bio ? 'X' : ' '}] Biológico</span>
                    <span>[${r.erg ? 'X' : ' '}] Ergonômico</span>
                    <span>[${r.aci ? 'X' : ' '}] Acidente</span>
                </div>
                <div>
                    <label class="font-bold block text-slate-600">Especificação de agentes ou riscos:</label>
                    <div class="border p-1 bg-slate-50 font-semibold">${a.agentes || 'Ausência de riscos específicos.'}</div>
                </div>
            </div>

            <div class="border border-black p-2 space-y-2">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div class="border-t border-black text-center pt-1">
                        <strong class="block">Assinatura do(a) Examinado(a)</strong>
                        <div class="mt-1 font-bold text-[10px] text-slate-700">${a.local || 'PAULÍNIA / SP'} — ${a.fecha}</div>
                    </div>
                    <div class="border-t border-black text-center pt-1 space-y-1">
                        <strong class="block">Médico(a) Examinador(a):</strong>
                        <div class="font-black text-[10px] text-blue-950">${a.medico}</div>
                    </div>
                </div>
                <div class="text-center font-bold pt-1 border-t border-black">
                    Nome do Médico Responsável do PCMSO: <span class="text-blue-900 font-extrabold">${a.medicoPcmso || '-'}</span>
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
// 6. MÓDULO 5: HOMOLOGAÇÃO DE ATESTADOS (ITENS 2 E 4)
// ==========================================
window.renderHomologacaoTabela = function() {
    const tbody = document.getElementById('atestados-homologacao-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const lista = atestadosHomologacaoData.filter(h => activeCli === 'ALL' || h.cliente === activeCli);
    const verCid = podeVerCID();

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="p-3 text-center text-slate-400 uppercase italic">Nenhum atestado cadastrado para homologação.</td></tr>';
        return;
    }

    lista.forEach(h => {
        const cidExibicao = verCid ? h.cid : `<span class="text-slate-400 italic font-mono font-bold" title="Informação protegida por sigilo médico legal">🔒 SIGILO MÉDICO</span>`;
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2 font-bold">${h.cliente}</td>
            <td class="p-2 font-bold text-blue-900">${h.trab}</td>
            <td class="p-2">${h.setor || '-'}</td>
            <td class="p-2">${h.cargo || '-'}</td>
            <td class="p-2">${h.data}</td>
            <td class="p-2 text-center font-bold">${h.dias} dias</td>
            <td class="p-2 text-center font-bold text-purple-900">${cidExibicao}</td>
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

// ITEM 2: APENAS GESTOR, CLIENTE E MÉDICO HOMOLOGADOR PODEM ADICIONAR
window.adicionarHomologacaoDireta = async function() {
    if (!podeCadastrarHomologacao()) {
        alert("🔒 Acesso restrito: Somente o Gestor, o Cliente e o Médico Homologador podem cadastrar e relacionar empregados na Homologação.");
        return;
    }

    const trab = document.getElementById('hom_top_trab')?.value.trim();
    const setor = document.getElementById('hom_top_setor')?.value.trim();
    const cargo = document.getElementById('hom_top_cargo')?.value.trim();
    const dias = parseInt(document.getElementById('hom_top_dias')?.value) || 1;
    const cidInput = document.getElementById('hom_top_cid');
    const cid = cidInput ? cidInput.value.trim() : '';
    const activeCli = document.getElementById('active-cliente-select')?.value || 'CLIENTE';
    const empresa = document.getElementById('hom_top_empresa')?.value.trim() || (activeCli === 'ALL' ? 'CLIENTE PADRÃO' : activeCli);
    const medico = document.getElementById('hom_top_medico')?.value.trim() || 'DR. MÉDICO EXTERNO';

    if (!trab) {
        alert("Preencha o nome do trabalhador para cadastrar.");
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
        cid: (podeVerCID() && cid) ? cid.toUpperCase() : (cid || 'SIGILOSO'),
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
    if (document.getElementById('hom_top_cid')) document.getElementById('hom_top_cid').value = '';
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
    document.getElementById('hom_parecer_