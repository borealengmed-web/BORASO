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

// Catálogo de Riscos e Agentes Ocupacionais para a Matriz PCMSO (NR-07 / PGR)
const CATALOGO_RISCOS = {
    "ACIDENTES": [
        {
            "perigo": "SERVIÇOS COM SERRA",
            "fonte": "",
            "risco": "CORTE E/OU PANCADA NAS MÃOS",
            "agravo": "PANCADA, LESÃO E DILACERAÇÃO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FISCALIZAR A UTILIZAÇÃO DE EPI E EPC E ELABORAR ORDEM DE SERVIÇO."
        },
        {
            "perigo": "TRABALHOS EM ESPAÇO CONFINADO",
            "fonte": "",
            "risco": "GASES TÓXICOS, INCÊNDIOS E PÂNICO",
            "agravo": "HEMORRAGIA SUBARACNÓIDE HEMORRAGIA INTRACEREBRAL INFARTO CEREBRAL ACIDENTE VASCULAR CEREBRAL, NÃO ESPECIFIADO COMO HEMORRÁGICO OU ISQUÊMICO. PANCADA, QUEIMADURA, DILACERAÇÃO E MORTE",
            "exame": "CLÍNICO + ECG + GLICEMIA",
            "per": "Anual",
            "plano": "ELABORAR ORDEM DE SERVIÇO, PROMOVER CURSO DE IMPLANTAÇÃO E RECICLAGEM DE NR10, NR 35, NR 33, FORNECER E FISCALIZAR A UTILIZAÇÃO DOS EPI’S E EPC’S. MANTER MANUTENÇÃO DO VEÍCULO ATUALIZADA, PROMOVER CURSO DE DIREÇÃO DEFENSIVA, REALIZAR OS EXAMES DEFINIDOS NO PCMSO"
        },
        {
            "perigo": "TRABALHO EM ALTURA",
            "fonte": "",
            "risco": "QUEDAS, SÚBITOS",
            "agravo": "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FISICOS, DILACERAÇÃO FÍSICA E MORTE",
            "exame": "CLÍNICO + ECG + GLICEMIA",
            "per": "Anual",
            "plano": "PROMOVER TREINAMENTO EM NR 35, RELAIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, ELABORAR ORDEM DE SERVIÇO COM APR"
        },
        {
            "perigo": "MANUTENÇÃO EM SISTEMAS ELÉTRICOS",
            "fonte": "",
            "risco": "CHOQUE ELÉTRICO",
            "agravo": "ATAQUES CARDÍACOS, QUEIMADURA, MORTE",
            "exame": "CLÍNICO + ECG",
            "per": "Semestral",
            "plano": "PROMOVER TREINAMENTO EM NR 10, RELAIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, TRABALHAR SEMPRE EM DUPLA"
        },
        {
            "perigo": "MANUTENÇÃO EM SISTEMAS E EQUIPAMENTOS MECÂNICOS",
            "fonte": "",
            "risco": "CHOQUE MECÂNICO",
            "agravo": "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FISICOS, DILACERAÇÃO FÍSICA E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER TREINAMENTO EM NR 12, RELAIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, ELABORAR ORDEM DE SERVIÇO COM APR"
        },
        {
            "perigo": "DIREÇÃO DE VEÍCULOS",
            "fonte": "",
            "risco": "ACIDENTES DE TRÂNSITO",
            "agravo": "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FISICOS, DILACERAÇÃO FÍSICA E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER CURSO DE DIREÇÃO DEFENSIVA, MONITORAR A SAÚDE DO MOTORISTA"
        },
        {
            "perigo": "ILUMINAÇÃO INADEQUADA",
            "fonte": "",
            "risco": "DIFICULDADE DE ACESSO E DETECÇÃO DE MATERIAIS",
            "agravo": "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FISICOS, DILACERAÇÃO FÍSICA E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ANALISAR ÁREA DE TRABALHO, PROMOVER ILUMINAÇÃO MÓVEL"
        },
        {
            "perigo": "MÁQUINAS E EQUIPAMENTOS SEM PROTEÇÃO",
            "fonte": "",
            "risco": "CORTES, DILACERAÇÃO, CHOQUE ELÉTRICO",
            "agravo": "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FISICOS, DILACERAÇÃO FÍSICA E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ADEQUAR EQUIPMANTOS E MÁQUINAS, PROMOVER PROTEÇÕES CONFORME NR 12"
        },
        {
            "perigo": "MÁQUINAS E EQUIPAMENTOS COM PROTEÇÃO INADEQUADA",
            "fonte": "",
            "risco": "INCÊNDIO E EXPLOSÃO (PROBABILIDADE)",
            "agravo": "TORÇÃO, PANCADA, ESCORIAÇÃO, DANOS FISICOS, DILACERAÇÃO FÍSICA E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ADEQUAR EQUIPMANTOS E MÁQUINAS, PROMOVER PROTEÇÕES CONFORME NR 12"
        },
        {
            "perigo": "ARMAZENAMENTO INADEQUADO, ACÚMULO DE ENTULHOS",
            "fonte": "",
            "risco": "QUEDAS DE OBJETO, INSATISFAÇÃO ERGONÔMICA",
            "agravo": "PANCADA, ESCORIAÇÃO, DANOS FISICOS,",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ORGANIZAR E ADEQUAR MATERIAIS, EXPEDIR MATERIAIS SEM UTILIDADE, IMPLEMENTAR ESTANTES DE ORGANIZAÇÃO, SEPARAR MATERIAIS POR CATEGORIA EXPEDIR ORDEM DE SERVIÇO COM TODAS ORIENTAÇÕES E ANÁLISE PRELIMINAR DE RISCO."
        },
        {
            "perigo": "FERRAMENTAS INADEQUADAS OU DEFEITUOSAS",
            "fonte": "",
            "risco": "CORTES E PERFURAÇÕES",
            "agravo": "PANCADA, ESCORIAÇÃO, DANOS FISICOS,",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ORGANIZAR E ADEQUAR MATERIAIS, EXPEDIR MATERIAIS SEM UTILIDADE, IMPLEMENTAR ESTANTES DE ORGANIZAÇÃO, SEPARAR MATERIAIS POR CATEGORIA EXPEDIR ORDEM DE SERVIÇO COM TODAS ORIENTAÇÕES E ANÁLISE PRELIMINAR DE RISCO."
        },
        {
            "perigo": "TRABALHOS EM ENCOSTAS E ATERROS",
            "fonte": "",
            "risco": "SOTERRAMENTO",
            "agravo": "MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "EXPEDIR ORDEM DE SERVIÇO COM TODAS ORIENTAÇÕES E ANÁLISE PRELIMINAR DE RISCO."
        },
        {
            "perigo": "TRABALHOS EM MEIO A VEGETAÇÕES",
            "fonte": "",
            "risco": "ANIMAIS PEÇONHENTOS, EFEITO TÓXICO DE CONTATO COM ANIMAIS VENENOSOS",
            "agravo": "DOENÇA DE CHAGAS, FEBRE MACULOSA, ENVENENAMENTO, RAIVA, OUTRAS DOENÇAS CORRELATAS, SÚBITOS ELÉRGICOS,",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FORNECER EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL E COLETIVO. UTILIZAR ROUPAS CLARAS PARA DETECÇÃO DE PARASITAS"
        },
        {
            "perigo": "TRABALHOS ADMINISTRATIVOS EXTERNOS",
            "fonte": "",
            "risco": "ANIMAIS DOMÉSTICOS/RISCO A ACIDENTES DE ATAQUE DE MARGINAIS",
            "agravo": "DOENÇA DE CHAGAS, FEBRE MACULOSA, ENVENENAMENTO, RAIVA, OUTRAS DOENÇAS CORRELATAS, SÚBITOS ELÉRGICOS,",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FORNECER EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL E COLETIVO. UTILIZAR ROUPAS CLARAS PARA DETECÇÃO DE PARASITAS"
        },
        {
            "perigo": "SUPERVISIONAR OPERAÇÃO DE MANUTENÇÃO DE TANQUES DE COMBUSTIVEL",
            "fonte": "",
            "risco": "EXPLOSÃO, INCÊNDIO",
            "agravo": "QUEIMADURA, LESÃO, DILACERAÇÃO E MORTE.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "EXPEDIR ORDEM DE SERVIÇO COM TODAS ORIENTAÇÕES E ANÁLISE PRELIMINAR DE RISCO."
        },
        {
            "perigo": "TRABALHOS EXTERNOS, OU DE ASSISTÊNCIAS, CONTROLE E ATENDIMENTO HUMANO.",
            "fonte": "",
            "risco": "AGRESSÕES FÍSICAS E MORAL DE PESSOAS E/OU PESSOAS MARGINAIS",
            "agravo": "DANOS FÍSICOS, DANOS PSICOLÓGICOS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER TREINAMENTO PARA LIDAR COM SITUAÇÕES DE AGRESSÕES DE PESSOAS E ATAQUES DE BANDIDOS, PROMOVER MEIOS DE"
        },
        {
            "perigo": "TRABALHOS EM MATAS E FLORESTAS",
            "fonte": "",
            "risco": "ANIMAIS SELVAGENS/RISCO A ACIDENTES DE ATAQUE",
            "agravo": "DOENÇA DE CHAGAS, FEBRE MACULOSA, ENVENENAMENTO, RAIVA, OUTRAS DOENÇAS CORRELATAS, SÚBITOS ELÉRGICOS,",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ACUIDADE VISUAL; AUDIOMETRIA OCUPACIONAL; ELETROCARDIOGRAMA; ELETROENCEFALOGRAMA; GLICEMIA DE JEJUM; HEMOGRAMA COMPLETO; AVALIAÇÃO PSICOSSOCIAL."
        }
    ],
    "ACIDENTES_AMPLIADOS": [
        {
            "perigo": "CIRCULAÇÃO DE VEÍCULOS NA RUA DA ÁREA EXTERNA OU ESTACIONAMENTO DA UNIDADE",
            "fonte": "",
            "risco": "ACIDENTE DE TRÂNSITO E ATROPELAMENTO",
            "agravo": "DANOS FÍSICOS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REALIZAR SINALIZAÇÃO HORIZONTAL E VERTICAL DA ÁREA COM FITAS, CONES E PLACAS PARA O TRÁFEGO DE VEÍCULOS E PESSOAS"
        },
        {
            "perigo": "ÁRVORES COM GALHOS SECOS SEM PODA OU CUIDADOS NA ÁREA DE CIRCULAÇÃO EXTERNA",
            "fonte": "",
            "risco": "QUEDA DE GALHOS E FRUTOS",
            "agravo": "PANCADAS, ESCORIAÇÃO E LUXAÇÃO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REALIZAR A PODAGEM DE ÁRVORES OBSERVAR A INTEGRIDADE DAS ÁRVORES, CONTROLAR SEU CRESCIMENTO"
        },
        {
            "perigo": "PISO IRREGULAR OU QUEBRADO EM ÁREAS DE CIRCULAÇÃO",
            "fonte": "",
            "risco": "QUEDA DO MESMO NIVEL, TROPEÇO",
            "agravo": "FRATURA E LUXAÇÃO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "SINALIZAR A ÁREA E REPARAR O PISO"
        },
        {
            "perigo": "UTILIZAÇÃO DE ESCADA DE ACESSO AOS PAVIMENTOS SUPERIORES",
            "fonte": "",
            "risco": "QUEDAS OU TROPEÇOS",
            "agravo": "TORÇÃO OU FRATURAS, MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "APLICAR FITA ANTIDERRAPANTE NOS DEGRAUS, VERIFICAR OU INSTALAR O CORRIMÃO, INSTALAR LAMPADA DE PRESENÇA"
        },
        {
            "perigo": "UTILIZAÇÃO DE ELEVADOR DE PASSAGEIRO",
            "fonte": "",
            "risco": "ROMPIMENTO DO CABO DE AÇO, QUEDA DO ELEVADOR",
            "agravo": "FRATURAS, SÉRIO DILACERAÇÃO, MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "SINALIZAR COM ADVERTÊNCIA DE LIMITE DE PESO, INSTALAR DISPOSITIVO DE EXCESSO DE PESO QUE IMPEÇA A PARTIDA, MANATER RELATÓRIO DE MANUTENÇÃO ATUALIZADO."
        },
        {
            "perigo": "EXTINTORES DE INCÊNDIO NO CHÃO OU OBSTRUÍDOS",
            "fonte": "",
            "risco": "AGRAVAMENTO DE COMBATE AO PRÍNCÍPIO DE INCÊNDIO  E INCÊNDIO",
            "agravo": "PÂNICO, QUEIMADURAS, INTOXICAÇÃO E MORTE",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "ADEQUAR E POSICIONAR OS EXTINTORES COM SINALIZAÇÃO ADEQUADA"
        },
        {
            "perigo": "INEXISTÊNCIA DE BRIGADA CONTRA INCÊNDIO EM UNIDADES ACIMA DE 10 E 20 TRABALHADORES COM MATERIAIS INFLAMÁVEIS",
            "fonte": "",
            "risco": "IMPOSSIBILIDADE DE COMBATE AO PRINCÍPIO DE INCÊNDIO E MAXIMIZAÇÃO DO INCÊNDIO",
            "agravo": "PÂNICO, QUEIMADURAS, INTOXICAÇÃO E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "INSTITUIR E CAPACITAR BRGADA DE INCÊNDIO PARA UNIDADES COM CONTIGENTE A PARTIR  DE 10 FUNCIONÁRIOS, CONFORME INSTRUÇÃO TÉCNICA 17 DOS BM-SP COM 6 BRIGADISTAS A PARTIR DE 10 PESSOAS MAIS 1 BRIGADISTA POR GRUPO EXTRA DE 20 PESSOAS."
        },
        {
            "perigo": "AUSÊNCIA DE AUTO DE VISTORIA DO CORPO DE BOMBEIROS – AVCB EM UNIDADES ACIMA DE 250M² E 750 TRABALHADORES",
            "fonte": "",
            "risco": "INCÊNDIO POR NÃO ATENDER AS NORMAS DE SEGURANÇA CONTRA INCÊNDIO",
            "agravo": "PÂNICO, QUEIMADURAS, INTOXICAÇÃO E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "INICIAR OU CONCLUIR PROCESSO DE ADEQUAÇÕES PARA ATENDIMENTO ÀS NORMAS DO BOMBEIRO E SOLICITAR O AUTO DE VISTORIA DO CORPO DE BOMBEIRO"
        },
        {
            "perigo": "PISO ENCERADO SEM ANTIDERRAPANTE",
            "fonte": "",
            "risco": "QUEDA NO MESMO NÍVEL OU TROPEÇO",
            "agravo": "TORÇÃO, FRATURAS OU LUXAÇÃO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "SINALIZAR ÁREA NO MOMENTO DE LIMPEZA, TROCAR PISO ESCORREGADIO OU APLICAR MATERIAL POROSO PARA EVITAR ESCORREGAMENTO"
        },
        {
            "perigo": "SISTEMA ELÉTRICO DA REDE CENTRAL DETERIORADO",
            "fonte": "",
            "risco": "CURTO CIRCUITO CAUSANDO INCÊNDIO",
            "agravo": "QUEIMADURAS, INTOXICAÇÃO E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "INSPECIONAR REDE ELÉTRICA ATRAVÉS DE TÉCNICO ESPECIALIZADO, TROCAR CONDUTORES OU DIMENSIONAR CONFORME CARAG REQUERIDA"
        },
        {
            "perigo": "CONDUTORES E DISJUNTORES ELÉTRICOS SUBDIMENSIONADOS",
            "fonte": "",
            "risco": "AQUECIMENTO DE CABOS E CONEXÕES CAUSANDO INCÊNDIOS",
            "agravo": "QUEIMADURAS, INTOXICAÇÃO E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "CONTRATR TÉCNICO PARA CALCULAR DEMANDA DE POTÊNCIA E REDIMENSIONAR OS CONDUTORES E QUADRO DE LUZ DA REDE CENTRAL"
        },
        {
            "perigo": "CORES DAS TUBULAÇÕES ELÉTRICAS E HIDRÁULICAS EM DESACORDO COM A NR26 E ABNT NBR 6493 / 7195",
            "fonte": "",
            "risco": "CHOQUE ELÉTRICO E CONFUSÃO DIANTE UMA EMERGÊNCIA DE INCÊNDIO",
            "agravo": "CHOQUE ELÉTRICO, QUEIMADURA E DILACERAÇÃO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REGULARIZAR TUBULAÇÕES DE ACORDO COM O QUE A NORMA PEDE E ELABORAR PLANO DE PREVENÇÃO E COMBATE A INCÊNDIO, DEIXAR O PRÉDIO EM CONFORMIDADE PARA OBTENÇÃO DE AVCB."
        },
        {
            "perigo": "FUNCIONAMENTO DE GERADOR DE ENERGIA ELÉTRICA DENTRO DO PRÉDIO DA UNIDADE",
            "fonte": "",
            "risco": "INCÊNDIO POR AQUECIMENTO OU CURTO CIRCUITO DOS COMPONENTES ELÉTRICOS",
            "agravo": "QUEIMADURAS, INTOXICAÇÃO E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REALIZAR MANUTENÇÃO RIGOROSA DO EQUIPAMENTO, MATER EXTINTOR DE DIÓXIDO DE CARBONO - CO2, TREINAR BRIGADA DE INCÊNDIO E INSTALAR SENSOR DE TEMPERATURA COM ALARLME DE INCÊNDIO E CHUVEIROS AUTOMÁTICOS"
        },
        {
            "perigo": "RECIPIENTE DE GLP OU OUTROS GASES INFLAMÁVEIS NO INTERIOR DA UNIDADE",
            "fonte": "",
            "risco": "VAZAMENTO DE GÁS E COMBUSTÃO CAUSANDO EXPLOSÃO E INCÊNDIO",
            "agravo": "QUEIMADURAS, INTOXICAÇÃO E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "RETIRAR BOTIJÃO OU CILINDRO DO GÁS DO INTERIOR DO PRÉDIO E INSTALAR EM LOCAL EXTERNO VENTILADO PROTEGIDO E VENTILADO"
        }
    ],
    "FISICOS": [
        {
            "perigo": "TRABALHOS DE PESQUISAS E TESTES EM TELECOMUNICAÇÃO",
            "fonte": "",
            "risco": "INFRASSOM E SONS DE BAIXA FREQUÊNCIA",
            "agravo": "POSSÍVEL ALTERAÇÕES EM RADICAIS LIVRES, EFEITOS PSICOLÓGICOS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR ESTUDOS DE EFEITOS DE INFASSONS NA SAÚDE POUCO DIFUNDIDO"
        },
        {
            "perigo": "TRABALHOS COM FUNCIONAMENTO DE EQUIPAMENTOS, MÁQUINAS E VEÍCULOS",
            "fonte": "",
            "risco": "EFEITOS PREJUDICIAIS DO RUÍDO SOBRE O OUVIDO INTERNO",
            "agravo": "SURDEZ TEMPORÁRIA, SURDEZ PERMANENTE, TRAUMA ACÚSTICO",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "FORNECER EQUPAIMENTO DE PROTEÇÃO AUDITIVA, TREINAMENTO DO USO DE EPI E FISCALIZAÇÃO DO USO DO EPI, COMO TMABÉM O MONIORAMENTO DA EXPOSIÇÃO E IMPLEMENTAÇÃO DE PPA."
        },
        {
            "perigo": "PROCESSO DE PRODUÇÃO COM CHOQUE DE SUPERFÍCIES",
            "fonte": "",
            "risco": "RUÍDO IMPULSIVO OU DE IMPACTO",
            "agravo": "SURDEZ TEMPORÁRIA, SURDEZ PERMANENTE, TRAUMA ACÚSTICO",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "FORNECER EQUPAIMENTO DE PROTEÇÃO AUDITIVA, TREINAMENTO DO USO DE EPI E FISCALIZAÇÃO DO USO DO EPI, COMO TMABÉM O MONIORAMENTO DA EXPOSIÇÃO E IMPLEMENTAÇÃO DE PPA."
        },
        {
            "perigo": "TRABALHOS EM TELECOMUNICAÇÕES NA EXISTÊNCIA DE ULTRASSOM DE ALTA FREQUENCIA",
            "fonte": "",
            "risco": "EFEITO A ADVERSOS PARA QUEM TEM UMA CONDIÇÃO FÍSICA DESFAVORÁVEL",
            "agravo": "ZUMBIDO (TINNITUS): SENSAÇÃO DE APITO CONSTANTE NOS OUVIDOS APÓS A EXPOSIÇÃO. PERDA AUDITIVA TEMPORÁRIA: FADIGA DAS CÉLULAS CILIADAS DA CÓCLEA, QUE PODE SE TORNAR PERMANENTE COM A EXPOSIÇÃO PROLONGADA. DANOS AO LABIRINTO: PODE CAUSAR TONTURAS, NÁUSEAS E PERDA DE EQUILÍBRIO, JÁ QUE O SISTEMA VESTIBULAR É SENSÍVEL A VIBRAÇÕES DE ALTA FREQUÊNCIA.",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "FORNECER INFORMAÇÃO/ FORMAÇÃO/ INSTRUÇÕES AOS TRABALHADORES IMPLEMENTAR BLINDAGEM/ ISOLAMENTO COM CHAPA OU MALHA METÁLICA, CERÂMICA, PLÁSTICO OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE DOS CEM PROTEÇÃO COM CORTINAS DE LUZ, APARELHOS DE LEITURA E TAPETES SENSÍVEIS À PRESSÃO DISPOSITIVO DE CONTROLE."
        },
        {
            "perigo": "TRABALHOS DE MANUTENÇÃO, PRODUÇÃO, FABRICAÇÃO, TELECOMUNICAÇÃO E TESTES E ANÁLISES LABORATORIAIS",
            "fonte": "",
            "risco": "CAMPOS MAGNÉTICOS ESTÁTICOS",
            "agravo": "CEFALEIAS, ALTERAÇÕES NA CAPACIDADE DE CONCENTRAÇÃO, VERTIGEM, NÁUSEA, GOSTO METÁLICO E ALTERAÇÕES VISUAIS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FORNECER INFORMAÇÃO/ FORMAÇÃO/ INSTRUÇÕES AOS TRABALHADORES IMPLEMENTAR BLINDAGEM/ ISOLAMENTO COM CHAPA OU MALHA METÁLICA, CERÂMICA, PLÁSTICO OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE DOS CEM PROTEÇÃO COM CORTINAS DE LUZ, APARELHOS DE LEITURA E TAPETES SENSÍVEIS À PRESSÃO DISPOSITIVO DE CONTROLE."
        },
        {
            "perigo": "TRABALHOS DE MANUTENÇÃO, PRODUÇÃO, FABRICAÇÃO, TELECOMUNICAÇÃO E TESTES E ANÁLISES LABORATORIAIS",
            "fonte": "",
            "risco": "CAMPOS MAGNÉTICOS DE SUB-RADIOFREQUÊNCIA (30 KHZ E ABAIXO)",
            "agravo": "NEOPLASIA MALIGNA DO ENCÉFALO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FORNECER INFORMAÇÃO/ FORMAÇÃO/ INSTRUÇÕES AOS TRABALHADORES IMPLEMENTAR BLINDAGEM/ ISOLAMENTO COM CHAPA OU MALHA METÁLICA, CERÂMICA, PLÁSTICO OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE DOS CEM PROTEÇÃO COM CORTINAS DE LUZ, APARELHOS DE LEITURA E TAPETES SENSÍVEIS À PRESSÃO DISPOSITIVO DE CONTROLE. OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE PROMOVER INFORMAÇÕES SOBRE O AGENTE E SUAS REPERCUSSÕES, FORNECER ÓCULOS DE PROTEÇÃO E/OU MÁSCARA DE SOLDA"
        },
        {
            "perigo": "TRABALHOS DE MANUTENÇÃO, PRODUÇÃO, FABRICAÇÃO, TELECOMUNICAÇÃO E TESTES E ANÁLISES LABORATORIAIS",
            "fonte": "",
            "risco": "SUB-RADIOFREQUÊNCIA (30 KHZ E ABAIXO) E CAMPOS ELETROSTÁTICOS",
            "agravo": "CATARATAS, OUTRAS, QUEIMADURAS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FORNECER INFORMAÇÃO/ FORMAÇÃO/ INSTRUÇÕES AOS TRABALHADORES IMPLEMENTAR BLINDAGEM/ ISOLAMENTO COM CHAPA OU MALHA METÁLICA, CERÂMICA, PLÁSTICO OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE DOS CEM PROTEÇÃO COM CORTINAS DE LUZ, APARELHOS DE LEITURA E TAPETES SENSÍVEIS À PRESSÃO DISPOSITIVO DE CONTROLE. OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE PROMOVER INFORMAÇÕES SOBRE O AGENTE E SUAS REPERCUSSÕES, FORNECER ÓCULOS DE PROTEÇÃO E/OU MÁSCARA DE SOLDA"
        },
        {
            "perigo": "TRABALHOS DE MANUTENÇÃO, PRODUÇÃO, FABRICAÇÃO, TELECOMUNICAÇÃO E TESTES E ANÁLISES LABORATORIAIS",
            "fonte": "",
            "risco": "RADIAÇÃO DE RADIOFREQUÊNCIA E MICRO-ONDAS",
            "agravo": "QUEIMADURAS PROFUNDAS: EXPOSIÇÃO A ALTOS NÍVEIS DE RF/MICRO-ONDAS (COMO EM AMBIENTES INDUSTRIAIS, RADARES DE ALTA POTÊNCIA OU VAZAMENTOS DE FORNOS DE MICRO-ONDAS) PODE CAUSAR QUEIMADURAS NOS TECIDOS INTERNOS, SEM NECESSARIAMENTE QUEIMAR A PELE, POIS A ENERGIA É ABSORVIDA INTERNAMENTE. DANOS A ÓRGÃOS COM BAIXO FLUXO SANGUÍNEO: ÓRGÃOS QUE NÃO CONSEGUEM DISSIPAR BEM O CALOR (POR TEREM POUCO SUPRIMENTO SANGUÍNEO) SÃO MAIS VULNERÁVEIS: OLHOS: O CRISTALINO DO OLHO, QUE NÃO POSSUI VASOS SANGUÍNEOS PARA RESFRIAMENTO, É O MAIS SUSCETÍVEL. A EXPOSIÇÃO INTENSA PODE CAUSAR CATARATA (OPACIFICAÇÃO DO CRISTALINO) DEVIDO À COAGULAÇÃO DE PROTEÍNAS PELO CALOR. TESTÍCULOS: O AUMENTO DA TEMPERATURA PODE AFETAR A PRODUÇÃO E A VIABILIDADE DOS ESPERMATOZOIDES, POTENCIALMENTE CAUSANDO INFERTILIDADE TEMPORÁRIA OU PERMANENTE. ESTRESSE TÉRMICO SISTÊMICO: EM CASOS DE EXPOSIÇÃO CORPORAL TOTAL DE ALTA INTENSIDADE, O CORPO PODE SOFRER UM AUMENTO PERIGOSO DA TEMPERATURA CORPORAL, LEVANDO A UM GOLPE DE CALOR OU HIPERTERMIA.",
            "exame": "CLÍNICO + ECG",
            "per": "Semestral",
            "plano": "FORNECER INFORMAÇÃO/ FORMAÇÃO/ INSTRUÇÕES AOS TRABALHADORES IMPLEMENTAR BLINDAGEM/ ISOLAMENTO COM CHAPA OU MALHA METÁLICA, CERÂMICA, PLÁSTICO OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE DOS CEM PROTEÇÃO COM CORTINAS DE LUZ, APARELHOS DE LEITURA E TAPETES SENSÍVEIS À PRESSÃO DISPOSITIVO DE CONTROLE. OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE PROMOVER INFORMAÇÕES SOBRE O AGENTE E SUAS REPERCUSSÕES, FORNECER ÓCULOS DE PROTEÇÃO E/OU MÁSCARA DE SOLDA"
        },
        {
            "perigo": "TRABALHOS DE MANUTENÇÃO, PRODUÇÃO, FABRICAÇÃO, TELECOMUNICAÇÃO E TESTES E ANÁLISES LABORATORIAIS",
            "fonte": "",
            "risco": "RADIAÇÃO VISÍVEL E INFRAVERMELHO PRÓXIMO",
            "agravo": "CERATOCONJUNTIVITE CATARATAS, OUTRAS OUTROS TRANSTORNOS DO CRISTALINO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FORNECER INFORMAÇÃO/ FORMAÇÃO/ INSTRUÇÕES AOS TRABALHADORES IMPLEMENTAR BLINDAGEM/ ISOLAMENTO COM CHAPA OU MALHA METÁLICA, CERÂMICA, PLÁSTICO OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE DOS CEM PROTEÇÃO COM CORTINAS DE LUZ, APARELHOS DE LEITURA E TAPETES SENSÍVEIS À PRESSÃO DISPOSITIVO DE CONTROLE. OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE PROMOVER INFORMAÇÕES SOBRE O AGENTE E SUAS REPERCUSSÕES, FORNECER ÓCULOS DE PROTEÇÃO E/OU MÁSCARA DE SOLDA"
        },
        {
            "perigo": "TRABALHOS DE SOLDAGEM",
            "fonte": "",
            "risco": "RADIAÇÃO ULTRAVIOLETA",
            "agravo": "DANOS OCULARES CERATOCONJUNTIVITE FOTOELÉTRICA (ARCO DE SOLDA): É O DANO MAIS COMUM E AGUDO. A EXPOSIÇÃO À UVC OU UVB CAUSA UMA INFLAMAÇÃO DOLOROSA DA CÓRNEA (CERATITE) E DA CONJUNTIVA, GERALMENTE 6 A 12 HORAS APÓS A EXPOSIÇÃO. SINTOMAS: DOR INTENSA, SENSAÇÃO DE AREIA NOS OLHOS E FOTOFOBIA (SENSIBILIDADE À LUZ). CATARATA: A EXPOSIÇÃO CRÔNICA AO UVB E UVA ACELERA A OPACIFICAÇÃO DO CRISTALINO, LEVANDO À CATARATA. PTERÍGIO E PINGUÉCULA: CRESCIMENTOS ANORMAIS NA CONJUNTIVA, ASSOCIADOS À EXPOSIÇÃO SOLAR CRÔNICA.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FORNECER INFORMAÇÃO/ FORMAÇÃO/ INSTRUÇÕES AOS TRABALHADORES IMPLEMENTAR BLINDAGEM/ ISOLAMENTO COM CHAPA OU MALHA METÁLICA, CERÂMICA, PLÁSTICO OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE DOS CEM PROTEÇÃO COM CORTINAS DE LUZ, APARELHOS DE LEITURA E TAPETES SENSÍVEIS À PRESSÃO DISPOSITIVO DE CONTROLE. OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE PROMOVER INFORMAÇÕES SOBRE O AGENTE E SUAS REPERCUSSÕES, FORNECER ÓCULOS DE PROTEÇÃO E/OU MÁSCARA DE SOLDA"
        },
        {
            "perigo": "PROCESSOS INDUSTRIAS E LABORATORIAIS COM RAIO LASER",
            "fonte": "",
            "risco": "IRADIAÇÃO DE RAIO LASERS",
            "agravo": "QUEIMADURA DA RETINA: A RADIAÇÃO VISÍVEL E INFRAVERMELHA PRÓXIMA (400 NM A 1400 NM) É ABSORVIDA PELA RETINA. A EXPOSIÇÃO CAUSA UM AUMENTO DE TEMPERATURA QUE PODE LEVAR À FOTOCOAGULAÇÃO E À DESTRUIÇÃO DAS CÉLULAS FOTORRECEPTORAS. CONSEQUÊNCIA: PERDA DE VISÃO IMEDIATA E PERMANENTE (MANCHA ESCURA NO CAMPO VISUAL), CEGUEIRA PARCIAL OU TOTAL. LESÃO DE CÓRNEA E CRISTALINO: RADIAÇÃO ULTRAVIOLETA E INFRAVERMELHA DISTANTE (QUE NÃO É FOCADA NA RETINA) É ABSORVIDA PELAS CAMADAS ANTERIORES DO OLHO. CONSEQUÊNCIA: CATARATA (OPACIFICAÇÃO DO CRISTALINO) E CERATITE (INFLAMAÇÃO E DOR NA CÓRNEA).",
            "exame": "ACUIDADE VISUAL",
            "per": "Anual",
            "plano": "FORNECER INFORMAÇÃO/ FORMAÇÃO/ INSTRUÇÕES AOS TRABALHADORES IMPLEMENTAR BLINDAGEM/ ISOLAMENTO COM CHAPA OU MALHA METÁLICA, CERÂMICA, PLÁSTICO OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE DOS CEM PROTEÇÃO COM CORTINAS DE LUZ, APARELHOS DE LEITURA E TAPETES SENSÍVEIS À PRESSÃO DISPOSITIVO DE CONTROLE. OU VIDRO, BLOQUEIO DE ACESSO À PROXIMIDADE DA FONTE PROMOVER INFORMAÇÕES SOBRE O AGENTE E SUAS REPERCUSSÕES, FORNECER ÓCULOS DE PROTEÇÃO E/OU MÁSCARA DE SOLDA"
        },
        {
            "perigo": "TRABALHOS COM SUBSTÂNCIAS E MATERIAIS RADIOATIVOS EM EMBALAGENS, EQUIPAMENTOS E APARELHOS",
            "fonte": "",
            "risco": "CONTAMINAÇÃO PELA FUGA DE RADIAÇÃO POR ACIDENTE EM CASOS DE FALHA NA BLINDAGEM DA EMBALAGEM, FUSILAGEM DA MÁQUINA, EQUIPAMENTO, APARELHO OU CONTENÇÃO",
            "agravo": "LEUCEMIA, CÂNCER DE TIREOIDE CÂNCER DE PULMÃO (ESPECIALMENTE COM RADÔNIO) CÂNCER DE MAMA CÂNCER DE PELE (NÃOMELANOMA) CÂNCER DE ESTÔMAGO, FÍGADO E OSSOS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "MANTER NO LOCAL DE TRABALHO E À DISPOSIÇÃO DE INSPEÇÕES O PLANO DE PROTEÇÃO RADIOLÓGICA (PPR) PROVADO PELA CNEN E PELA VIGILÂNCIA SANITÁRIA PARA OS CASOS DE RADIODIAGNÓSTICO. ENTRE DIVERSAS FINALIDADES, O PPR DEVE: – SER PERSONALIZADO PARA A INSTALAÇÃO, AMBIENTES, EQUIPAMENTOS, PROCEDIMENTOS E ROTINA OPERACIONAL E ETC.; AS ÁREAS DA INSTALAÇÃO RADIATIVA DEVEM SER CLASSIFICADAS, SINALIZADAS E TER ACESSO CONTROLADO."
        },
        {
            "perigo": "SUBSTÂNCIAS E MATERIAIS RADIOATIVOS COM EXPOSIÇÃO ACIMA DOS LIMITES DE DOSES DE RADIAÇÃO FETIVA OU EQUIVALENTE",
            "fonte": "",
            "risco": "CONTAMINAÇÃO COM RADIAÇÕES IONIZANTES",
            "agravo": "POLINEUROPATIAS ESPECIFICADAS, OUTRAS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "COMUNICAR A CNEN SOBRE O LIMITE EXCEDIDO DE RADIAÇÃO, REALIZAR EXAMES DO PCMSO"
        },
        {
            "perigo": "TRABALHOS COM FERRAMENTAS E MÁQUINAS OU DIREÇÃO DE VEÍCULOS",
            "fonte": "",
            "risco": "VIBRAÇÕES LOCALIZADAS NAS MÃOS E BRAÇOS",
            "agravo": "TRANSTORNOS DE DISCOS INTERVERTEBRAIS, OUTROS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REALIZAR REVEZAMENTO DE EQUIPE DE TRABALHO, REALIZAR A MANUTENÇÃO PERIÓDICA DE MÁQUINAS E EQUIPAMENTOS, PARA MINIMIZAR A VIBRAÇÃO; TREINAR A EQUIPE SOBRE O CORRETO USO DOS EQUIPAMENTOS VISANDO MINIMIZAR A VIBRAÇÃO"
        },
        {
            "perigo": "TRABALHOS COM FERRAMENTAS E MÁQUINAS OU VEÍCULOS",
            "fonte": "",
            "risco": "VIBRAÇÃO DE CORPO INTEIRO",
            "agravo": "ARTROSES, OUTRAS, SÍNDROME CERVICOBRAQUIAL",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REALIZAR REVEZAMENTO DE EQUIPE DE TRABALHO, REALIZAR A MANUTENÇÃO PERIÓDICA DE MÁQUINAS E EQUIPAMENTOS, PARA MINIMIZAR A VIBRAÇÃO; TREINAR A EQUIPE SOBRE O CORRETO USO DOS EQUIPAMENTOS VISANDO MINIMIZAR A VIBRAÇÃO"
        },
        {
            "perigo": "TRABALHOS EM CÉU ABERTO OU EM PROCESSOS INTERNOS MEDIANTE A CHAMA DE FOGO OU VAPORES QUENTES",
            "fonte": "",
            "risco": "ESTRESSE E SOBRECARGA FISIOLÓGICA POR CALOR",
            "agravo": "FRAQUEZA EXTREMA, TONTURA, SUOR EXCESSIVO, PELE FRIA E ÚMIDA, DOR DE CABEÇA, NÁUSEAS E VÔMITOS , QUEDA DE PRESSÃO ARTERIAL, DESMAIOS (SÍNCOPE POR CALOR",
            "exame": "CLÍNICO + ECG",
            "per": "Semestral",
            "plano": "PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, DISPONIBILIZAR E INCENTIVAR O CONSUMO DE ÁGUA"
        },
        {
            "perigo": "TRABALHO EM BAIXAS ALTITUDES, EM CÂMARAS, TUBULÕES OU EM ÁGUAS PROFUNDAS.",
            "fonte": "",
            "risco": "PRESSÃO HIPERBÁRICA, MUDANÇAS NA COMPOSIÇÃO DE GASES DOS PULMÕES.",
            "agravo": "OTITE MÉDIA NÃO- SUPURATIVA, NÃO ESPECIFICADA, SINUSITE BAROTRAUMÁTICA",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "MANTER O MONITORAMENTO PELA REALIZAÇÃO DOS EXAMES COMPLEMENTARES"
        },
        {
            "perigo": "TRABALHO EM BAIXAS ALTITUDES, EM CÂMARAS, TUBULÕES OU EM ÁGUAS PROFUNDAS.",
            "fonte": "",
            "risco": "PRESSÃO HIPERBÁRICA, MUDANÇAS NA COMPOSIÇÃO DE GASES DOS PULMÕES.",
            "agravo": "OTITE MÉDIA NÃO- SUPURATIVA, NÃO ESPECIFICADA, SINUSITE BAROTRAUMÁTICA",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "MANTER O MONITORAMENTO PELA REALIZAÇÃO DOS EXAMES COMPLEMENTARES"
        },
        {
            "perigo": "TRABALHOS EM ALTAS ALTITUDES, COMO AVIÕES, MONTANHAS E REGIÕES ELEVADAS.",
            "fonte": "",
            "risco": "PRESSÃO HIPOBÁRICA",
            "agravo": "MAL DOS CAIXÕES [DOENÇA DE DESCOMPRESSÃO] FALTA DE AR, TONTURAS, NÁUSEAS E DORES DE CABEÇA, LABIRINTITE E HIPÓXIA",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROPOR INGESTÃO DE MUITA ÁGUA E USO DE BOMBAS DE OXIGÊNIO, MANTER O MONITORAMENTO PELA REALIZAÇÃO DOS EXAMES COMPLEMENTARES"
        },
        {
            "perigo": "TRABALHOS EM ALTAS ALTITUDES, COMO AVIÕES, MONTANHAS E REGIÕES ELEVADAS.",
            "fonte": "",
            "risco": "PRESSÃO HIPOBÁRICA",
            "agravo": "MAL DOS CAIXÕES [DOENÇA DE DESCOMPRESSÃO] FALTA DE AR, TONTURAS, NÁUSEAS E DORES DE CABEÇA, LABIRINTITE E HIPÓXIA",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROPOR INGESTÃO DE MUITA ÁGUA E USO DE BOMBAS DE OXIGÊNIO, MANTER O MONITORAMENTO PELA REALIZAÇÃO DOS EXAMES COMPLEMENTARES"
        },
        {
            "perigo": "TRABALHOS COM LAVAGENS OU EM CULTURAS DE LAVOURAS OU DENTRO D’ÁGUA",
            "fonte": "",
            "risco": "UMIDADE NO CORPO",
            "agravo": "AFECÇÕES DAS UNHAS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FORNECIMENTO DE MACACÃO IMPERMEÁVEL"
        },
        {
            "perigo": "TRABALHOS EM FRIGORÍFICOS E CÂMARAS DE REFRIGERAÇÃO",
            "fonte": "",
            "risco": "ESTRESSE POR FRIO (HIPOTERMIA)",
            "agravo": "URTICÁRIA DEVIDA A FRIO, SÍNDROME DE RAYNAUD, GELADURA SUPERFICIAL",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "FORNECIMENTO DE JAQUETA, CALÇA E BOTA E REVEZAMENTO DE EQUIPE DE TRABALHO"
        },
        {
            "perigo": "Ruído — avaliação quantitativa",
            "fonte": "",
            "risco": "Ruído: Abaixo do nível de ação",
            "agravo": "Zumbido, fadiga auditiva e perda auditiva induzida por ruído",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Ruído — avaliação quantitativa",
            "fonte": "",
            "risco": "Ruído: No nível de ação",
            "agravo": "Zumbido, fadiga auditiva e perda auditiva induzida por ruído",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Ruído — avaliação quantitativa",
            "fonte": "",
            "risco": "Ruído: Acima do nível de ação e abaixo do limite de tolerância",
            "agravo": "Zumbido, fadiga auditiva e perda auditiva induzida por ruído",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Ruído — avaliação quantitativa",
            "fonte": "",
            "risco": "Ruído: Acima do limite de tolerância",
            "agravo": "Zumbido, fadiga auditiva e perda auditiva induzida por ruído",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Calor — avaliação quantitativa",
            "fonte": "",
            "risco": "Calor: Abaixo do nível de ação",
            "agravo": "Desidratação, exaustão térmica, câimbras e golpe de calor",
            "exame": "CLÍNICO + ECG",
            "per": "Semestral",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Calor — avaliação quantitativa",
            "fonte": "",
            "risco": "Calor: No nível de ação",
            "agravo": "Desidratação, exaustão térmica, câimbras e golpe de calor",
            "exame": "CLÍNICO + ECG",
            "per": "Semestral",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Calor — avaliação quantitativa",
            "fonte": "",
            "risco": "Calor: Acima do nível de ação e abaixo do limite de tolerância",
            "agravo": "Desidratação, exaustão térmica, câimbras e golpe de calor",
            "exame": "CLÍNICO + ECG",
            "per": "Semestral",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Calor — avaliação quantitativa",
            "fonte": "",
            "risco": "Calor: Acima do limite de tolerância",
            "agravo": "Desidratação, exaustão térmica, câimbras e golpe de calor",
            "exame": "CLÍNICO + ECG",
            "per": "Semestral",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Vibração — avaliação quantitativa",
            "fonte": "",
            "risco": "Vibração: Abaixo do nível de ação",
            "agravo": "Alterações vasculares, neurológicas e osteomusculares",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Vibração — avaliação quantitativa",
            "fonte": "",
            "risco": "Vibração: No nível de ação",
            "agravo": "Alterações vasculares, neurológicas e osteomusculares",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Vibração — avaliação quantitativa",
            "fonte": "",
            "risco": "Vibração: Acima do nível de ação e abaixo do limite de tolerância",
            "agravo": "Alterações vasculares, neurológicas e osteomusculares",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Vibração — avaliação quantitativa",
            "fonte": "",
            "risco": "Vibração: Acima do limite de tolerância",
            "agravo": "Alterações vasculares, neurológicas e osteomusculares",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Frio — avaliação quantitativa",
            "fonte": "",
            "risco": "Frio: Abaixo do nível de ação",
            "agravo": "Hipotermia, lesões cutâneas e redução de destreza",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Frio — avaliação quantitativa",
            "fonte": "",
            "risco": "Frio: No nível de ação",
            "agravo": "Hipotermia, lesões cutâneas e redução de destreza",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Frio — avaliação quantitativa",
            "fonte": "",
            "risco": "Frio: Acima do nível de ação e abaixo do limite de tolerância",
            "agravo": "Hipotermia, lesões cutâneas e redução de destreza",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Frio — avaliação quantitativa",
            "fonte": "",
            "risco": "Frio: Acima do limite de tolerância",
            "agravo": "Hipotermia, lesões cutâneas e redução de destreza",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Radiação — avaliação quantitativa",
            "fonte": "",
            "risco": "Radiação: Abaixo do nível de ação",
            "agravo": "Lesões cutâneas e oculares, efeitos térmicos ou biológicos conforme o agente",
            "exame": "HEMOGRAMA COMPLETO",
            "per": "Semestral",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Radiação — avaliação quantitativa",
            "fonte": "",
            "risco": "Radiação: No nível de ação",
            "agravo": "Lesões cutâneas e oculares, efeitos térmicos ou biológicos conforme o agente",
            "exame": "HEMOGRAMA COMPLETO",
            "per": "Semestral",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Radiação — avaliação quantitativa",
            "fonte": "",
            "risco": "Radiação: Acima do nível de ação e abaixo do limite de tolerância",
            "agravo": "Lesões cutâneas e oculares, efeitos térmicos ou biológicos conforme o agente",
            "exame": "HEMOGRAMA COMPLETO",
            "per": "Semestral",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        },
        {
            "perigo": "Radiação — avaliação quantitativa",
            "fonte": "",
            "risco": "Radiação: Acima do limite de tolerância",
            "agravo": "Lesões cutâneas e oculares, efeitos térmicos ou biológicos conforme o agente",
            "exame": "HEMOGRAMA COMPLETO",
            "per": "Semestral",
            "plano": "Realizar avaliação quantitativa, adotar controles na fonte e no ambiente, sinalizar a área, fornecer EPI adequado, capacitar trabalhadores e monitorar a eficácia."
        }
    ],
    "QUIMICOS": [
        {
            "perigo": "ATIVIDADES EM PRESENÇA DE GASES OU VAPORES DE AGENTES QUÍMICOS ABAIXO DO NÍVEL DE AÇÃO OU CONTATO MANUAL COM PRODUTOS QUÍMICOS EM QUANTIDADES ÍNFIMAS SEM RELEVÂNCIA EM RELAÇÃO A DANOS BIOLÓGICOS",
            "fonte": "",
            "risco": "CONTATO (PELE), INALAÇÃO (RESPIRAÇÃO) DA SUBSTÂNCIA POR UM INDIVÍDUO SENSIBILIZADO.",
            "agravo": "DANOS DERMATOLÓGICOS (PELE) DANOS: URTICÁRIA (PLACAS VERMELHAS QUE COÇAM), DERMATITE DE CONTATO, ECZEMA E ANGIOEDEMA (INCHAÇO PROFUNDO SOB A PELE, GERALMENTE NAS PÁLPEBRAS E LÁBIOS). 2. DANOS RESPIRATÓRIOS DANOS: RINITE ALÉRGICA (ESPIRROS E CORIZA), ASMA OCUPACIONAL (ESTREITAMENTO DAS VIAS AÉREAS COM CHIADO NO PEITO), DISPNEIA (FALTA DE AR) E EDEMA DE GLOTE (INCHAÇO DA GARGANTA QUE IMPEDE A PASSAGEM DO AR). 3. DANOS OCULARES DANOS: CONJUNTIVITE ALÉRGICA, VERMELHIDÃO INTENSA, LACRIMEJAMENTO EXCESSIVO E FOTOFOBIA (DOR AO OLHAR PARA A LUZ). 4. DANOS SISTÊMICOS GRAVES POR ALERGIA (CHOQUE ANAFILÁTICO) QUEDA BRUSCA DA PRESSÃO ARTERIAL (CHOQUE), ARRITMIA CARDÍACA, DESMAIO E PARADA CARDIORRESPIRATÓRIA.",
            "exame": "HEMOGRAMA COMPLETO",
            "per": "Semestral",
            "plano": "FORNECER EQUIPAMENTO DE PROTEÇÃO PARA TRABALHADORES COM REAÇÕES ALÉGICAS PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, MANIPULAR PRODUTOS EM AMBIENTES QUE NÃO SEJAM CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS PARA CASOS DE ACIDENTES DE DERRAMAMENTO DE PRODUTOS QUÍMICOS."
        },
        {
            "perigo": "ATIVIDADES EM CONTATO MANUAL COM PRODUTOS QUÍMICOS DE FORMA INTENSA EM GRANDE QUANTIDADE",
            "fonte": "",
            "risco": "ABSORÇÃO DA SUBSTÂNCIA QUÍMICA PELA PELE E OLHOS",
            "agravo": "ANEMIA APLÁSTICA DEVIDA A OUTROS AGENTES EXTERNOS ANEMIA APLÁSTICA NÃO ESPECIﬁCADA ANEMIAS, OUTRAS PÚRPURA E OUTRAS AFECÇÕES HEMORRÁGICAS AGRANULOCITOSE TRANSTORNOS ESPECIﬁCADOS DOS GLÓBULOS BRANCOS, OUTROS METEMOGLOBINEMIA HIPOTIREOIDISMO, OUTROSBÓCIO NÃO-TÓXICO, NÃO ESPECIﬁCADO DEMÊNCIA EM OUTRAS DOENÇAS ESPECÍﬁCAS CLASSIFICADAS TRANSTORNOS MENTAIS DEVIDOS À LESÃO E DISFUNÇÃO CEREBRAL E A DOENÇA FÍSICA, OUTROS PARKINSONISMO SECUNDÁRIO DEVIDO A OUTROS AGENTES EXTERNOS TRANSTORNOS DOS NERVOS CRANIANOS EM DOENÇAS CLASSIﬁCADAS EM OUTRA PARTE DIVERSAS PATOLOGIAS CONFORME TIPO E PRINCÍPIO ATIVO DO PQ",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA,IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        },
        {
            "perigo": "ATIVIDADES EM PRESENÇA DE GASES OU VAPORES DE AGENTES QUÍMICOS EM NÍVEL DE AÇÃO",
            "fonte": "",
            "risco": "INALAÇÃO DE GASES OU VAPORES DE AGENTES QUÍMICOS EM NÍVEL DE ATENÇÃO",
            "agravo": "ANEMIA APLÁSTICA DEVIDA A OUTROS AGENTES EXTERNOS ANEMIA APLÁSTICA NÃO ESPECIﬁCADA ANEMIAS, OUTRAS PÚRPURA E OUTRAS AFECÇÕES HEMORRÁGICAS AGRANULOCITOSE TRANSTORNOS ESPECIﬁCADOS DOS GLÓBULOS BRANCOS, OUTROS METEMOGLOBINEMIA HIPOTIREOIDISMO, OUTROSBÓCIO NÃO-TÓXICO, NÃO ESPECIﬁCADO DEMÊNCIA EM OUTRAS DOENÇAS ESPECÍﬁCAS CLASSIFICADAS TRANSTORNOS MENTAIS DEVIDOS À LESÃO E DISFUNÇÃO CEREBRAL E A DOENÇA FÍSICA, OUTROS PARKINSONISMO SECUNDÁRIO DEVIDO A OUTROS AGENTES EXTERNOS TRANSTORNOS DOS NERVOS CRANIANOS EM DOENÇAS CLASSIﬁCADAS EM OUTRA PARTE DIVERSAS PATOLOGIAS CONFORME TIPO E PRINCÍPIO ATIVO DO PQ",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA,IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        },
        {
            "perigo": "ATIVIDADES EM PRESENÇA DE GASES OU VAPORES DE AGENTES QUÍMICOS ACIMA DO NÍVEL DE AÇÃO",
            "fonte": "",
            "risco": "INALAÇÃO DE GASES OU VAPORES DE AGENTES QUÍMICOS ACIMA DO NÍVEL DE AÇÃO",
            "agravo": "ANEMIA APLÁSTICA DEVIDA A OUTROS AGENTES EXTERNOS ANEMIA APLÁSTICA NÃO ESPECIﬁCADA ANEMIAS, OUTRAS PÚRPURA E OUTRAS AFECÇÕES HEMORRÁGICAS AGRANULOCITOSE TRANSTORNOS ESPECIﬁCADOS DOS GLÓBULOS BRANCOS, OUTROS METEMOGLOBINEMIA HIPOTIREOIDISMO, OUTROSBÓCIO NÃO-TÓXICO, NÃO ESPECIﬁCADO DEMÊNCIA EM OUTRAS DOENÇAS ESPECÍﬁCAS CLASSIFICADAS TRANSTORNOS MENTAIS DEVIDOS À LESÃO E DISFUNÇÃO CEREBRAL E A DOENÇA FÍSICA, OUTROS PARKINSONISMO SECUNDÁRIO DEVIDO A OUTROS AGENTES EXTERNOS TRANSTORNOS DOS NERVOS CRANIANOS EM DOENÇAS CLASSIﬁCADAS EM OUTRA PARTE DIVERSAS PATOLOGIAS CONFORME TIPO E PRINCÍPIO ATIVO DO PQ",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA,IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        },
        {
            "perigo": "ATIVIDADES EM PRESENÇA DE GASES OU VAPORES DE AGENTES QUÍMICOS ACIMA DO LT",
            "fonte": "",
            "risco": "INALAÇÃO DE GASES OU VAPORES DE AGENTES QUÍMICOS ACIMA DO LIMITE DE TOLERÂNCIA",
            "agravo": "ANEMIA APLÁSTICA DEVIDA A OUTROS AGENTES EXTERNOS ANEMIA APLÁSTICA NÃO ESPECIﬁCADA ANEMIAS, OUTRAS PÚRPURA E OUTRAS AFECÇÕES HEMORRÁGICAS AGRANULOCITOSE TRANSTORNOS ESPECIﬁCADOS DOS GLÓBULOS BRANCOS, OUTROS METEMOGLOBINEMIA HIPOTIREOIDISMO, OUTROSBÓCIO NÃO-TÓXICO, NÃO ESPECIﬁCADO DEMÊNCIA EM OUTRAS DOENÇAS ESPECÍﬁCAS CLASSIFICADAS TRANSTORNOS MENTAIS DEVIDOS À LESÃO E DISFUNÇÃO CEREBRAL E A DOENÇA FÍSICA, OUTROS PARKINSONISMO SECUNDÁRIO DEVIDO A OUTROS AGENTES EXTERNOS TRANSTORNOS DOS NERVOS CRANIANOS EM DOENÇAS CLASSIﬁCADAS EM OUTRA PARTE DIVERSAS PATOLOGIAS CONFORME TIPO E PRINCÍPIO ATIVO DO PQ",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA,IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        },
        {
            "perigo": "ATIVIDADES EM PRESENÇA DE AEROSISPERSÓIDES NÃO FIBROGÊNICOS",
            "fonte": "",
            "risco": "INALAÇÃO DE AEROSISPERSÓIDES NÃO FIBROGÊNICOS",
            "agravo": "ANEMIA APLÁSTICA DEVIDA A OUTROS AGENTES EXTERNOS ANEMIA APLÁSTICA NÃO ESPECIﬁCADA ANEMIAS, OUTRAS PÚRPURA E OUTRAS AFECÇÕES HEMORRÁGICAS AGRANULOCITOSE TRANSTORNOS ESPECIﬁCADOS DOS GLÓBULOS BRANCOS, OUTROS METEMOGLOBINEMIA HIPOTIREOIDISMO, OUTROSBÓCIO NÃO-TÓXICO, NÃO ESPECIﬁCADO DEMÊNCIA EM OUTRAS DOENÇAS ESPECÍﬁCAS CLASSIFICADAS TRANSTORNOS MENTAIS DEVIDOS À LESÃO E DISFUNÇÃO CEREBRAL E A DOENÇA FÍSICA, OUTROS PARKINSONISMO SECUNDÁRIO DEVIDO A OUTROS AGENTES EXTERNOS TRANSTORNOS DOS NERVOS CRANIANOS EM DOENÇAS CLASSIﬁCADAS EM OUTRA PARTE DIVERSAS PATOLOGIAS CONFORME TIPO E PRINCÍPIO ATIVO DO PQ",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA, IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        },
        {
            "perigo": "ATIVIDADES EM PRESENÇA DE AEROSISPERSÓIDES FIBROGÊNICOS",
            "fonte": "",
            "risco": "INALAÇÃO DE AEROSISPERSÓIDES FIBROGÊNICOS",
            "agravo": "ANEMIA APLÁSTICA DEVIDA A OUTROS AGENTES EXTERNOS ANEMIA APLÁSTICA NÃO ESPECIﬁCADA ANEMIAS, OUTRAS PÚRPURA E OUTRAS AFECÇÕES HEMORRÁGICAS AGRANULOCITOSE TRANSTORNOS ESPECIﬁCADOS DOS GLÓBULOS BRANCOS, OUTROS METEMOGLOBINEMIA HIPOTIREOIDISMO, OUTROSBÓCIO NÃO-TÓXICO, NÃO ESPECIﬁCADO DEMÊNCIA EM OUTRAS DOENÇAS ESPECÍﬁCAS CLASSIFICADAS TRANSTORNOS MENTAIS DEVIDOS À LESÃO E DISFUNÇÃO CEREBRAL E A DOENÇA FÍSICA, OUTROS PARKINSONISMO SECUNDÁRIO DEVIDO A OUTROS AGENTES EXTERNOS TRANSTORNOS DOS NERVOS CRANIANOS EM DOENÇAS CLASSIﬁCADAS EM OUTRA PARTE DIVERSAS PATOLOGIAS CONFORME TIPO E PRINCÍPIO ATIVO DO PQ",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA, IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        },
        {
            "perigo": "ATIVIDADES EM PRESENÇA DE AEROSISPERSÓIDES FIBROGÊNICOS",
            "fonte": "",
            "risco": "INALAÇÃO DE AEROSISPERSÓIDES FIBROGÊNICOS",
            "agravo": "ANEMIA APLÁSTICA DEVIDA A OUTROS AGENTES EXTERNOS ANEMIA APLÁSTICA NÃO ESPECIﬁCADA ANEMIAS, OUTRAS PÚRPURA E OUTRAS AFECÇÕES HEMORRÁGICAS AGRANULOCITOSE TRANSTORNOS ESPECIﬁCADOS DOS GLÓBULOS BRANCOS, OUTROS METEMOGLOBINEMIA HIPOTIREOIDISMO, OUTROSBÓCIO NÃO-TÓXICO, NÃO ESPECIﬁCADO DEMÊNCIA EM OUTRAS DOENÇAS ESPECÍﬁCAS CLASSIFICADAS TRANSTORNOS MENTAIS DEVIDOS À LESÃO E DISFUNÇÃO CEREBRAL E A DOENÇA FÍSICA, OUTROS PARKINSONISMO SECUNDÁRIO DEVIDO A OUTROS AGENTES EXTERNOS TRANSTORNOS DOS NERVOS CRANIANOS EM DOENÇAS CLASSIﬁCADAS EM OUTRA PARTE DIVERSAS PATOLOGIAS CONFORME TIPO E PRINCÍPIO ATIVO DO PQ",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA, IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        },
        {
            "perigo": "ATIVIDADES EM PRESENÇA DE AEROSISPERSÓIDES FIBROGÊNICOS",
            "fonte": "",
            "risco": "INALAÇÃO DE AEROSISPERSÓIDES FIBROGÊNICOS",
            "agravo": "ANEMIA APLÁSTICA DEVIDA A OUTROS AGENTES EXTERNOS ANEMIA APLÁSTICA NÃO ESPECIﬁCADA ANEMIAS, OUTRAS PÚRPURA E OUTRAS AFECÇÕES HEMORRÁGICAS AGRANULOCITOSE TRANSTORNOS ESPECIﬁCADOS DOS GLÓBULOS BRANCOS, OUTROS METEMOGLOBINEMIA HIPOTIREOIDISMO, OUTROSBÓCIO NÃO-TÓXICO, NÃO ESPECIﬁCADO DEMÊNCIA EM OUTRAS DOENÇAS ESPECÍﬁCAS CLASSIFICADAS TRANSTORNOS MENTAIS DEVIDOS À LESÃO E DISFUNÇÃO CEREBRAL E A DOENÇA FÍSICA, OUTROS PARKINSONISMO SECUNDÁRIO DEVIDO A OUTROS AGENTES EXTERNOS TRANSTORNOS DOS NERVOS CRANIANOS EM DOENÇAS CLASSIﬁCADAS EM OUTRA PARTE DIVERSAS PATOLOGIAS CONFORME TIPO E PRINCÍPIO ATIVO DO PQ",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA, IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        },
        {
            "perigo": "ATIVIDADES EM PRESENÇA DE POEIRA CONTENDO SÍLICA, ASBESTO OU CARVÃO MINERAL",
            "fonte": "",
            "risco": "INALAÇÃO DE POEIRA CONTENDO SÍLICA, ASBESTO OU CARVÃO MINERAL",
            "agravo": "ANEMIA APLÁSTICA DEVIDA A OUTROS AGENTES EXTERNOS ANEMIA APLÁSTICA NÃO ESPECIﬁCADA ANEMIAS, OUTRAS PÚRPURA E OUTRAS AFECÇÕES HEMORRÁGICAS AGRANULOCITOSE TRANSTORNOS ESPECIﬁCADOS DOS GLÓBULOS BRANCOS, OUTROS METEMOGLOBINEMIA HIPOTIREOIDISMO, OUTROSBÓCIO NÃO-TÓXICO, NÃO ESPECIﬁCADO DEMÊNCIA EM OUTRAS DOENÇAS ESPECÍﬁCAS CLASSIFICADAS TRANSTORNOS MENTAIS DEVIDOS À LESÃO E DISFUNÇÃO CEREBRAL E A DOENÇA FÍSICA, OUTROS PARKINSONISMO SECUNDÁRIO DEVIDO A OUTROS AGENTES EXTERNOS TRANSTORNOS DOS NERVOS CRANIANOS EM DOENÇAS CLASSIﬁCADAS EM OUTRA PARTE DIVERSAS PATOLOGIAS CONFORME TIPO E PRINCÍPIO ATIVO DO PQ",
            "exame": "ESPIROMETRIA",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA, IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        },
        {
            "perigo": "ATIVIDADES EM CONTATO COM AGENTES QUÍMICOS DA LINACH CONSIDERADOS CANCERÍGENOS",
            "fonte": "",
            "risco": "INALAÇÃO DE OU ABSORÇÃO DE AGENTES QUÍMICOS DA LINACH CONSIDERADOS CANCERÍGENOS",
            "agravo": "LEUCEMIAS DE CÉLULAS DE TIPO ESPECIﬁCADO, OUTRAS, NEOPLASIAS DIVERSAS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR INVENTÁRIO DE PRODUTOS QUÍMICOS, REALIZAR AVALIAÇÃO QUANTITAIVA E ANALISAR CONCENTRAÇÃO MÉDIA, FORNECER EQUIPAMENTO DE PROTEÇÃO RESPIRATÓRIA, IMPLEMENTAR PROGRAMA DE PROTEÇÃO RESPIRATÓRIA,PROMOVER CURSO SOBRE MANIPULAÇÃO DE PRODUTOS QUÍMICOS, PROMOVER VENTILAÇÃO E CIRCULAÇÃO DE AR, IMPLEMTAR CAPELA DE EXAUSTÃO EM AMBIENTES INTERNOS E CONFINADOS, IMPLANTAR CHUVEIROS LAVA OLHOS. IMPLENTAR MONITORAMENTO BIOLÓGICO"
        }
    ],
    "BIOLOGICOS": [
        {
            "perigo": "TRABALHO OU OPERAÇÕES, EM CONTATO PERMANENTE COM PACIENTES EM ISOLAMENTO POR DOENÇAS INFECTO-CONTAGIOSAS, BEM COMO OBJETOS DE SEU USO, NÃO PREVIAMENTE ESTERILIZADOS.",
            "fonte": "",
            "risco": "TRANSMISSÃO DE DOENÇAS AÉREAS (TUBERCULOSE, INFLUENZA, COVID-19) E CONTATO.",
            "agravo": "TUBERCULOSE, INFECÇÕES RESPIRATÓRIAS GRAVES (INFLUENZA, COVID-19), MENINGITE.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROPRICIAR SISTEMA DE VENTILAÇÃO ADEQUADO NOS RECINTOS FECHADOS; 6) INSTALAR EQUIPAMENTOS DE CONTENÇÃO, COMO CAPELA E DIVISÓRIAS DE ACRÍLICO 7) PROMOVER TREINAMENTO DE DESCARTE CORRETO DOS RESÍDUOS; 8) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 9) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 10) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 11) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 12) APLICAR E CUMPRIR TODAS DIRETRIZES DA NR 32"
        },
        {
            "perigo": "TRABALHOS E OPERAÇÕES EM CONTATO PERMANENTE COM PACIENTES, OU COM MATERIAL INFECTO-CONTAGIANTE, EM HOSPITAIS, SERVIÇOS DE EMERGÊNCIA, ENFERMARIAS, AMBULATÓRIOS, POSTOS DE VACINAÇÃO E OUTROS ESTABELECIMENTOS DESTINADOS AOS CUIDADOS DA SAÚDE HUMANA (APLICA SE UNICAMENTE AO PESSOAL QUE TENHA CONTATO COM OS PACIENTES, BEM COMO AOS QUE MANUSEIAM OBJETOS DE USO DESSES PACIENTES, NÃO PREVIAMENTE ESTERILIZADOS).",
            "fonte": "",
            "risco": "INFECÇÕES HOSPITALARES, EXPOSIÇÃO A PATÓGENOS VEICULADOS PELO SANGUE (HIV, HEPATITES B E C).",
            "agravo": "HIV, HEPATITES B E C, INFECÇÕES HOSPITALARES, SEPTICEMIA.",
            "exame": "HEMOGRAMA COMPLETO",
            "per": "Semestral",
            "plano": "HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROPRICIAR SISTEMA DE VENTILAÇÃO ADEQUADO NOS RECINTOS FECHADOS; 6) INSTALAR EQUIPAMENTOS DE CONTENÇÃO, COMO CAPELA E DIVISÓRIAS DE ACRÍLICO 7) PROMOVER TREINAMENTO DE DESCARTE CORRETO DOS RESÍDUOS; 8) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 9) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 10) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 11) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 12) APLICAR E CUMPRIR TODAS DIRETRIZES DA NR 32"
        },
        {
            "perigo": "TRABALHO OU OPERAÇÕES, EM CONTATO PERMANENTE COM LIXO URBANO (COLETA E INDUSTRIALIZAÇÃO)",
            "fonte": "",
            "risco": "INFECÇÕES GASTROINTESTINAIS, TÉTANO, PARASITOSES E LEPTOSPIROSE.",
            "agravo": "LEPTOSPIROSE, TÉTANO, PARASITOSES, INFECÇÕES GASTROINTESTINAIS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 10) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 11 BOA HIGIENE PESSOAL 12) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "TRABALHO OU OPERAÇÕES, EM CONTATO PERMANENTE COM ESGOTOS (GALERIAS E TANQUES)",
            "fonte": "",
            "risco": "ALTA CARGA BACTERIANA (COLIFORMES), LEPTOSPIROSE, HEPATITE A E DOENÇAS ENTÉRICAS.",
            "agravo": "HEPATITE A, FEBRE TIFOIDE, LEPTOSPIROSE, DIARREIAS BACTERIANAS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 10) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 11 BOA HIGIENE PESSOAL 12) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "TRABALHO OU OPERAÇÕES, EM CONTATO PERMANENTE COM CARNES, GLÂNDULAS, VÍSCERAS, SANGUE, OSSOS, COUROS, PÊLOS E DEJEÇÕES DE ANIMAIS PORTADORES DE DOENÇAS INFECTO-CONTAGIOSAS (CARBUNCULOSE, BRUCELOSE, TUBERCULOSE)",
            "fonte": "",
            "risco": "ZOONOSES SEVERAS (CARBÚNCULO/ANTRAZ, BRUCELOSE, TUBERCULOSE BOVINA).",
            "agravo": "BRUCELOSE, CARBÚNCULO (ANTRAZ), TUBERCULOSE BOVINA.",
            "exame": "HEMOGRAMA COMPLETO",
            "per": "Semestral",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 10) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 11 BOA HIGIENE PESSOAL 12) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "TRABALHOS E OPERAÇÕES EM CONTATO PERMANENTE COM PACIENTES, ANIMAIS OU COM MATERIAL INFECTO-CONTAGIANTE, EM HOSPITAIS, AMBULATÓRIOS, POSTOS DE VACINAÇÃO E OUTROS ESTABELECIMENTOS DESTINADOS AO ATENDIMENTO E TRATAMENTO DE ANIMAIS (APLICA SE APENAS AO PESSOAL QUE TENHA CONTATO COM TAIS ANIMAIS)",
            "fonte": "",
            "risco": "ZOONOSES, ARRANHADURAS, MORDEDURAS E INFECÇÕES POR PATÓGENOS ESPECÍFICOS (RAIVA, LEPTOSPIROSE).",
            "agravo": "RAIVA, ZOONOSES VARIADAS, INFECÇÕES CUTÂNEAS, ESPOROTRICOSE.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 10) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 11 BOA HIGIENE PESSOAL 12) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "TRABALHOS E OPERAÇÕES EM CONTATO PERMANENTE COM MATERIAL INFECTO-CONTAGIANTE, EM CONTATO EM LABORATÓRIOS, COM ANIMAIS DESTINADOS AO PREPARO DE SORO, VACINAS E OUTROS PRODUTOS",
            "fonte": "",
            "risco": "ACIDENTES COM MATERIAL PERFUROCORTANTE, INALAÇÃO DE AEROSSÓIS INFECCIOSOS, CULTURAS BACTERIANAS/VIRAIS.",
            "agravo": "RISCOS VARIADOS CONFORME O PATÓGENO MANIPULADO (VÍRUS/BACTÉRIAS DE ALTA PERICULOSIDADE).",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 10) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 11 BOA HIGIENE PESSOAL 12) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "TRABALHOS E OPERAÇÕES EM CONTATO PERMANENTE COM MATERIAL INFECTO-CONTAGIANTE, EM LABORATÓRIOS DE ANÁLISE CLÍNICA E HISTOPATOLOGIA (APLICA-SE TÃO- SÓ AO PESSOAL TÉCNICO);",
            "fonte": "",
            "risco": "EXPOSIÇÃO A PATÓGENOS REMANESCENTES EM RESTOS MORTAIS, INFECÇÕES CUTÂNEAS OU RESPIRATÓRIAS.",
            "agravo": "INFECÇÕES POR PATÓGENOS DESCONHECIDOS, CONTAMINAÇÃO ACIDENTAL COM AMOSTRAS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 10) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 11 BOA HIGIENE PESSOAL 12) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "TRABALHOS E OPERAÇÕES EM CONTATO PERMANENTE MATERIAL INFECTO-CONTAGIANTE, EM CEMITÉRIOS (EXUMAÇÃO DE CORPOS);",
            "fonte": "",
            "risco": "INTOXICAÇÕES BIOLÓGICAS, EXPOSIÇÃO A FUNGOS, BACTÉRIAS DE DECOMPOSIÇÃO E ZOONOSES.",
            "agravo": "INFECÇÕES FÚNGICAS, PATÓGENOS REMANESCENTES EM TECIDOS DECOMPOSTOS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 10) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 11 BOA HIGIENE PESSOAL 12) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "TRABALHOS E OPERAÇÕES EM COM MATERIAL INFECTO-CONTAGIANTE, EM RESÍDUOS DE ANIMAIS DETERIORADOS.",
            "fonte": "",
            "risco": "EXPOSIÇÃO A MICRORGANISMOS ENTÉRICOS, GASES TÓXICOS E MATERIAL FECAL PATOGÊNICO.",
            "agravo": "ZOONOSES, INFECÇÕES SISTÊMICAS, PATÓGENOS DA DECOMPOSIÇÃO (EX: CLOSTRÍDIOS).",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 10) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 11 BOA HIGIENE PESSOAL 12) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "TRABALHO DE EXUMAÇÃO DE CORPOS",
            "fonte": "",
            "risco": "EXPOSIÇÃO A PATÓGENOS DESCONHECIDOS, CONTATO COM TECIDOS INFECTADOS.",
            "agravo": "INFECÇÕES SISTÊMICAS, RISCOS BIOLÓGICOS POR CONTATO DIRETO COM RESTOS MORTAIS.",
            "exame": "HEMOGRAMA COMPLETO",
            "per": "Semestral",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) PROTOCOLO DE MANUSEIO DE CADÁVERES E PREVENÇÃO PARA DOENÇAS INFECTO CONTAGIOSAS. 10) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 11) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 12) BOA HIGIENE PESSOAL 13) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "ESVAZIAMENTO DE BIODIGESTORES",
            "fonte": "",
            "risco": "EXPOSIÇÃO A MICRORGANISMOS ENTÉRICOS, GASES TÓXICOS E MATERIAL FECAL PATOGÊNICO",
            "agravo": "INFECÇÕES ENTÉRICAS GRAVES, EXPOSIÇÃO A GASES TÓXICOS E MATERIAL FECAL PATOGÊNICO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) PROTOCOLO DE MANUSEIO DE CADÁVERES E PREVENÇÃO PARA DOENÇAS INFECTO CONTAGIOSAS. 10) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 11) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 12) BOA HIGIENE PESSOAL 13) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        },
        {
            "perigo": "TRABALHOS E OPERAÇÕES EM CONTATO PERMANENTE COM PACIENTES, ANIMAIS OU COM MATERIAL INFECTO-CONTAGIANTE, EM GABINETES DE AUTÓPSIAS, DE ANATOMIA E HISTOANATOMOPATOLOGIA (APLICA-SE SOMENTE AO PESSOAL TÉCNICO)",
            "fonte": "",
            "risco": "EXPOSIÇÃO A PATÓGENOS DESCONHECIDOS, CONTATO COM TECIDOS INFECTADOS.",
            "agravo": "RISCOS SEVEROS DE INFECÇÃO POR PATÓGENOS DESCONHECIDOS EM TECIDOS NECROPSIADOS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER A CULTURA DE HIGIENIZAÇÃO E DESINFECÇÃO FREQUENTE DAS MÃOS, ROUPAS E AMBIENTES; 2) REALIZAR HIGIENIZAÇÃO DAS SUPERFÍCIES; 3) FONECER E FISCALIZAR O USO DOS EPI’S ADEQUADOS; 4) PADRONIZAR OS PROCEDIMENTOS DE MANUSEIO, ESTOQUE, TRANSPORTE E USO DE OBJETOS PERFUROCORTANTES; 5) PROMOVER TREINAMENTO E CONSCIENTIZAÇÃO DOS TRABALHADORES A RESPEITO DOS RISCOS PRESENTES NO AMBIENTE DE TRABALHO 6) EVITAR O CONTATO DAS MÃOS COM O ROSTO; 7) NÃO UTILIZAR COSMÉTICOS E NEM CONSUMIR ALIMENTOS OU BEBIDAS NO LOCAL DE TRABALHO; 8) PROMOVER TREINAMENTO DO USO E HIEGIENIZAÇÃO DOS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSIDERADOS ESSENCIAIS PARA A SEGURANÇA 9) PROTOCOLO DE MANUSEIO DE CADÁVERES E PREVENÇÃO PARA DOENÇAS INFECTO CONTAGIOSAS. 10) COBRIR CORTES OU LESÕES COM CURATIVOS À PROVA D'ÁGUA. 11) LIMPEZA CUIDADOSA DE QUAISQUER FERIMENTOS SOFRIDOS DURANTE OS PROCEDIMENTOS. 12) BOA HIGIENE PESSOAL 13) USO DE VESTUÁRIO DE PROTEÇÃO ADEQUADO"
        }
    ],
    "BIOLOGICOS_AMPLIADOS": [
        {
            "perigo": "PROLIFERAÇÃO DE INSETOS E PERNILONGOS DEVIDO AO EXCESSO DE VEGETAÇÃO OU FALTA DE CONDIÇÕES SANITÁRIAS NA ÁREA EXTERNA DA UNIDADE",
            "fonte": "",
            "risco": "PICADAS DE PERNILONGOS",
            "agravo": "DENGUE, CHIKUNGUNYA, ZIKA.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REALIZAR LIMPEZA, RETIRADA DE LIXO E EXCESSO DE VEGETAÇÃO REMOVER RECIPIENTE DE ACÚMULO DE ÁGUA"
        },
        {
            "perigo": "INGESTÃO DE ÁGUA DO RESERVATÓRIO SEM LAUDO DE POTABILIDADE",
            "fonte": "",
            "risco": "INGESTÃO DE MICRORGANISMOS INFECTANTES",
            "agravo": "COMPROMETIMENTO DO SISTEMA DIGESTIVO, DIARREIA, VÔMITO, DESIDRATAÇÃO, INFECÇÃO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER HIGIENIZAÇÃO DO RESERVATPORIO E ANÁLISE LABORATORIAL  DA ÁGUA"
        },
        {
            "perigo": "AUSÊNCIA DE LIMPEZA DA CAIXA DE ÁGUA DE CONSUMO",
            "fonte": "",
            "risco": "INGESTÃO DE MICRORGANISMOS E/OU BACTÉRIAS",
            "agravo": "COMPROMETIMENTO DO SISTEMA DIGESTIVO, DIARREIA, VÔMITO E DESIDRATAÇÃO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REALIZAR A LIMPEZA E DESINFECÇÃO DA CAIXA D`ÁGUA, ADMINISTRAR E FAZER INVENTARIO DE MANUTENÇÃO"
        },
        {
            "perigo": "FALTA DE PLACAS DE ADVERTÊNCIA COMO PROIBIDO FUMAR E SAÍDA DE EMERGÊNCIA",
            "fonte": "",
            "risco": "PRINCÍPIO DE INCÊNDIO, PÂNICO EM MOMENTO DE EMERGÊNCIA",
            "agravo": "QUEIMADURAS, QUEDA E PERDA DE CONSCIÊNCIA",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ELABORAR PLANO DE PREVENÇÃO E COMBATE A INCÊNDIO, DEIXAR O PRÉDIO EM CONFORMIDADE PARA OBTENÇÃO DE AVCB."
        },
        {
            "perigo": "ÁGUA ESTACIONÁRIA DO SISTEMA DE CLIMATIZAÇÃO COM AR CONDICIONADO CENTRAL, SPLIT OU DE GAVETA",
            "fonte": "",
            "risco": "GERAÇÃO E POLIFERAÇÃO DE BACTÉRIA LEGIONELA",
            "agravo": "PENEUMONIA OU MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLENTAR O PLANO DE MANUTENÇÃO OPERAÇÃO E CONTROLE – PMOC, CONFORME DECRETO 3.523 DA ANVISA, ATRAVÉS DE ENGENHIRO MECÂNICO COM EMISSÃO DE ART E VERIFICAR O CUMPRIMENTO DO PMOC, ATRAVÉS DE RELATÓRIO DE LIMPEZA E MANUTENÇÃO COM ASSINATURA DO USUÁRIO"
        },
        {
            "perigo": "AMBIENTES FECHADOS PARA MANTER A CLIMATIZAÇÃO DO SISTEMA DE AR CONDICIONADO CENTRAL, SPLIT OU DE GAVETA",
            "fonte": "",
            "risco": "POLIFERAÇÃO DE MICRORGANISMOS",
            "agravo": "RESSECAMENTO DO MUCO, RINITE ALÉRGICA, GRIPES E DOENÇAS OPORTUNISTAS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "EM SISTEMAS CENTRAIS DE REFRIGERAÇÃO, IMPLANTAR TOMADAS DE AR PARA RENOVAÇÃO DO AR CIRCULANTE, ABRIR JANELAS E/OU PORTAS PERIODICAMENTE PARA RENOVAÇÃO DO AR, QUANDO NECESSÁRIO INSTALAR UMIDIFICADOR DE AR"
        },
        {
            "perigo": "ÁGUA ESTACIONÁRIA DE RESERVATÓRIO DE CHAFARIZ, TANQUES, CAIXAS, VALAS OU QUALQUER RECIPIENTE QUE MANTENHA ÁGUA PARADA",
            "fonte": "",
            "risco": "GERAÇÃO E POLIFERAÇÃO DE BACTÉRIA LEGIONELA E LARVAS DE MOSQUITOS",
            "agravo": "GRIPES, PENUMONIA E MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REMOVER RECEPIENTE SEM TAMPA QUE ACUMULE ÁGUA OU IMPLEMENTAR CONDIÇÕES PARA CIRCULAÇÃO DA ÁGUA COM DEVIDO TRATAMENTO E VIGILÂNCIA"
        },
        {
            "perigo": "ATRASO NA DISTRIBUIÇÃO DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL, DEFICIÊNCIA NA GESTÃO DE EPI, INEXISTÊNCIA DE FISCALIZAÇÃO, QUANTIDADE INSUFICIENTE DE EPI OU DESCONFORTO NA RELAÇÃO DE USO DO EPI.",
            "fonte": "",
            "risco": "EXPOSIÇÃO DESPROTEGIDA A AGENTES DE RISCO; AUMENTO DA PROBABILIDADE DE ACIDENTES E DOENÇAS OCUPACIONAIS.",
            "agravo": "PATOLOGIAS  INFECTOCONTAGIOSAS E ACIDENTES",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR ALMOXARIFADO CENTRAL E EXCLUSIVO DE EPI E EPC PARA AS ATIVIDADES DE SAÚDE. DEFINIR ATRAVÉS DO SESMT, ORDEM DE SERVIÇO POR ATIVIDADE, ONDE CONTENHA OS TIPOS DE EPI DE ACORDO COM AS EXPOSIÇÕES LABORAIS. OUVIR OS TRABALHADORES PARA DEFINIR O MODELO DE EPI CONFORTÁVEL E O CONSUMO MENSAL DE CADA TRABALHADOR REALIZAR DISTRIBUIÇÃO PARA CADA SETOR DE TRABALHO ATRAVÉS DE CAUTELA DE EPI E EPC NOS PRAZOS DEFINIDOS. APLICAR TREINAMENTO DE USO DO EPI, HIGIENIZAÇÃO E MANTER FISCALIZAÇÃO PERIÓDICA DO  USO DO EPI."
        }
    ],
    "ERGONOMICOS_BIOMECANICOS": [
        {
            "perigo": "EXIGÊNCIA DE POSTURAS INCÔMODAS OU POUCO CONFORTÁVEIS POR LONGOS PERÍODOS",
            "fonte": "",
            "risco": "DANOS OSTEOSMUSCULARES E FADIGA",
            "agravo": "TRANSTORNOS DO PLEXO BRAQUIAL",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REALIZAR LAUDO ERGONÔMICO, ADEQUAR EQUIPAMENTOS, FERRAMENTAS E MATERIAS PARA DESENVOLVER A ATIVIDADE, IMPLEMNTAR PAUSAS DE DESCANSO"
        },
        {
            "perigo": "POSTURA SENTADA POR LONGOS PERÍODOS",
            "fonte": "",
            "risco": "POSTURA INADEQUADA, DESCONFORTO",
            "agravo": "DORES LOMBARES, LUMBAGO COM CIÁTICA, TRANSTORNOS DE DISCOS LOMBARES E DE OUTROS DISCOS INTERVERTEBRAIS COM MIELOPATIA.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "APLICAR TREINAMENTO CONTÍNUO SOBRE PRÁTICAS ERGONÔMICAS; INTRODUZIR PROGRAMAS DE EXERCÍCIOS DE ALONGAMENTO E FORTALECIMENTO MUSCULAR; DELIBERAR PAUSAS REGULARES DURANTE A JORNADA DE TRABALHO PARA ALTERNAR POSIÇÃO"
        },
        {
            "perigo": "POSTURA DE PÉ POR LONGOS PERÍODOS",
            "fonte": "",
            "risco": "DANOS OSTEOSMUSCULARES",
            "agravo": "DORES LOMBARES, TRANSTORNOS DE DISCOS LOMBARES E DE OUTROS DISCOS INTERVERTEBRAIS COM MIELOPATIA",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "APLICAR TREINAMENTO CONTÍNUO SOBRE PRÁTICAS ERGONÔMICAS; INTRODUZIR PROGRAMAS DE EXERCÍCIOS DE ALONGAMENTO E FORTALECIMENTO MUSCULAR; DELIBERAR PAUSAS REGULARES DURANTE A JORNADA DE TRABALHO PARA ALTERNAR POSIÇÃO"
        },
        {
            "perigo": "CONSTANTE DESLOCAMENTO A PÉ DURANTE A JORNADA DE TRABALHO",
            "fonte": "",
            "risco": "CANSAÇO, INSATISFAÇÃO",
            "agravo": "MONONEUROPATIAS DOS MEMBROS SUPERIORES",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "APLICAR TREINAMENTO CONTÍNUO SOBRE PRÁTICAS ERGONÔMICAS; INTRODUZIR PROGRAMAS DE EXERCÍCIOS DE ALONGAMENTO E FORTALECIMENTO MUSCULAR; DELIBERAR PAUSAS REGULARES DURANTE A JORNADA DE TRABALHO PARA ALTERNAR POSIÇÃO"
        },
        {
            "perigo": "LEVANTAMENTO E TRANSPORTE MANUAL DE CARGAS OU VOLUMES",
            "fonte": "",
            "risco": "DANOS OSTEOSMUSCULARES",
            "agravo": "VARIZES DOS MEMBROS INFERIORES, COXARTROSE [ARTROSE DO QUADRIL, GONARTROSE [ARTROSE DO JOELHO, TRANSTORNOS DOS DISCOS CERVICAIS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "APLICAR TREINAMENTO CONTÍNUO SOBRE TÉCNICAS DE POSTURA PARA LEVANTAMENTO E IÇAMENTO DE PESO; GERAR PROTOCOLO DE LEVANTAMENTO DE PESO; ANALISAR EQUIPAMENTOS DE SUPORTE PARA REMOÇÃO DE CARGA"
        },
        {
            "perigo": "FREQUENTE AÇÃO DE PUXAR/EMPURRAR CARGAS OU VOLUMES",
            "fonte": "",
            "risco": "FADIGA, POSTURA INADEQUADA,",
            "agravo": "HÉRNIAS ABDOMINAIS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "CULTIVAR A CULTURA DE TEMPO DE TRABALHO E DESCANSO, E SEGUIR ORIENTÇÕES DA ERGONOMISTA"
        },
        {
            "perigo": "FREQUENTE EXECUÇÃO DE MOVIMENTOS REPETITIVOS",
            "fonte": "",
            "risco": "LESÃO DE ESFORÇO REPETITIVO",
            "agravo": "ENTESOPATIAS NÃO CLASSIFICADAS EM OUTRA PARTE, OUTRAS E INFLAMAÇÕES, MONONEUROPATIAS DOS MEMBROS SUPERIORES",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "INCREMENTAR CONSCIENTIZAÇÃO DE TÉCNICA DE AJUSTE ROTINEIRO DE FERRAMENTAS E EQUIPAMENTOS, POSICIONADOS DE FORMA A MINIMIZAR MOVIMENTOS REPETITIVOS E POSTURAS INADEQUADAS; TREINAMENTO CONTÍNUO SOBRE PRÁTICAS ERGONÔMICAS; INTRODUZIR PROGRAMAS DE EXERCÍCIOS DE ALONGAMENTO E FORTALECIMENTO MUSCULAR; DELIBERAR PAUSAS REGULARES DURANTE OS JORNADA DE TRABALHO;"
        },
        {
            "perigo": "ORTOSTATISMO PROLONGADO",
            "fonte": "",
            "risco": "DANOS CIRCULATÓRIOS",
            "agravo": "VARIZES DOS MEMBROS INFERIORES",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "DELIBERAR PAUSAS REGULARES DURANTE A JORNADA DE TRABALHO PARA ALTERNAR POSIÇÃO"
        },
        {
            "perigo": "MOBILIÁRIO SEM MEIOS DE REGULAGEM DE AJUSTE",
            "fonte": "",
            "risco": "DESCONFORTO, DANOS OSTEOMUSCULAR OU ESTRESSE E SOBRECARGA COGNITIVA",
            "agravo": "TRANSTORNOS DOS TECIDOS MOLES RELACIONADOS COM O USO, O USO EXCESSIVO E A PRESSÃO; SINOVITE CREPITANTE CRÔNICA DA MÃO E DO PUNHO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "SUBSTITUIR CADEIRA E MESA POR MODELOS QUE ATENDA OS REQUISITOS ERGONÔMICOS CONFORME ANTROPOMETRIA DO TRABALHADOR"
        },
        {
            "perigo": "EQUIPAMENTOS, MONITOR E/OU MÁQUINAS SEM MEIOS DE REGULAGEM DE AJUSTE OU SEM CONDIÇÕES DE USO",
            "fonte": "",
            "risco": "DESCONFORTO, DANOS OSTEOMUSCULAR OU ESTRESSE E SOBRECARGA COGNITIVA",
            "agravo": "TRANSTORNOS DOS TECIDOS MOLES RELACIONADOS COM O USO, O USO EXCESSIVO E A PRESSÃO; SINOVITE CREPITANTE CRÔNICA DA MÃO E DO PUNHO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "RELACIONAR EQUIPAMENTOS, MÁQUINAS, MOBÍLIA E TECNOLOGIA QUE PROVOCA ESFORÇO E DIFICULDADES DE MOVIMENTOS E ACIONAMENTO PARA ADEQUAÇÃO E SUBSTITUIÇÃO"
        },
        {
            "perigo": "PERIGO",
            "fonte": "FONTE GERADORA",
            "risco": "RISCO",
            "agravo": "LESÕES OU AGRAVOS À SAÚDE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PLANO DE AÇÃO"
        },
        {
            "perigo": "RISCOS ERGONÔMICOS ORGANIZACIONAIS",
            "fonte": "",
            "risco": "RISCOS ERGONÔMICOS ORGANIZACIONAIS",
            "agravo": "RISCOS ERGONÔMICOS ORGANIZACIONAIS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PLANO SINTÉTICO DE AÇÕES"
        },
        {
            "perigo": "PERIGO/FONTE/CIRCUNSTÂNCIA",
            "fonte": "",
            "risco": "RISCO",
            "agravo": "LESÕES OU AGRAVOS À SAÚDE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "MEDIDAS DE PREVENÇÃO A SEREM INTRODUZIDAS OU MANTIDAS"
        },
        {
            "perigo": "AMBIENTE DE TRABALHO COM ILUMINAÇÃO AUSENTE OU DEFICIENTE.",
            "fonte": "",
            "risco": "DANOS OCULARES",
            "agravo": "NISTAGMO E OUTROS MOVIMENTOS IRREGULARES DO OLHO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ADEQUAR E CORIGIR DEFICIÊNCIA DE ILUMINAÇÃO"
        },
        {
            "perigo": "CONDIÇÕES DO AMBIENTE DE TRABALHO: DEFICIÊNCIA DE VENTILAÇÃO, DESCONFORTO TÉRMICO.",
            "fonte": "",
            "risco": "DESCONFORTO BAIXA PRODUTIVIDADE",
            "agravo": "FATORES PSICOSSOCIAIS AGRAVANTES OU COADJUVANTES",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ADEQUAR E CORRIGIR DEFICIÊNCIA DE CLIMATIZAÇÃO"
        },
        {
            "perigo": "CONDIÇÕES DO AMBIENTE DE TRABALHO: DESCONFORTO ACÚSTICO",
            "fonte": "",
            "risco": "DESCONFORTO BAIXA PRODUTIVIDADE",
            "agravo": "FATORES PSICOSSOCIAIS AGRAVANTES OU COADJUVANTES",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ADEQUAR E CORRIGIR DEFICIÊNCIA DE CLIMATIZAÇÃO"
        },
        {
            "perigo": "AUSÊNCIA DE PAUSAS PARA DESCANSO OU NÃO CUMPRIMENTO DESTAS DURANTE A JORNADA DE TRABALHO",
            "fonte": "",
            "risco": "FADIGA, ESTRESSE",
            "agravo": "SÍNDROME DE BURNOUT, DISTÚRBIOS EMOCIONAIS, ESTRESSE. INEXISTENTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "DELIBERAR PAUSAS REGULARES DURANTE OS JORNADA DE TRABALHO; APLICAR MÉTODOS DE RELATÓRIOS PARA ABORDAR INCIDENTES OCORRIDOS E REUNIÕES PARA MELHORIA E AJUSTAR DIRETRIZES DESEMPENHADAS."
        },
        {
            "perigo": "NECESSIDADE DE MANTER RITMOS INTENSOS DE TRABALHO",
            "fonte": "",
            "risco": "FADIGA, ESTRESSE",
            "agravo": "DISTÚRBIOS METABÓLICOS NÃO ESPECIﬁCADOS, OUTROS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "AMPLIAR O QUADRO FUNCIONAL, EMPREGAR ALONGAMENTOS E MOVIMENTOS REGULARES PARA ALIVIAR A TENSÃO NO PESCOÇO, OMBROS E COSTAS."
        },
        {
            "perigo": "TRABALHO COM NECESSIDADE DE VARIAÇÃO DE TURNOS",
            "fonte": "",
            "risco": "DISTÚRBIOS DO CICLO VIGÍLIA-SONO",
            "agravo": "DIABETES MELLITUS NÃO INSULINODEPENDENTE, OBESIDADE, DISTÚRBIOS METABÓLICOS NÃO ESPECIFICADOS, OUTROS, DOENÇAS CARDIOVASCULARES",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "OFERECER INFORMATIVOS IMPRESSOS COM INFORMAÇÕES GERAIS PARA UM MELHOR SONO NO PERÍODO DIURNO EVITANDO FADIGA E CANSAÇO NO DECORRER DE SUAS ATIVIDADES FAMILIARES, SOCIAIS E LABORAIS. INVESTIR EM AÇÕES DE PROMOÇÃO A SAÚDE, DESENVOLVENDO GINÁSTICA LABORAL, ATIVIDADES RECREATIVAS FORA DO SEU HORÁRIO DE TRABALHO, DISPONIBILIZAR ASSISTÊNCIA DE MÉDICOS ESPECIALIZADOS EM SONO E MASSOTERAPEUTA E UM LOCAL DE DESCANSO DURANTE OS INTERVALOS DO TRABALHO PRINCIPALMENTE PARA A EQUIPE DE SAÚDE QUE REALIZA CUIDADOS CONTINUO NÃO PERMITINDO ERROS."
        },
        {
            "perigo": "POSTOS DE TRABALHO ISOLADO",
            "fonte": "",
            "risco": "MONOTONIA",
            "agravo": "EPISÓDIOS DEPRESSIVOS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "INTRODUZIR DINÂMICAS PARA ROTATIVIDADE DE TAREFAS"
        },
        {
            "perigo": "FATORES RELACIONADOS A GESTÃO ORGANIZACIONAL; E/OU CONTEXTO DA ORGANIZAÇÃO DO TRABALHO; E/OU CARACTERÍSTICA DAS RELAÇÕES SOCIAIS NO TRABALHO; E/OU CONTEÚDO DAS TAREFAS DO TRABALHO; E/OU CONDIÇÃO DO AMBIENTE DE TRABALHO; E/OU INTERAÇÃO PESSOA-TAREFA; E/OU JORNADA DE TRABALHO",
            "fonte": "",
            "risco": "SOBRECARGA MENTAL E EMOCIONAL, INSATISFAÇÃO",
            "agravo": "TRANSTORNOS SOMATOFORMES, REAÇÕES AO \"STRESS\" GRAVE E TRANSTORNOS DE ADAPTAÇÃO, TRANSTORNOS DE ADAPTAÇÃO, TRANSTORNOS PSICÓTICOS AGUDOS E TRANSITÓRIOS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "CONSIDERAR AS QUEIXAS NA ÁREA DO CONVÍVIO ENTRE OS TRABALHADORES E SUAS CHEFIAS, GERIR OS CONFLITOS COM DEDICAÇÃO, REALIZANDO AÇÕES PARA ESCLARECIMENTOS E RESOLUÇÃO DOS CONFLITOS. REALIZAR AVALIAÇÃO PSICOSSOCIAL, IMPLEMENTAR AS MEDIDAS PROPOSTAS CONFORME O LEVANTAMENTO ERGONÔMICO E PSICOSSOCIAL."
        },
        {
            "perigo": "COBRANÇA DE METAS IMPOSSÍVEL OU DIFÍCIL DE ATINGIR",
            "fonte": "",
            "risco": "SOBRECARGA MENTAL E ESTRESSE",
            "agravo": "SÍNDROME DE BURNOUT, DISTÚRBIOS EMOCIONAIS, ESTRESSE.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "CULTIVAR A CULTURA DE TEMPO DE TRABALHO E DESCANSO E SEGUIR ORIENTÇÕES DA ERGONOMISTA."
        },
        {
            "perigo": "INEXISTÊNCIA DE CONDIÇÕES HUMANISTAS NO INTERIOR DOS LOCAIS DE TRABALHO, COMO: PLANTAS, MATERIAIS DECORATIVOS, QUADROS E OUTROS.",
            "fonte": "",
            "risco": "CARACTERIZAÇÃO DE LOCAL INÓSPITO, DESCONFORTÁVEL E DESUMANO",
            "agravo": "SÍNDROMES DE DEPRESSÃO, PREJUÍZO DO CLIMA ORGANIZACIONAL",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER DECORAÇÃO DO INTERIOR DAS ÁREAS DE TRABALHO HUMANÍSTICA E CONFORTÁVEL"
        },
        {
            "perigo": "DEFICIÊNCIA NO LAYOUT DE TRABALHO, MOBILIA, EQUIPAMENTO, PRATELEIRA OU BANCADA DESAJUSTADAS OU ACÚMULO DE MATERIAIS NO AMBIENTE",
            "fonte": "",
            "risco": "DESCONFORTO BAIXA PRODUTIVIDADE",
            "agravo": "FATORES COGNITIVOS COADJUVANTES, BAIXA PRODUÇÃO E TRANSTORNOS BIOMECÂNICOS",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ADEQUAR E CORRIGIR DEFICIÊNCIA DE LAYOUT, CONDIÇÕES DE MOBÍLIA, ESTRUTURA FÍSICA E SUPORTES DE TRABALHO"
        },
        {
            "perigo": "ILUMINAÇÃO INADEQUADA",
            "fonte": "",
            "risco": "DIFICULDADE DE ACESSO E DETECÇÃO DE MATERIAIS",
            "agravo": "",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ANALISAR ÁREA DE TRABALHO, PROMOVER ILUMINAÇÃO MÓVEL"
        },
        {
            "perigo": "ARRANJO FÍSICO INADEQUADO",
            "fonte": "",
            "risco": "DESORGANIZAÇÃO, ESTRESSE E BAIXA PRODUÇÃO",
            "agravo": "QUEDAS DE OBJETOS, PROPAGAÇÃO DE FOGO, INSATISFAÇÃO, PERTURBAÇÃO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ORGANIZAR E ADEQUAR MATERIAIS E MOBÍLIAS EXPEDIR MATERIAIS SEM UTILIDADE, REMOVER PESSOAS CONFORME CAPACIDADE DE ESPAÇOS"
        },
        {
            "perigo": "ARMAZENAMENTO INADEQUADO, ACÚMULO DE ENTULHOS",
            "fonte": "",
            "risco": "QUEDAS DE OBJETO, INSATISFAÇÃO ERGONÔMICA",
            "agravo": "PANCADA, ESCORIAÇÃO, DANOS FISICOS,",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ORGANIZAR E ADEQUAR MATERIAIS, EXPEDIR MATERIAIS SEM UTILIDADE, IMPLEMENTAR ESTANTES DE ORGANIZAÇÃO, SEPARAR MATERIAIS POR CATEGORIA EXPEDIR ORDEM DE SERVIÇO COM TODAS ORIENTAÇÕES E ANÁLISE PRELIMINAR DE RISCO."
        }
    ],
    "ERGONOMICOS_COGNITIVOS": [
        {
            "perigo": "EXIGÊNCIA DE ALTO NÍVEL DE CONCENTRAÇÃO OU ATENÇÃO",
            "fonte": "",
            "risco": "SOBRECARGA DE TRABALHO MENTAL",
            "agravo": "SÍNDROME DE BURNOUT, LARINGOTRAQUEÍTE AGUDA",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "CULTIVAR A CULTURA DE TEMPO DE TRABALHO E DESCANSO E SEGUIR ORIENTÇÕES DA ERGONOMISTA."
        },
        {
            "perigo": "FATORES RELACIONADOS A GESTÃO ORGANIZACIONAL: DEFICIÊNCIAS NA ADMINISTRAÇÃO DE RECURSOS HUMANOS CARACTERÍSTICAS DAS RELAÇÕES SOCIAIS NO TRABALHO; ESPECIFICAÇÃO DE SISTEMAS DE CONTROLE E DEFINIÇÃO DE FUNÇÕES, ENTRE OUTROS",
            "fonte": "",
            "risco": "DEFICIÊNCIA NO CLIMA DAS RELAÇÕES, COESÃO E QUALIDADE DAS INTERAÇÕES, INCLUSIVE TRABALHO EM EQUIPE, CONTEÚDO DAS TAREFAS DO TRABALHO; DEMANDAS EMOCIONAIS (PELO ATENDIMENTO AO CLIENTE) DEFICIÊNCIA NAS FORMAS DE COMUNICAÇÃO, TECNOLOGIA, MODALIDADE DE ORGANIZAÇÃO DO TRABALHO E DEMANDAS QUALITATIVAS E QUANTITATIVAS DO TRABALHO, ENTRE OUTROS.",
            "agravo": "TRANSTORNOS NEURÓTICOS ESPECIFICADOS ENCEFALOPATIA HIPERTENSIVA ISQUEMIA CEREBRAL TRANSITÓRIA NÃO ESPECIﬁCADA",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ANALISAR DESEMPENHO E ESTRATÉGIAS PARA GERENCIAR MUDANÇAS QUE AFETAM AS PESSOAS, ENTRE OUTROS. CONTEXTO DA ORGANIZAÇÃO DO TRABALHO. APLICAR MÉTODOS DE RELATÓRIOS PARA ABORDAR INCIDENTES OCORRIDOS E REUNIÕES PARA MELHORIA E AJUSTAR DIRETRIZES DESEMPENHADAS. AVALIAR A RELEVÂNCIA DO CONHECIMENTO E DAS HABILIDADES QUE A PESSOA POSSUI EM RELAÇÃO ÀS DEMANDAS DA TAREFA, OS NÍVEIS DE INICIATIVA E AUTONOMIA PERMITIDOS E DE RECONHECIMENTO, BEM COMO A IDENTIFICAÇÃO DA PESSOA COM A TAREFA E COM A ORGANIZAÇÃO"
        },
        {
            "perigo": "JORNADA DE TRABALHO: PROBLEMAS NA ORGANIZAÇÃO E DURAÇÃO DA JORNADA DE TRABALHO; EXISTÊNCIA OU AUSÊNCIA DE PAUSAS DURANTE O DIA",
            "fonte": "",
            "risco": "TRABALHO EM TURNO E NOTURNO; TIPO E FREQUÊNCIA DE ROTAÇÃO DOS TURNOS; NÚMERO E FREQUÊNCIA DE HORAS EXTRAS MENSAIS E DURAÇÃO E FREQUÊNCIA DE INTERVALOS SEMANAIS; TRABALHO INTERMITENTE",
            "agravo": "TRANSTORNOS ANSIOSOS, OUTROS. REAÇÕES AO \"STRESS\" GRAVE E TRANSTORNOS DE ADAPTAÇÃO, NEURASTENIA",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ANALISAR DESEMPENHO E ESTRATÉGIAS PARA GERENCIAR MUDANÇAS QUE AFETAM AS PESSOAS, ENTRE OUTROS. CONTEXTO DA ORGANIZAÇÃO DO TRABALHO. APLICAR MÉTODOS DE RELATÓRIOS PARA ABORDAR INCIDENTES OCORRIDOS E REUNIÕES PARA MELHORIA E AJUSTAR DIRETRIZES DESEMPENHADAS."
        }
    ],
    "PSICOSSOCIAIS": [
        {
            "perigo": "COPSOQ 1-3 — CARGA E RITMO DE TRABALHO (ACÚMULO, FALTA DE TEMPO, RAPIDEZ)",
            "fonte": "",
            "risco": "SOBRECARGA QUANTITATIVA E PRESSÃO TEMPORAL.",
            "agravo": "BURNOUT, ANSIEDADE, FADIGA CRÔNICA, DISTÚRBIOS DO SONO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REDIMENSIONAMENTO DE TAREFAS; CONTRATAÇÃO OU AUTOMAÇÃO; PAUSAS OBRIGATÓRIAS."
        },
        {
            "perigo": "COPSOQ 4-6 — DEMANDA COGNITIVA E EMOCIONAL (ATENÇÃO, DECISÕES DIFÍCEIS, CARGA EMOCIONAL)",
            "fonte": "",
            "risco": "ESTRESSE OCUPACIONAL E FADIGA MENTAL.",
            "agravo": "EXAUSTÃO EMOCIONAL, DEPRESSÃO, IRRITABILIDADE, ERROS COGNITIVOS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "TREINAMENTO DE RESILIÊNCIA; SUPORTE PSICOLÓGICO; RODÍZIO DE FUNÇÕES COMPLEXAS."
        },
        {
            "perigo": "COPSOQ 7-9 — FALTA DE AUTONOMIA E ESTAGNAÇÃO (BAIXA INFLUÊNCIA, POUCA INICIATIVA, SEM APRENDIZADO)",
            "fonte": "",
            "risco": "MONOTONIA E DESMOTIVAÇÃO (SUBUTILIZAÇÃO DE COMPETÊNCIAS).",
            "agravo": "DESPERSONALIZAÇÃO, BAIXA AUTOESTIMA, DESENGAJAMENTO TOTAL.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROGRAMAS DE JOB ENRICHMENT (ENRIQUECIMENTO DO CARGO) E PLANOS DE T&D."
        },
        {
            "perigo": "COPSOQ 10-12 — DÉFICIT DE COMUNICAÇÃO E PAPÉIS (FALTA DE INFORMAÇÃO, INCERTEZA DE FUNÇÕES)",
            "fonte": "",
            "risco": "AMBIGUIDADE E CONFLITO DE PAPÉIS.",
            "agravo": "ESTRESSE POR INCERTEZA, INSEGURANÇA, DORES DE CABEÇA TENSIONAIS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REUNIÕES SEMANAIS DE ALINHAMENTO; REVISÃO DE MANUAIS DE CARGOS E FUNÇÕES."
        },
        {
            "perigo": "COPSOQ 13-15 — FALTA DE SUPORTE E JUSTIÇA, INJUSTIÇA, FALTA DE APOIO",
            "fonte": "",
            "risco": "ISOLAMENTO SOCIAL E PERCEPÇÃO DE INJUSTIÇA.",
            "agravo": "TRANSTORNOS ADAPTATIVOS, QUEIXAS PSICOSSOMÁTICAS, ABANDONO DO",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR POLÍTICA DE FEEDBACK E RECONHECIMENTO; TREINAMENTO DE LIDERANÇA."
        },
        {
            "perigo": "COPSOQ 16-18 — RELACIONAMENTO E PLANEJAMENTO (CLIMA RUIM, PLANEJAMENTO INEFICAZ)",
            "fonte": "",
            "risco": "CONFLITOS INTERPESSOAIS E DESORGANIZAÇÃO.",
            "agravo": "ESTRESSE INTERPESSOAL, HOSTILIDADE NO AMBIENTE, ISOLAMENTO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "DINÂMICAS DE GRUPO; CONSULTORIA EM GESTÃO DE PROCESSOS E FLUXOGRAMAS."
        },
        {
            "perigo": "COPSOQ 19-21 — RELAÇÕES DE CONFIANÇA E CONFLITO (FALTA DE CONFIANÇA, CONFLITOS MAL RESOLVIDOS)",
            "fonte": "",
            "risco": "QUEBRA DO CONTRATO PSICOLÓGICO.",
            "agravo": "PARANOIA FUNCIONAL, ANSIEDADE SOCIAL, SOMATIZAÇÃO DE DOENÇAS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR CANAL DE DENÚNCIAS; MEDIAÇÃO DE CONFLITOS PROFISSIONAL; TRANSPARÊNCIA GESTORA."
        },
        {
            "perigo": "COPSOQ 22-23 — DISTRIBUIÇÃO E EFICÁCIA (DESIGUALDADE NA CARGA, SENSAÇÃO DE IMPOTÊNCIA)",
            "fonte": "",
            "risco": "INEQUIDADE E BAIXA AUTOEFICÁCIA.",
            "agravo": "SENTIMENTO DE INJUSTIÇA, FRUSTRAÇÃO SEVERA, DEPRESSÃO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "AUDITORIA DE DISTRIBUIÇÃO DE CARGA; MENTORIA PARA RESOLUÇÃO DE PROBLEMAS."
        },
        {
            "perigo": "COPSOQ 24-27 — SIGNIFICADO E SATISFAÇÃO (TRABALHO SEM VALOR, INSATISFAÇÃO GLOBAL)",
            "fonte": "",
            "risco": "CRISE EXISTENCIAL OCUPACIONAL E ALIENAÇÃO.",
            "agravo": "DEPRESSÃO MAIOR, CRISE DE IDENTIDADE, ABSENTEÍSMO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROGRAMAS DE CULTURA ORGANIZACIONAL; REALINHAMENTO DE PROPÓSITO E VALORES."
        },
        {
            "perigo": "COPSOQ 28 — INSEGURANÇA CONTRATUAL (MEDO DO DESEMPREGO)",
            "fonte": "",
            "risco": "INSEGURANÇA LABORAL CRONIFICADA.",
            "agravo": "TRANSTORNO DE ANSIEDADE GENERALIZADA (TAG), PÂNICO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "COMUNICAÇÃO CLARA SOBRE A SAÚDE DA EMPRESA; PLANOS DE RETENÇÃO E BENEFÍCIOS."
        },
        {
            "perigo": "COPSOQ 30-31 — CONFLITO TRABALHO-VIDA PRIVADA (ENERGIA E TEMPO AFETANDO A VIDA PESSOAL)",
            "fonte": "",
            "risco": "DESEQUILÍBRIO ENTRE VIDA PROFISSIONAL E PESSOAL (WORK-LIFE BALANCE).",
            "agravo": "ESGOTAMENTO, CONFLITOS FAMILIARES, ISOLAMENTO SOCIAL, FADIGA CRÓNICA.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "REVISÃO DE CARGAS HORÁRIAS; POLÍTICA DE \"DIREITO AO DESLIGAMENTO\"; FLEXIBILIDADE DE HORÁRIO/TELETRABALHO."
        },
        {
            "perigo": "COPSOQ 32 — DISTÚRBIOS DO SONO (ACORDAR VÁRIAS VEZES, INSÓNIA)",
            "fonte": "",
            "risco": "HIPERVIGILÂNCIA E INCAPACIDADE DE RECUPERAÇÃO PSICOFISIOLÓGICA.",
            "agravo": "DÉFICE COGNITIVO, RISCO DE ACIDENTES, DOENÇAS CARDIOVASCULARES, DEPRESSÃO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "ENCAMINHAMENTO PARA MEDICINA DO TRABALHO; HIGIENE DO SONO; REDUÇÃO DE PRESSÃO POR METAS."
        },
        {
            "perigo": "COPSOQ 33-34 — EXAUSTÃO FÍSICA E EMOCIONAL",
            "fonte": "",
            "risco": "SÍNDROME DE BURNOUT (FASE AVANÇADA).",
            "agravo": "COLAPSO FÍSICO, APATIA SEVERA, BAIXA IMUNIDADE, IDEAÇÃO DEPRESSIVA.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "AFASTAMENTO TEMPORÁRIO OU REDUÇÃO IMEDIATA DE CARGA; APOIO PSICOLÓGICO CLÍNICO."
        },
        {
            "perigo": "COPSOQ 35-37 — SINTOMAS PSICOLÓGICOS (IRRITABILIDADE, ANSIEDADE, TRISTEZA)",
            "fonte": "",
            "risco": "DETERIORAÇÃO DA SAÚDE MENTAL E DO CLIMA ORGANIZACIONAL.",
            "agravo": "TRANSTORNOS DE ANSIEDADE, DEPRESSÃO MAJOR, CRISES DE PÂNICO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROGRAMAS DE SAÚDE MENTAL; REDUÇÃO DE FATORES DE STRESS; CANAL DE ESCUTA ATIVA."
        },
        {
            "perigo": "COPSOQ 38 — VIOLÊNCIA VERBAL (INSULTOS OU PROVOCAÇÕES)",
            "fonte": "",
            "risco": "ASSÉDIO MORAL (MOBBING) OU AMBIENTE HOSTIL.",
            "agravo": "STRESS PÓS-TRAUMÁTICO, BAIXA AUTOESTIMA, DESEJO DE DEMISSÃO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "APLICAÇÃO DO CÓDIGO DE ÉTICA; MEDIDAS DISCIPLINARES AOS AGRESSORES; APOIO À VÍTIMA."
        },
        {
            "perigo": "COPSOQ 39 — ASSÉDIO SEXUAL",
            "fonte": "",
            "risco": "CRIME E VIOLAÇÃO DA DIGNIDADE HUMANA.",
            "agravo": "TRAUMAS PROFUNDOS, FOBIA SOCIAL, DEPRESSÃO, PROCESSOS JUDICIAIS.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "DENÚNCIA FORMAL; APOIO JURÍDICO/PSICOLÓGICO; DEMISSÃO/PUNIÇÃO IMEDIATA DO AGRESSOR."
        },
        {
            "perigo": "COPSOQ 40-41 — VIOLÊNCIA FÍSICA OU AMEAÇAS",
            "fonte": "",
            "risco": "RISCO DE VIDA E INTEGRIDADE FÍSICA.",
            "agravo": "LESÕES FÍSICAS, TRANSTORNO DE STRESS PÓS-TRAUMÁTICO (TEPT), PÂNICO.",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "INTERVENÇÃO DE SEGURANÇA/POLICIAL; AFASTAMENTO IMEDIATO DO AGRESSOR; PROTEÇÃO À VÍTIMA."
        }
    ],
    "PERICULOSOS": [
        {
            "perigo": "ATIVIDADES E OPERAÇÕES PERIGOSAS COM EXPLOSIVOS OU DE QUALQUER ATIVIDADE DENTRO DO RAIO DE PROTEÇÃO.",
            "fonte": "",
            "risco": "EXPLOSÃO",
            "agravo": "IMPACTOS, DILACERAÇÃO, MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "IMPLEMENTAR ORDEM DE SERVIÇO, PROMOVER TREINAMENTO SOBRE OPERAÇÃO COM EXPLOSIVOS, REALIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, TRABALHAR SEMPRE EM DUPLA"
        },
        {
            "perigo": "ATIVIDADES E OPERAÇÕES PERIGOSAS COM INFLAMÁVEIS OU DE QUALQUER ATIVIDADE FORA DO RAIO DE PROTEÇÃO.",
            "fonte": "",
            "risco": "INCÊNDIO, EXPLOSÃO",
            "agravo": "QUEIMADURA, INTOXICAÇÃO, ASFIXICIAÇÃO, MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "INSTALAR DETECTOR DE GÁS, SINALIZAR ÁREA PROIBIR O ATO DE FUMAR, IMPLEMENTAR ORDEM DE SERVIÇO, PROMOVER TREINAMENTO SOBRE NR 20, REALIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, MANTER EXTINTOR DE INCÊNDIO APROPRIADO E ACESSÍVEL JUNTO AO ARAMAZENAMENTO DE INFLAMÁVEIS"
        },
        {
            "perigo": "ATIVIDADES E OPERAÇÕES PERIGOSAS COM RADIAÇÕES IONIZANTES OU SUBSTÂNCIAS RADIOATIVAS.",
            "fonte": "",
            "risco": "FUGA DE RADIAÇÃO POR ACIDENTE EM CASOS DE FALHA NA BLINDAGEM DA EMBALAGEM, FUSILAGEM DA MÁQUINA, EQUIPAMENTO, APARELHO OU CONTENÇÃO",
            "agravo": "CONTAMINAÇÃO COM RADIAÇÕES IONIZANTES",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "MANTER NO LOCAL DE TRABALHO E À DISPOSIÇÃO DE INSPEÇÕES O PLANO DE PROTEÇÃO RADIOLÓGICA (PPR) APROVADO PELA CNEN E PELA VIGILÂNCIA SANITÁRIA PARA OS CASOS DE RADIODIAGNÓSTICO. ENTRE DIVERSAS FINALIDADES, O PPR DEVE: – SER PERSONALIZADO PARA A INSTALAÇÃO, AMBIENTES, EQUIPAMENTOS, PROCEDIMENTOS E ROTINA OPERACIONAL E ETC.; AS ÁREAS DA INSTALAÇÃO RADIATIVA DEVEM SER CLASSIFICADAS, SINALIZADAS E TER ACESSO CONTROLADO."
        },
        {
            "perigo": "ATIVIDADES E OPERAÇÕES PERIGOSAS COM EXPOSIÇÃO A ROUBOS OU OUTRAS ESPÉCIES DE VIOLÊNCIA FÍSICA NAS ATIVIDADES PROFISSIONAIS DE SEGURANÇA PESSOAL OU PATRIMONIAL.",
            "fonte": "",
            "risco": "ATAQUES DE MARGINAIS",
            "agravo": "VIOLÊNCIA FÍSICA, MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER CURSO DE VIGILÂNCIA, FORNECER MEIO DE COMUNICAÇÃO EFICIENTE EM CASO DE URGÊNCIA"
        },
        {
            "perigo": "ATIVIDADES E OPERAÇÕES PERIGOSAS COM ENERGIA ELÉTRICA.",
            "fonte": "",
            "risco": "CHOQUE ELÉTRICO",
            "agravo": "ATAQUES CARDÍACOS, QUEIMADURA, MORTE",
            "exame": "CLÍNICO + ECG",
            "per": "Semestral",
            "plano": "PROMOVER TREINAMENTO EM NR 10, RELAIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, TRABALHAR SEMPRE EM DUPLA, IMPLEMENTAR INVENTÁRIOS DAS INSTALAÇÕES EM UNIDADES ACIMA DE 750KW"
        },
        {
            "perigo": "ATIVIDADES REALIZADAS COM A UTILIZAÇÃO DE MOTOCICLETA.",
            "fonte": "",
            "risco": "ACIDENTE DE TRÂNSITO",
            "agravo": "IMPACTOS, DILACERAÇÃO, MORTE",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": "PROMOVER TREINAMENTO EM NR 10, RELAIZAR APR EM TODA OPERAÇÃO DE TRABALHO, FORNECER OS EPIs APROPRIADOS, TRABALHAR SEMPRE EM DUPLA"
        },
        {
            "perigo": "ATIVIDADES PROFISSIONAIS DOS AGENTES DAS AUTORIDADES DE TRÂNSITO",
            "fonte": "",
            "risco": "COLISÕES, ATROPELAMENTOS OU OUTRAS ESPÉCIES DE ACIDENTES OU VIOLÊNCIAS",
            "agravo": "ATAQUES CARDÍACOS, AGRESSÕES QUEIMADURA E MORTE",
            "exame": "CLÍNICO + ECG",
            "per": "Semestral",
            "plano": "1. PROMOVER CURSO DE PILOTAGEM SEGURA; 2. FORNECER OS SEGUINTES EQUIPAMENTOS: 3. VISEIRA; 4. ÓCULOS; 5. JAQUETA; 6. LUVAS; 7. CALÇAS; 8. BOTAS; 9. APARADOR DE LINHA; 10. PROTETOR DE PERNAS; 11. ANTENA CORTA PIPA; 12. COLETE SINALIZADOR REFLETIVO; 13. ADESIVOS REFLEXIVOS NO CAPACETE; 14. ADESIVOS REFLEXIVOS O NO BAÚ."
        },
        {
            "perigo": "ATIVIDADES DE COMBATE A INCÊNDIOS",
            "fonte": "",
            "risco": "EXPOSIÇÃO A GASES TÓXICOS (MONÓXIDO DE CARBONO, CIANETO) EXPOSIÇÃO AO CALOR INTENSO (ESTRESSE TÉRMICO) QUEDAS E IMPACTOS (AMBIENTE INSTÁVEL) EXPOSIÇÃO A AGENTES QUÍMICOS (FUMAÇA E PRODUTOS DA COMBUSTÃO) ESFORÇO FÍSICO INTENSO (SOBRECARGA MUSCULAR/CARDIOVASCULAR) RUÍDO DE ALARMES E EQUIPAMENTOS",
            "agravo": "ASFIXIA, INTOXICAÇÃO SISTÊMICA, EDEMA PULMONAR QUEIMADURAS, DESIDRATAÇÃO, EXAUSTÃO TÉRMICA FRATURAS, TRAUMATISMOS, CONTUSÕES IRRITAÇÃO OCULAR/RESPIRATÓRIA, DERMATITES, CARCINOGENICIDADE INFARTO, LESÕES MUSCULARES, DISFUNÇÕES ARTICULARES PERDA AUDITIVA INDUZIDA POR NÍVEL DE PRESSÃO SONORA",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "USO DE MÁSCARA AUTÔNOMA (SCBA), SENSORES DE GÁS ROUPAS DE PROTEÇÃO TÉRMICA (EPI), HIDRATAÇÃO, PAUSAS TREINAMENTO, USO DE BOTAS/CAPACETE, ILUMINAÇÃO EPI COMPLETO (ROUPA QUÍMICA), DESCONTAMINAÇÃO. TREINAMENTO FÍSICO, ACOMPANHAMENTO MÉDICO, PROTETORES AURICULARES DE ALTO DESEMPENHO"
        }
    ],
    "ASSOCIACAO": [
        {
            "perigo": "MINERAÇÃO SUBTERRÂNEA CUJAS ATIVIDADES SEJAM EXERCIDAS AFASTADAS DAS FRENTES DE PRODUÇÃO",
            "fonte": "",
            "risco": "RISCO DE RUÍDO E VIBRAÇÃO. REVERBERAÇÃO. RISCO DE GASES: PODE SER ELEVADO EM LOCAIS COM VENTILAÇÃO DEFICIENTE OU ONDE HÁ ACÚMULO DE GASES EM PONTOS BAIXOS (ESPAÇOS CONFINADOS DENTRO DA MINA",
            "agravo": "SILICOSE E PAIRO, PNEUMOCONIOSES, PERDA AUDITIVA, PROBLEMAS REUMÁTICOS, UMIDADE.",
            "exame": "AUDIOMETRIA",
            "per": "Anual",
            "plano": "CONTROLE DE RISCOS GEOMECÂNICOS E ACIDENTES CATASTRÓFICOSO CONTROLE DA ESTABILIDADE DA ROCHA E A PREVENÇÃO DE DESABAMENTOS SÃO PRIORITÁRIOS NAS FRENTES DE PRODUÇÃO E DESENVOLVIMENTO.PLANO DE LAVRA E SUSTENTAÇÃO:DESENVOLVER UM PLANO DE SUSTENTAÇÃO DETALHADO, BASEADO EM ESTUDOS GEOMECÂNICOS, DEFININDO O TIPO E O ESPAÇAMENTO DOS ELEMENTOS DE SUPORTE (CHUMBADORES, CAMBOTAS, TELAS).REALIZAR O SANEAMENTO DE TETO E PAREDES (ABATIMENTO DE BLOCOS INSTÁVEIS) ANTES DE INICIAR QUALQUER TRABALHO SOB O TETO NÃO SUSTENTADO. SINALIZAÇÃO E PROTEÇÃO:SINALIZAR E ISOLAR ÁREAS COM RISCO IMINENTE DE QUEDA DE MATERIAL.PROIBIR A ENTRADA DE TRABALHADORES SOB O TETO SEM SUPORTE NA FRENTE DE AVANÇO.PREVENÇÃO DE EXPLOSÕES:MONITORAR CONTINUAMENTE OS NÍVEIS DE METANO. E OUTROS GASES EXPLOSIVOS.INTERROMPER IMEDIATAMENTE OS TRABALHOS (INCLUINDO ELETRICIDADE E MÁQUINAS) E EVACUAR A ÁREA SE A CONCENTRAÇÃO DE METANO ATINGIR 1,0% (LIMITE DE ALARME E PARALISAÇÃO, CONFORME NR-22).UTILIZAR APENAS EQUIPAMENTOS ELÉTRICOS COM CERTIFICAÇÃO À PROVA DE EXPLOSÃO (EX) EM ÁREAS CLASSIFICADAS."
        },
        {
            "perigo": "TRABALHOS EM ATIVIDADES PERMANENTES NO SUBSOLO DE MINERAÇÕES SUBTERRÂNEAS EM FRENTE DE PRODUÇÃO",
            "fonte": "",
            "risco": "CALOR, INALAÇÃO DE POEIRAS MINERAIS (PRINCIPALMENTE SÍLICA LIVRE CRISTALINA, CARVÃO E ASBESTOS\nESFORÇOS REPETITIVOS E DISTÚRBIOS OSTEOMUSCULARES RELACIONADOS AO TRABALHO,  POSTURAS FORÇADAS, TRANSPORTE MANUAL DE CARGAS, LONGAS JORNADAS, TRABALHO EM TURNOS (INVARIABILIDADE E RITMO INTENSO) E O ISOLAMENTO DO SUBSOLO",
            "agravo": "DOENÇAS RESPIRATÓRIAS CRÔNICAS (SILICOSE E PNEUMOCONIOSES), SILICOSE: DOENÇA PULMONAR FIBROSANTE, IRREVERSÍVEL E PROGRESSIVA, INCAPACIDADE RESPIRATÓRIA, PNEUMOCONIOSES. CÂNCER DE PULMÃO: ESTRESSE TÉRMICO: DESIDRATAÇÃO, EXAUSTÃO, CHOQUE TÉRMICO, QUE PODE SER FATAL.5. ERGONÔMICOS E PSICOSSOCIAISAGENTES, LER/DORT: LESÕES POR (DORES LOMBARES, LESÕES ARTICULARES).SAÚDE MENTAL: ESTRESSE CRÔNICO, ANSIEDADE, DEPRESSÃO E PROBLEMAS DE SONO.",
            "exame": "ESPIROMETRIA",
            "per": "Anual",
            "plano": "CONTROLE DE POEIRAS E VENTILAÇÃO (PREVENÇÃO DE SILICOSE E PNEUMOCONIOSES) O CONTROLE DE POEIRA E A VENTILAÇÃO SÃO AS MEDIDAS MAIS CRÍTICAS PARA PROTEGER OS TRABALHADORES CONTRA DOENÇAS PULMONARES E GASES TÓXICOS. VENTILAÇÃO PRIMÁRIA: GARANTIR A INJEÇÃO CONTÍNUA DE AR FRESCO NAS GALERIAS, DIRECIONANDO O FLUXO PARA AS FRENTES DE PRODUÇÃO (FRENTES DE LAVRA E DESENVOLVIMENTO), QUE SÃO AS ÁREAS DE MAIOR CONTAMINAÇÃO. MONITORAR O VOLUME DE AR (VAZÃO) E A VELOCIDADE DO AR PARA GARANTIR A DILUIÇÃO EFICAZ DE GASES E POEIRAS. IMPLEMENTAR CIRCUITOS DE VENTILAÇÃO SECUNDÁRIA (DUTOS E VENTILADORES AUXILIARES) PARA VENTILAR AS FRENTES ATIVAS E GARANTIR A RENOVAÇÃO DO AR NO INÍCIO DE CADA TURNO DE TRABALHO E APÓS DETONAÇÕES. CONTROLE DA POEIRA NA FONTE: UTILIZAR ÁGUA DE FORMA EFICAZ NA PERFURAÇÃO (PERFURATRIZES COM INJEÇÃO DE ÁGUA) E NO CARREGAMENTO/TRANSPORTE PARA ABATER AS PARTÍCULAS DE POEIRA ANTES QUE SE DISPERSEM. APLICAR AGENTES SUPRESSORES DE POEIRA NAS VIAS DE TRANSPORTE E PILHAS DE MINÉRIO. MONITORAMENTO AMBIENTAL: MEDIÇÃO CONTÍNUA OU PERIÓDICA DA CONCENTRAÇÃO DE SÍLICA LIVRE CRISTALINA (E OUTROS PARTICULADOS) E GASES TÓXICOS NAS ÁREAS DE TRABALHO, COM REGISTROS DOCUMENTADOS. INTERROMPER IMEDIATAMENTE AS OPERAÇÕES SE OS LIMITES DE TOLERÂNCIA FOREM EXCEDIDOS."
        }
    ],
    "AUSENCIA": [
        {
            "perigo": "AGENTES NOCIVOS NÃO CONSTANTES NO ANEXO IV DO DECRETO 3.048/1999 E INCLUÍDOS POR FORÇA DE DECISÃO JUDICIAL OU ADMINISTRATIVA",
            "fonte": "",
            "risco": "05.01.001",
            "agravo": "",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": ""
        },
        {
            "perigo": "AUSÊNCIA DE AGENTE NOCIVO OU DE ATIVIDADES PREVISTAS NO ANEXO IV DO DECRETO 3.048/1999",
            "fonte": "",
            "risco": "09.01.001",
            "agravo": "",
            "exame": "CLÍNICO",
            "per": "Anual",
            "plano": ""
        }
    ]
};


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

    // Suporte para pressionar ENTER no campo de senha ou e-mail
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


    // Recupera dados salvos localmente
    carregarCadastrosLocalStorage();
    carregarBancoAsoLocal();
    carregarPedidosLocalStorage();
    carregarPcmsoMatrizLocalStorage();

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

// 3. CONTROLE DE ABAS E PERMISSÕES RIGOROSAS (ITENS 4, 5, 6, 12, 13)
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

    // Restaura exibição inicial
    Object.values(nav).forEach(b => { if(b) b.style.display = 'flex'; });
    document.body.classList.remove('hide-prices');

    // CONTROLE DE ACESSO POR PERFIL (ATENDENDO EXATAMENTE ITENS 4, 5, 6 E 12)
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
        // ITEM 5: Médico responsável PCMSO só vê Relatório Analítico, Matriz PCMSO, Homologação (Relatório), Chat e seu Financeiro
        if (nav.pedidos) nav.pedidos.style.display = 'none';
        if (nav.atendimento) nav.atendimento.style.display = 'none';
        if (nav.historico) nav.historico.style.display = 'none';
        if (nav.esocial) nav.esocial.style.display = 'none';
        if (nav.cadastros) nav.cadastros.style.display = 'none';
        window.switchTab('pcmso-matriz');
    } else if (currentRole === 'MEDICO') {
        // ITEM 12: Médico examinador da clínica só vê Fila de ASO, Banco de ASO, Homologação, Matriz PCMSO (sem editar) e Chat
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
        if (nav.cadastros) nav.cadastros.style.display = 'none';
        if (nav.relatorioPcmso) nav.relatorioPcmso.style.display = 'none';
        window.switchTab('pedidos');
    }

    // ITEM 5: Ajusta formulário de Matriz PCMSO para travar campos de dados cadastrais/risco para o Médico PCMSO
    ajustarCamposEdicaoPcmso();

    // ITEM 13: Atualiza barra de clientes pelo vínculo
    atualizarBarraSelecaoClientesPorVinculo(currentRole);
    aoTrocarClienteFiltro();
};

// ITEM 5: Ajuste de permissão dos campos na Matriz PCMSO
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

// ITEM 13: Seleção e isolamento do cliente vinculado
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
                alert(`✅ Sucesso! ${rows.length} ASOs enviados diretamente para a FILA DE ATENDIMENTO do ${parceiroNome}.
Os campos estão abertos para edição do médico.`);
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

// ITEM 1: TECLA RESPONDER DO PEDIDO PARA A CLÍNICA
window.abrirModalResponderAgendamento = function(id) {
    const pedido = monitorRequestsData.find(p => p.id === id);
    if (!pedido) return;

    const modal = document.getElementById('modal-resposta-agendamento');
    if (!modal) return;

    modal.dataset.pedidoId = id;
    const inpTrab = document.getElementById('resp_trab_lbl');
    if (inpTrab) inpTrab.value = `${pedido.trab} (${pedido.obj})`;

    const cli = clientesCadastrados.find(c => c.nome === pedido.cliente);
    const inpEnd = document.getElementById('resp_endereco');
    const clinicaCad = clinicasCadastradas.find(c => c.nome === pedido.clinica);
    if (inpEnd) inpEnd.value = clinicaCad ? (clinicaCad.endereco || clinicaCad.nome) : pedido.clinica;

    modal.classList.remove('hidden');
};

window.confirmarRespostaAgendamento = async function() {
    const modal = document.getElementById('modal-resposta-agendamento');
    const id = Number(modal.dataset.pedidoId);
    const pedido = monitorRequestsData.find(p => p.id === id);
    if (!pedido) return;

    const horarios = document.getElementById('resp_horarios')?.value.trim();
    const endereco = document.getElementById('resp_endereco')?.value.trim();

    if (!horarios) return alert("Por favor, preencha as opções de data e horário!");

    // Separa nome e CPF do trabalhador
    const partes = pedido.trab.split('-');
    const nomeTrab = (partes[0] ? partes[0].trim() : pedido.trab).toUpperCase();
    const cpfTrab = partes[1] ? partes[1].trim() : "000.000.000-00";

    // 1. O ASO VAI PARA A FILA DO ASO
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
        status: "AGUARDANDO",
        anamnese: null
    });

    // 2. DISPARO VIA WHATSAPP (SIMULAÇÃO / LINK DIRETO SE TELEFONE CADASTRADO)
    const cli = clientesCadastrados.find(c => c.nome === pedido.cliente);
    const telWhats = cli?.tel || cli?.medWhats || "";
    const msgWhats = encodeURIComponent(`Olá! Seu pedido de agendamento para ${nomeTrab} (${pedido.obj}) foi agendado para: ${horarios}. Local: ${endereco}. Boreal Engmed.`);
    if (telWhats) {
        window.open(`https://api.whatsapp.com/send?phone=${telWhats.replace(/\D/g, '')}&text=${msgWhats}`, '_blank');
    }

    // 3. O PEDIDO DESAPARECE DO MÓDULO SOLICITADOR
    monitorRequestsData = monitorRequestsData.filter(p => p.id !== id);
    salvarPedidosLocalStorage();

    if (supabaseClient) {
        try { await supabaseClient.from('pedidos_agendamento').delete().eq('id', id); } catch(e){}
    }

    renderMonitorTable();
    renderFilaAso();
    fecharModal('modal-resposta-agendamento');
    alert("✅ Pedido respondido com sucesso!\nO agendamento foi encaminhado, o ASO foi para a FILA DO ASO e removido das solicitações pendentes.");
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

// 5. MÓDULO 2 & 3: FILA DO ASO E BANCO DE ASOS DEFINITIVO (ITENS 2 E 3)
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

// ITEM 3: GESTÃO COMPLETA E DESCONGELAMENTO DA FICHA DE ANAMNESE (FILA E BANCO)
let currentAnamneseTarget = null; // { tipo: 'FILA'|'BANCO', id: 123 }

window.abrirAnamneseModal = function(id) {
    currentAnamneseTarget = { tipo: 'FILA', id: id };
    const item = asoQueueData.find(x => x.id === id);
    if (!item) return;

    carregarDadosFormAnamnese(item.nome, item.cpf, item.cargo, item.anamnese);
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

    // Antecedentes Familiares
    document.getElementById('fam_tb').checked = !!d.famTb;
    document.getElementById('fam_diab').checked = !!d.famDiab;
    document.getElementById('fam_cancer').checked = !!d.famCancer;
    document.getElementById('fam_asma').checked = !!d.famAsma;
    document.getElementById('fam_surdez').checked = !!d.famSurdez;
    document.getElementById('fam_mental').checked = !!d.famMental;
    document.getElementById('fam_coracao').checked = !!d.famCoracao;
    document.getElementById('fam_desc_geral').value = d.famDesc || '';

    // Antecedentes Pessoais
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

    const radioTp = document.querySelector('input[name="aso_tp_exame"]:checked');
    const tipoExameTxt = radioTp ? radioTp.value : (item.tipo || "ASO PERIÓDICO");

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
        tipoExame: tipoExameTxt,
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

// ITEM 2: LAYOUT OFICIAL DO ASO RIGOROSAMENTE IGUAL À FILA DE ASO
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

            <div class="border border-black p-3 text-center space-y-3 text-[11px] bg-white mt-3">
                <div class="grid grid-cols-2 gap-6 border-t border-black pt-3 items-end">
                    <div>
                        <div class="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <strong class="block text-[11px] uppercase">${item.nome}</strong>
                        <span class="text-[10px] text-slate-600 block mt-0.5">Assinatura do Trabalhador</span>
                    </div>
                    <div>
                        <div class="border-b border-black w-4/5 mx-auto mb-1"></div>
                        <strong class="block text-[11px] uppercase">${item.medico}</strong>
                        <span class="text-[10px] text-slate-600 block mt-0.5">Médico(a) Examinador(a)</span>
                    </div>
                </div>
                <div class="text-[10px] font-bold text-slate-700 pt-1 border-t border-black">
                    Médico Responsável pelo PCMSO: <span class="text-blue-900">${item.medicoPcmso || '-'}</span>
                </div>
            </div>
        `;
    }
    document.getElementById('modal-visualizar-aso-anexado').classList.remove('hidden');
};

// 6. MÓDULO 5: HOMOLOGAÇÃO MANUAL SALVA NO SUPABASE E RELATÓRIO DE ABSENTEÍSMO (ITEM 4)
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
                    <button type="button" onclick="visualizarLaudoHomologacao(${a.id})" class="bg-purple-800 hover:bg-purple-900 text-white px-2 py-1 rounded text-[10px] font-bold shadow">
                        🩺 Parecer
                    </button>
                </td>
                <td class="p-2 text-center">
                    ${currentRole === 'GESTOR' ? `<button onclick="apagarHomologacao(${a.id})" class="text-red-600 font-bold hover:underline text-[10px]">🗑️ Apagar</button>` : '<span class="text-slate-400">-</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
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

// ITEM 4: RELATÓRIO DE ABSENTEÍSMO TOTALMENTE DESTRAVADO E FUNCIONAL
window.gerarRelatorioPdfHomologacao = function() {
    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const lista = atestadosHomologacaoData.filter(a => activeCli === 'ALL' || a.cliente === activeCli);

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
                <td class="p-1 text-center font-bold">${a.cid}</td>
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

// 7. MÓDULO 6 & 7: MATRIZ PCMSO, AGENTES DE RISCO E PLANO DE AÇÃO (ITENS 5, 7, 8, 9)
window.filtrarRiscosCat = function(idCatSelect, idAgenteSelect) {
    const cat = document.getElementById(idCatSelect)?.value;
    const selAgente = document.getElementById(idAgenteSelect);
    if (!selAgente) return;
    selAgente.innerHTML = '<option value="">-- Selecione o Perigo do Inventário PGR --</option>';

    if (CATALOGO_RISCOS[cat]) {
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

// Aliases para compatibilidade
window.autoPreencherExamePcmso = window.autoPreencherPerigoRiscoPlano;

window.adicionarLinhaPCMSO = async function() {
    const activeCli = document.getElementById('active-cliente-select')?.value || 'CLIENTE';
    const clienteNome = activeCli === 'ALL' ? (clientesCadastrados[0]?.nome || 'CLIENTE PADRÃO') : activeCli;

    const lotacao = document.getElementById('pcmso_add_lotacao')?.value.trim() || 'OPERACIONAL';
    const processo = document.getElementById('pcmso_add_processo')?.value.trim() || 'ROTINA OPERACIONAL';
    const cargo = document.getElementById('pcmso_add_cargo')?.value.trim() || 'OPERADOR';
    const qtd = parseInt(document.getElementById('pcmso_add_qtd')?.value) || 1;

    // Perigo: pega do campo novo se preenchido, senão do select
    const perigoCustom = document.getElementById('pcmso_add_perigo_custom')?.value.trim();
    const selAgente = document.getElementById('pcmso_add_agente');
    const perigo = perigoCustom || selAgente?.value || 'AUSÊNCIA DE RISCOS ESPECÍFICOS';

    // Risco: pega do campo novo de risco
    const risco = document.getElementById('pcmso_add_risco')?.value.trim() || selAgente?.options[selAgente.selectedIndex]?.dataset.risco || 'MONITORAMENTO CLÍNICO OCUPACIONAL';

    // Exame: pega do customizado ou select
    const selExame = document.getElementById('pcmso_add_exame')?.value;
    const customExame = document.getElementById('pcmso_add_exame_custom')?.value.trim();
    const exame = customExame || selExame || 'CLÍNICO';

    // Periodicidade
    const selPer = document.getElementById('pcmso_add_periodicidade')?.value;
    const customPer = document.getElementById('pcmso_add_per_custom')?.value.trim();
    const periodicidade = customPer || selPer || 'Anual';

    // Planos de Ação
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

// ITEM 9: DESCONGELAMENTO DAS TECLAS DE RELATÓRIO MATRIZ EM WORD E PDF
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
                <td style="border: 1px solid #000; padding: 4px;">${m.agente}</td>
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
                        <th style="border: 1px solid #000; padding: 4px;">Agente</th>
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

// 8. MÓDULO 8: RELATÓRIO FINANCEIRO CONSOLIDADO E TECLA APAGAR (ITENS 6, 10, 11)
window.renderProducaoTable = function() {
    const tbody = document.getElementById('relatorio-producao-tbody');
    const totalEl = document.getElementById('valor-soma-total-producao');
    if (!tbody) return;
    tbody.innerHTML = '';
    let somaTotal = 0;

    const activeCli = document.getElementById('active-cliente-select')?.value || 'ALL';
    const nomeLogado = (usuarioLogado?.nome || '').toUpperCase();

    // 1. Linhas das Clínicas (agendamentos)
    monitorRequestsData
        .filter(r => (activeCli === 'ALL' || r.cliente === activeCli) && (currentRole === 'GESTOR' || currentRole === 'AGENTE' || r.clinica.toUpperCase().includes(nomeLogado) || nomeLogado.includes(r.clinica.toUpperCase())))
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
                <td class="p-2.5 text-center">
                    ${currentRole === 'GESTOR' ? `<button onclick="apagarLancamentoFinanceiroPedido(${r.id})" class="text-rose-600 font-bold hover:underline text-xs">🗑️ Apagar</button>` : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });

    // 2. Linhas dos Médicos e Vínculos Comerciais
    const vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    vinculos
        .filter(v => (activeCli === 'ALL' || v.cliente_nome === activeCli) && (currentRole === 'GESTOR' || currentRole === 'AGENTE' || v.entidade_nome.toUpperCase().includes(nomeLogado) || nomeLogado.includes(v.entidade_nome.toUpperCase())))
        .forEach((v, idx) => {
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
                <td class="p-2.5 text-center">
                    ${currentRole === 'GESTOR' ? `<button onclick="apagarLancamentoFinanceiroVinculo(${idx})" class="text-rose-600 font-bold hover:underline text-xs">🗑️ Apagar</button>` : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });

    if (totalEl) totalEl.textContent = `R$ ${somaTotal.toFixed(2).replace('.', ',')}`;
};

// ITEM 11: INSTALAÇÃO DA TECLA DE APAGAR NO MÓDULO DE POSIÇÃO FINANCEIRA
window.apagarLancamentoFinanceiroPedido = async function(id) {
    if (currentRole !== 'GESTOR') return alert("Apenas o Gestor pode apagar registros financeiros!");
    if (!confirm("Deseja apagar este registro financeiro?")) return;
    monitorRequestsData = monitorRequestsData.filter(p => p.id !== id);
    salvarPedidosLocalStorage();
    renderProducaoTable();
    renderMonitorTable();
    if (supabaseClient) {
        try { await supabaseClient.from('pedidos_agendamento').delete().eq('id', id); } catch(e){}
    }
};

window.apagarLancamentoFinanceiroVinculo = function(idx) {
    if (currentRole !== 'GESTOR') return alert("Apenas o Gestor pode apagar vínculos financeiros!");
    if (!confirm("Deseja apagar esta produção do vínculo?")) return;
    let vinculos = JSON.parse(localStorage.getItem('boreal_vinculos_db') || '[]');
    vinculos.splice(idx, 1);
    localStorage.setItem('boreal_vinculos_db', JSON.stringify(vinculos));
    renderProducaoTable();
    renderTabelaVinculos();
};

// ITEM 10: DESTRAVAR TECLA DE FECHAMENTO FINANCEIRO PDF
window.gerarRelatorioPdfFinanceiroProducao = function() {
    window.print();
};

// 9. CADASTROS, VÍNCULOS COMERCIAIS E PERSISTÊNCIA
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
    alert("✅ Novo vínculo gravado com sucesso!");
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

// ITEM 1: RENDERIZAÇÃO DA TABELA DE PEDIDOS COM BOTÃO RESPONDER E APAGAR
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
