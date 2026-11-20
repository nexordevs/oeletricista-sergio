// Guia de solução de problemas — conteúdo técnico de apoio para eletricistas assinantes.
// Sempre trabalhar conforme NR-10: desenergizar, bloquear, sinalizar e testar ausência de tensão.

export type Guia = {
  slug: string; titulo: string; categoria: "Residencial e predial" | "Comandos e motores";
  resumo: string; sintomas: string[]; causas: string[]; verificar: string[]; solucao: string[]; atencao?: string;
};

export const GUIAS: Guia[] = [
  {
    slug: "curto-quadro-de-comando", categoria: "Comandos e motores",
    titulo: "Curto-circuito em quadro de comando",
    resumo: "Disjuntor ou fusível do comando desarmando ao energizar ou ao acionar a botoeira.",
    sintomas: ["Desarma ao ligar o comando ou ao apertar a botoeira", "Contator não fecha ou fecha e o disjuntor cai", "Cheiro de queimado, marcas escuras em bornes ou na bobina"],
    causas: [
      "Bobina do contator em curto (queimada)",
      "Bobina com tensão diferente da tensão de comando (ex.: bobina 220 V ligada em 380 V)",
      "Fio de comando com isolação danificada encostando na carcaça ou na porta (comum na dobradiça)",
      "Botoeira, sinaleiro, fim de curso ou pressostato com água, óleo ou isolação rompida",
      "Partida reversora ou estrela-triângulo sem intertravamento: dois contatores fecham juntos e causam curto entre fases",
      "Contatos de força desgastados, terminais frouxos ou queimados",
      "Transformador de comando danificado; poeira condutiva ou umidade no painel",
    ],
    verificar: [
      "Desligue, bloqueie, sinalize e teste a ausência de tensão",
      "Separe comando e força: retire o fusível/disjuntor do comando e teste um de cada vez",
      "Meça a resistência da bobina do contator: próximo de 0 Ω indica curto; aberto (infinito) indica bobina interrompida",
      "Confira a tensão nominal impressa na bobina e compare com a tensão de comando do painel",
      "Meça a isolação de cada fio de comando para a carcaça/terra (megômetro, se tiver); deve estar aberto",
      "Desconecte botoeiras, sinaleiros e sensores um a um até o curto sumir",
      "Em reversão/estrela-triângulo, confira o contato auxiliar NF de intertravamento e o intertravamento mecânico",
      "Inspecione contatos de força (desgaste, solda, escurecimento) e reaperto dos bornes",
    ],
    solucao: [
      "Substituir a bobina ou o contator pelo mesmo modelo, tensão de bobina e categoria (AC-3 para motores)",
      "Refazer a fiação danificada, usar canaleta, terminais adequados e proteger a passagem na dobradiça",
      "Trocar botoeiras/sinaleiros danificados e vedar o painel contra água e poeira",
      "Instalar intertravamento elétrico (NF) e mecânico em partidas reversoras e estrela-triângulo",
      "Reapertar bornes com o torque do fabricante e testar o comando antes de ligar a força",
    ],
    atencao: "Nunca jumpear o intertravamento para “testar”: o curto entre fases é imediato.",
  },
  {
    slug: "disjuntor-desarmando", categoria: "Residencial e predial",
    titulo: "Disjuntor desarmando",
    resumo: "Diferencie sobrecarga, curto-circuito e defeito do próprio disjuntor.",
    sintomas: ["Desarma na hora de rearmar (instantâneo)", "Desarma depois de alguns minutos com aparelhos ligados", "Desarma de forma aleatória"],
    causas: [
      "Curto-circuito na fiação, em caixas, tomadas ou no aparelho (desarme instantâneo)",
      "Sobrecarga: muitos aparelhos no mesmo circuito (desarme após um tempo)",
      "Aparelho com defeito (chuveiro, motor, resistência)",
      "Disjuntor envelhecido, de baixa qualidade ou com borne frouxo esquentando",
    ],
    verificar: [
      "Identifique o circuito e desligue/desconecte todos os aparelhos dele",
      "Rearme sem carga: se desarmar, o problema está na fiação; isole trechos (abra caixas) até achar",
      "Se segurar sem carga, ligue os aparelhos um a um para achar o que provoca o desarme",
      "Meça a corrente com alicate amperímetro e compare com o disjuntor e a bitola do fio",
      "Verifique aquecimento no disjuntor e o aperto dos bornes",
    ],
    solucao: [
      "Corrigir o curto (fio desencapado, emenda, caixa com umidade) ou reparar o aparelho",
      "Em sobrecarga: dividir o circuito ou criar circuito exclusivo (chuveiro, ar, forno)",
      "Substituir o disjuntor defeituoso por um de mesma corrente e curva",
    ],
    atencao: "Não aumentar o disjuntor sem aumentar o fio: o disjuntor protege o condutor.",
  },
  {
    slug: "dr-desarmando", categoria: "Residencial e predial",
    titulo: "DR (diferencial residual) desarmando",
    resumo: "O DR desarma quando há fuga de corrente para o terra — ou por erro de ligação do neutro.",
    sintomas: ["DR cai ao ligar o chuveiro ou um aparelho", "DR cai em dias de chuva", "DR não fica armado de jeito nenhum"],
    causas: [
      "Neutro de um circuito ligado fora do DR, ou neutros de circuitos misturados (muito comum)",
      "Neutro aterrado depois do DR (neutro e terra unidos a jusante)",
      "Chuveiro com resistência exposta (fuga pela água) — use resistência blindada com DR",
      "Umidade em caixas, tomadas externas e iluminação de jardim",
      "Aparelho com fuga (geladeira, máquina de lavar, bomba) ou fio com isolação danificada",
    ],
    verificar: [
      "Desligue todos os disjuntores depois do DR e religue um por um",
      "No circuito que derruba: desconecte os aparelhos e teste de novo",
      "Confira se todos os neutros dos circuitos protegidos passam pelo DR e não estão misturados com outros circuitos",
      "Verifique se não há ligação entre neutro e terra depois do DR",
      "Meça a isolação dos condutores para o terra com megômetro",
      "Teste o próprio DR pelo botão de teste",
    ],
    solucao: [
      "Separar neutros por circuito e passá-los corretamente pelo DR",
      "Desfazer ligações neutro-terra após o DR",
      "Trocar chuveiro por modelo com resistência blindada; vedar caixas externas",
      "Reparar ou substituir o aparelho com fuga",
    ],
    atencao: "Nunca retirar o DR para “resolver”: ele protege as pessoas contra choque.",
  },
  {
    slug: "motor-nao-parte", categoria: "Comandos e motores",
    titulo: "Motor não parte ou fica zumbindo",
    resumo: "Motor energizado que não gira, gira fraco ou esquenta rápido.",
    sintomas: ["Zumbido sem girar", "Relé térmico disparando", "Motor esquentando ou girando com pouca força"],
    causas: [
      "Falta de fase (fusível, contato do contator ou borne frouxo em uma fase)",
      "Relé térmico disparado ou ajustado abaixo da corrente nominal",
      "Travamento mecânico (rolamento, bomba, carga presa)",
      "Motor monofásico: capacitor de partida/permanente ou chave centrífuga com defeito",
      "Ligação errada (220/380 V, estrela/triângulo) ou tensão baixa",
    ],
    verificar: [
      "Meça a tensão entre fases antes e depois do contator (L1-L2, L2-L3, L1-L3)",
      "Meça a corrente nas três fases com alicate: devem estar equilibradas",
      "Desenergizado, gire o eixo à mão para checar travamento",
      "Meça a resistência dos enrolamentos (devem ser iguais) e a isolação para a carcaça",
      "No monofásico, teste o capacitor (capacímetro) e a chave centrífuga",
      "Confira a placa do motor: tensão, corrente nominal e esquema de ligação",
    ],
    solucao: [
      "Restabelecer a fase faltante (trocar fusível, contator ou refazer conexão)",
      "Ajustar o relé térmico para a corrente nominal da placa",
      "Corrigir o problema mecânico ou encaminhar para rebobinagem",
      "Substituir capacitor pelo mesmo µF e tensão",
    ],
  },
  {
    slug: "contator-vibrando", categoria: "Comandos e motores",
    titulo: "Contator vibrando ou batendo",
    resumo: "Ruído de “zumbido” forte ou contator abrindo e fechando sem parar.",
    sintomas: ["Zumbido alto com o contator fechado", "Contator batendo (abre e fecha)", "Contatos queimando rápido"],
    causas: [
      "Tensão de comando baixa (queda de tensão ou transformador fraco)",
      "Mau contato no circuito de selo, botoeira ou contato auxiliar",
      "Faces do núcleo sujas, oxidadas ou desalinhadas",
      "Espira de sombra (anel de defasagem) quebrada em bobinas CA",
      "Bobina com tensão nominal diferente da aplicada",
    ],
    verificar: [
      "Meça a tensão nos terminais da bobina com o contator acionado (mínimo cerca de 85% da nominal)",
      "Confira o contato de selo (NA auxiliar) e a botoeira de desliga (NF)",
      "Desenergizado, inspecione as faces do núcleo e a espira de sombra",
    ],
    solucao: [
      "Corrigir a tensão de comando ou o transformador",
      "Limpar as faces do núcleo (sem lixar) ou substituir o contator",
      "Refazer contatos de selo e botoeiras com mau contato",
    ],
  },
  {
    slug: "tomada-esquentando", categoria: "Residencial e predial",
    titulo: "Tomada esquentando ou derretendo",
    resumo: "Calor, plástico escurecido ou derretido e cheiro de queimado.",
    sintomas: ["Tomada ou plugue quente", "Marcas escuras ou plástico deformado", "Aparelho desligando sozinho"],
    causas: [
      "Mau contato: tomada frouxa, borne mal apertado, emenda dentro da caixa",
      "Aparelho de alta potência em tomada de 10 A (ex.: micro-ondas, aquecedor)",
      "Benjamim/extensão concentrando vários aparelhos",
      "Fio fino demais para a carga do circuito",
    ],
    verificar: [
      "Desligue o disjuntor do circuito e teste a ausência de tensão",
      "Abra a tomada: verifique aperto, oxidação, emendas e a bitola dos fios",
      "Meça a corrente do aparelho com alicate e compare com a tomada (10 A/20 A) e o fio",
    ],
    solucao: [
      "Substituir a tomada (20 A para aparelhos de maior potência) e refazer as conexões",
      "Eliminar emendas ruins; usar conectores adequados",
      "Criar circuito exclusivo para o aparelho, se necessário",
    ],
  },
  {
    slug: "luzes-piscando", categoria: "Residencial e predial",
    titulo: "Luzes piscando ou tensão oscilando",
    resumo: "Pode ser só o driver da lâmpada — ou um neutro rompido, que é perigoso.",
    sintomas: ["Luz pisca ao ligar chuveiro, ar ou micro-ondas", "Algumas lâmpadas ficam fortes e outras fracas", "Aparelhos queimando sem motivo"],
    causas: [
      "Neutro frouxo ou rompido no quadro, no padrão ou na rede (tensões desequilibradas)",
      "Circuito sobrecarregado ou longo demais (queda de tensão)",
      "Mau contato em interruptor ou emenda",
      "Driver/reator da lâmpada com defeito; LED incompatível com dimmer ou interruptor iluminado",
    ],
    verificar: [
      "Meça a tensão de fase-neutro com e sem carga; compare entre as fases",
      "Se uma fase sobe (ex.: 127 V indo a 160 V+) e a outra cai: suspeite de neutro rompido",
      "Reaperte o neutro no barramento do quadro e no padrão de entrada",
      "Troque a lâmpada/driver para testar",
    ],
    solucao: [
      "Refazer a conexão do neutro; se o problema for no padrão antes do medidor ou na rede, acionar a concessionária",
      "Dividir circuitos sobrecarregados ou aumentar a bitola",
      "Substituir interruptores, lâmpadas ou drivers com defeito",
    ],
    atencao: "Neutro rompido pode queimar vários aparelhos de uma vez: oriente o cliente a desligar os equipamentos até corrigir.",
  },
  {
    slug: "choque-chuveiro-torneira", categoria: "Residencial e predial",
    titulo: "Choque no chuveiro, torneira ou aparelho",
    resumo: "Formigamento ao tocar no chuveiro, no registro ou em aparelhos.",
    sintomas: ["Formigamento no registro ou no chuveiro", "Choque ao encostar em geladeira ou máquina", "DR desarmando (quando existe)"],
    causas: [
      "Falta de aterramento ou fio terra desconectado",
      "Resistência rompida encostando na carcaça; chuveiro danificado",
      "Fio desencapado em contato com cano metálico ou carcaça",
      "Neutro e terra invertidos ou terra ligado ao neutro",
    ],
    verificar: [
      "Meça a tensão entre a carcaça/cano e um terra confiável",
      "Verifique se o fio terra (verde/verde-amarelo) está ligado ao chuveiro/aparelho e ao barramento de terra",
      "Desenergizado, meça a isolação entre fase e carcaça do aparelho",
    ],
    solucao: [
      "Aterrar corretamente o circuito e o aparelho",
      "Instalar DR de 30 mA no circuito (obrigatório em áreas molhadas)",
      "Substituir resistência, chuveiro ou fiação danificados",
    ],
    atencao: "Choque em área molhada é risco de vida: oriente o cliente a não usar até corrigir.",
  },
  {
    slug: "falta-de-fase-casa", categoria: "Residencial e predial",
    titulo: "Parte da casa sem energia",
    resumo: "Alguns cômodos funcionam e outros não: geralmente uma fase caiu.",
    sintomas: ["Metade das tomadas e luzes sem energia", "Chuveiro 220 V não esquenta e aparelhos 127 V de um lado funcionam"],
    causas: [
      "Um polo do disjuntor geral desarmado ou com defeito",
      "Conexão frouxa ou queimada no padrão, no medidor ou no barramento",
      "Falta de fase na rede da concessionária",
    ],
    verificar: [
      "Meça a tensão de cada fase na saída do disjuntor geral e na entrada do quadro",
      "Se faltar fase antes do medidor, o problema é da concessionária",
      "Inspecione conexões do padrão e do barramento (marcas de aquecimento)",
    ],
    solucao: [
      "Substituir o disjuntor geral defeituoso ou refazer a conexão queimada",
      "Se for na rede/antes do medidor: acionar a concessionária",
    ],
  },
  {
    slug: "disjuntor-esquentando", categoria: "Residencial e predial",
    titulo: "Disjuntor esquentando no quadro",
    resumo: "Aquecimento no disjuntor costuma ser mau contato ou carga no limite.",
    sintomas: ["Disjuntor quente ao toque", "Plástico escurecido ou cheiro de queimado no quadro", "Desarmes sem motivo aparente"],
    causas: [
      "Borne frouxo ou fio mal encaixado (pouco cobre preso)",
      "Carga trabalhando muito perto da corrente nominal por longos períodos",
      "Disjuntor de baixa qualidade ou envelhecido",
      "Fio de bitola incompatível com o borne",
    ],
    verificar: [
      "Use termômetro infravermelho com o circuito em carga, se possível",
      "Meça a corrente do circuito com alicate amperímetro",
      "Desenergizado, reaperte os bornes e verifique se há cobre oxidado ou queimado",
    ],
    solucao: [
      "Reapertar com o torque correto e refazer pontas danificadas (terminal adequado)",
      "Substituir disjuntor danificado",
      "Redistribuir cargas ou redimensionar o circuito",
    ],
  },
];

export const SEGURANCA = [
  "Desenergize, bloqueie e sinalize o circuito (NR-10)",
  "Teste a ausência de tensão com instrumento adequado antes de tocar",
  "Use EPIs: luvas isolantes, óculos e calçado de segurança",
  "Desconfie de neutro: ele pode estar energizado em instalações com defeito",
];
