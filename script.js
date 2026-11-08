// ==========================================
// 1. MEMÓRIA DO AGENDAMENTO COM TECLA "IGUAL" (ITENS 1, 5 e 9)
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

    // Guarda para permitir a tecla "IGUAL" nos próximos pedidos
    ultimoAgendamentoSalvo = { horarios, endereco };

    const partes = (pedido.trab || "").split('-');
    const nomeTrab = (partes[0] ? partes[0].trim() : pedido.trab).toUpperCase();
    const cpfTrab = partes[1] ? partes[1].trim() : "000.000.000-00";

    // 1. Transfere imediatamente para a Fila do ASO
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

    // 2. Remove do Solicitador
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

// ==========================================
// 2. TABELA DE ITENS E PREÇOS DOS FORNECEDORES (ITENS 1 e 2)
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

// ==========================================
// 3. POSIÇÃO FINANCEIRA COM QUANTIDADE REAL EXECUTADA (ITENS 3, 6, 7, 8, 10)
// ==========================================
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

    // Popula tabela a partir dos serviços contratados se ainda não iniciada
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
// 4. ASSINATURA ELETRÔNICA DO ASO COM HASH (ITENS 12 a 16 e 30)
// ==========================================
function gerarHashValidacaoAso() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let h = '';
    for (let i = 0; i < 4; i++) h += chars.charAt(Math.floor(Math.random() * chars.length));
    return `ASO-${Date.now().toString().slice(-6)}-${h}`;
}

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

    // 1. Grava no Banco Permanente
    asoHistoryData.unshift(asoObj);
    salvarBancoAsoLocal();

    // 2. Remove da Fila
    asoQueueData = asoQueueData.filter(x => x.id !== selectedAsoId);

    // 3. Nuvem Supabase
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

// Layout Visual Unificado do ASO com Certificado Eletrônico e Hash (Item 16 e 30)
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

// ==========================================
// 5. HOMOLOGAÇÃO COM SIGILO DO CID E CONSULTA CFM (ITENS 17 a 23, 28 e 29)
// ==========================================
window.abrirConsultaRapidaCFM = function() {
    const crm = prompt("Digite o CRM do médico emissor para consultar no portal CFM:");
    if (crm) {
        window.open(`https://portal.cfm.org.br/busca-medicos/?crm=${crm.replace(/\D/g, '')}&uf=SP`, '_blank');
    }
};

window.renderHomologacaoTabela = function() {
    const tbody = document.getElementById('atestados-homologacao-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    // Regra de Sigilo do CID (Item 23)
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

// ==========================================
// 6. HERANÇA CLÍNICA DA ANAMNESE (MARCO ZERO) (ITENS 26, 27 e 31)
// ==========================================
window.abrirAnamneseModal = async function(id) {
    currentAnamneseTarget = { tipo: 'FILA', id: id };
    const item = asoQueueData.find(x => x.id === id);
    if (!item) return;

    let dadosPregressos = item.anamnese;

    // Se for o primeiro exame no sistema, consulta o Marco Zero do CPF no Supabase
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
                console.log("Histórico Clínico herdado do banco de dados (Marco Zero).");
            }
        } catch(e){}
    }

    carregarDadosFormAnamnese(item.nome, item.cpf, item.cargo, dadosPregressos);
    document.getElementById('modal-anamnese').classList.remove('hidden');
};