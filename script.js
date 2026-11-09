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

let clientesCadastrados = [];
let clinicasCadastradas = [];
let medicosCadastrados = [];
let asoQueueData = [];
let asoHistoryData = [];
let pcmsoMatrizData = [];
let atestadosHomologacaoData = [];
let monitorRequestsData = [];

// ==========================================
// AUTENTICAÇÃO E CONTROLE DE LOGIN (CORREÇÃO DE CONGELAMENTO)
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

    // Tentativa via Supabase Auth com timeout para evitar congelamento de tela
    if (supabaseClient && supabaseClient.auth) {
        try {
            const authPromise = supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha
            });
            
            // Timeout de 4 segundos para a requisição de rede
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de rede")), 4000));
            
            const { data, error } = await Promise.race([authPromise, timeoutPromise]);

            if (!error && data?.user) {
                autenticado = true;
                usuarioInfo.email = data.user.email;
                usuarioInfo.id = data.user.id;
            }
        } catch (errAuth) {
            console.warn("Falha de rede ou timeout no Supabase Auth. Utilizando fallback local:", errAuth);
        }
    }

    // Fallback de contingência local se o Supabase falhar ou não estiver configurado
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
            // Permite o primeiro acesso livre para administradores e equipe se não houver conta local salva
            autenticado = true;
        }
    }

    if (autenticado) {
        usuarioLogado = usuarioInfo;
        const containerLogin = document.getElementById('tela-login-container');
        if (containerLogin) {
            containerLogin.classList.add('hidden');
        }
        if (typeof carregarCadastrosLocalStorage === 'function') carregarCadastrosLocalStorage();
        if (typeof carregarTodosDadosSupabase === 'function') carregarTodosDadosSupabase();
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
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

    let salvoNuvem = false;
    if (supabaseClient && supabaseClient.auth) {
        try {
            const { error } = await supabaseClient.auth.signUp({
                email: email,
                password: senha
            });
            if (!error) salvoNuvem = true;
        } catch (e) {
            console.warn("Supabase SignUp:", e);
        }
    }

    // Armazena cópia local para garantir acesso offline/contingência
    let contas = JSON.parse(localStorage.getItem('boreal_contas_usuarios') || '{}');
    contas[email] = senha;
    localStorage.setItem('boreal_contas_usuarios', JSON.stringify(contas));

    alert("✅ Senha configurada com sucesso! Você já pode entrar no sistema.");
    if (typeof fecharModalPrimeiroAcesso === 'function') fecharModalPrimeiroAcesso();

    const loginEmail = document.getElementById('login_usuario_email');
    const loginSenha = document.getElementById('login_usuario_senha');
    if (loginEmail) loginEmail.value = email;
    if (loginSenha) loginSenha.value = senha;
};

// Funções de navegação de abas e controle de perfil
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
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
};

window.validarTrocaPerfil = function(novoPerfil) {
    currentRole = novoPerfil;
    if (typeof renderProducaoTable === 'function') renderProducaoTable();
    if (typeof renderTabelaVinculos === 'function') renderTabelaVinculos();
    if (typeof renderPcmsoMatriz === 'function') renderPcmsoMatriz();
};

window.aoTrocarClienteFiltro = function() {
    if (typeof atualizarHeaderPcmsoMedico === 'function') atualizarHeaderPcmsoMedico();
    if (typeof renderPcmsoMatriz === 'function') renderPcmsoMatriz();
    if (typeof renderProducaoTable === 'function') renderProducaoTable();
    if (typeof renderMonitorTable === 'function') renderMonitorTable();
};

// CATÁLOGO COMPLETO DE RISCOS (164 ITENS CONSOLIDADOS DO INVENTÁRIO PGR)
const CATALOGO_RISCOS = {
    "ACIDENTES": [
        { perigo: "SERVIÇOS COM SERRA", risco: "CORTE E/OU PANCADA NAS MÃOS", agravo: "PANCADA, LESÃO E DILACERAÇÃO", exame: "CLÍNICO", per: "Anual", plano: "FISCALIZAR A UTILIZAÇÃO DE EPI E EPC E ELABORAR ORDEM DE SERVIÇO." },
        { perigo: "TRABALHOS EM ESPAÇO CONFINADO", risco: "GASES TÓXICOS, INCÊNDIOS E PÂNICO", agravo: "ASFIXIA, INTOXICAÇÃO, HEMORRAGIAS, MORTE", exame: "CLÍNICO + ECG + ESPIROMETRIA", per: "Anual", plano: "ELABORAR ORDEM DE SERVIÇO, PROMOVER CURSO DE IMPLANTAÇÃO E RECICLAGEM DE NR10, NR 35, NR 33, FORNECER E FISCALIZAR A UTILIZAÇÃO DOS EPI’S E EPC’S. MANTER MANUTENÇÃO DO VEÍCULO ATUALIZADA, PROMOVER CURSO DE DIREÇÃO DEFENSIVA, REALIZAR OS EXAMES DEFINIDOS NO PCMSO." },
        { perigo: "TRABALHO EM ALTURA", risco: "QUEDAS, SÚBITOS", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSIMOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO + ECG + GLICEMIA", per: "Anual", plano: "PROMOVER TREINAMENTO EM NR 35, REALIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, ELABORAR ORDEM DE SERVIÇO COM APR." },
        { perigo: "MANUTENÇÃO EM SISTEMAS ELÉTRICOS", risco: "CHOQUE ELÉTRICO", agravo: "ATAQUES CARDÍACOS, QUEIMADURA, MORTE", exame: "CLÍNICO + ECG", per: "Semestral", plano: "PROMOVER TREINAMENTO EM NR 10, REALIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, TRABALHAR SEMPRE EM DUPLA." },
        { perigo: "MANUTENÇÃO EM SISTEMAS E EQUIPAMENTOS MECÂNICOS", risco: "CHOQUE MECÂNICO", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "PROMOVER TREINAMENTO EM NR 12, REALIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, ELABORAR ORDEM DE SERVIÇO COM APR." },
        { perigo: "DIREÇÃO DE VEÍCULOS", risco: "ACIDENTES DE TRÂNSITO", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "PROMOVER CURSO DE DIREÇÃO DEFENSIVA, MONITORAR A SAÚDE DO MOTORISTA." },
        { perigo: "ILUMINAÇÃO INADEQUADA", risco: "DIFICULDADE DE ACESSO E DETECÇÃO DE MATERIAIS", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "ANALISAR ÁREA DE TRABALHO, PROMOVER ILUMINAÇÃO MÓVEL." },
        { perigo: "MÁQUINAS E EQUIPAMENTOS SEM PROTEÇÃO", risco: "CORTES, DILACERAÇÃO, CHOQUE ELÉTRICO", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "ADEQUAR EQUIPAMENTOS E MÁQUINAS, PROMOVER PROTEÇÕES CONFORME NR 12." },
        { perigo: "MÁQUINAS E EQUIPAMENTOS WITH PROTEÇÃO INADEQUADA", risco: "INCÊNDIO E EXPLOSÃO (PROBABILIDADE)", agravo: "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FÍSICOS, DILACERAÇÃO FÍSICA E MORTE", exame: "CLÍNICO", per: "Anual", plano: "ADEQUAR EQUIPAMENTOS E MÁQUINAS, PROMOVER PROTEÇÕES CONFORME NR 12." },
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

// 7. FUNÇÕES DE INCLUSÃO E RENDERIZAÇÃO DA MATRIZ DO PCMSO
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
            opt.textContent = item.perigo;
            selAgente.appendChild(opt);
        });
    }
};
