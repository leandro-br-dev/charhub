# 🔍 MISTÉRIO VIVO

Analisei as três propostas e extraí o melhor de cada uma. Abaixo está a versão definitiva, focada em **realismo**, **mecânicas claras** e **máximo aproveitamento da IA**.

---

## 📋 SÍNTESE DAS MELHORES IDEIAS COLETADAS

| Fonte | Ideia Incorporada |
|-------|-------------------|
| **Eco da Mente** | Sistema de Foco (investigar o quê, não onde ir), Nível de Estresse, Flashbacks Sensoriais, Suspeito Colaborador |
| **Sombras do Enigma** | Limite de ações por rodada, Comandos estruturados (/explorar, /interrogar), Medidor de Tensão, Mecânica de Aliança |
| **Mistério Vivo (original)** | Segredos em Camadas, Cooperação tática, Geração procedural, Personalidades consistentes |
| **Suas adições** | Votação para acusação, 4 elementos na acusação final (Suspeito, Local, Arma, Motivo), Sistema de pontuação competitivo |

---

## 🎯 CONCEITO FINAL

**Nome:** Mistério Vivo

**Premissa:** Um crime foi cometido. Os jogadores são investigadores que têm tempo limitado para interrogar suspeitos, examinar evidências e montar uma teoria. A IA dá vida aos personagens — eles mentem, ficam nervosos, se contradizem e reagem emocionalmente às abordagens dos jogadores.

**Diferencial:** Não é eliminação por cartas. É dedução por **conversa, pressão psicológica e análise de contradições**.

---

## ⚙️ CONFIGURAÇÃO DA PARTIDA

| Parâmetro | Valor |
|-----------|-------|
| **Duração** | 15-30 minutos |
| **Jogadores** | 1 a 4 |
| **Bots ativos** | 1 Narrador + 4 Suspeitos |
| **Objetivo** | Descobrir: **Culpado + Local + Arma + Motivo** |

---

## 🎭 ESTRUTURA DOS PERSONAGENS

### O Narrador (Game Master)
- Controla o fluxo do jogo
- Descreve cenas e locais
- Revela pistas ambientais
- Gerencia o tempo
- Valida acusações e calcula pontuação

### Os Suspeitos (4 NPCs)
Cada suspeito é um bot com personalidade própria e as seguintes camadas de informação:

```
┌─────────────────────────────────────────────┐
│           FICHA DO SUSPEITO                 │
├─────────────────────────────────────────────┤
│ Nome: Helena Thornwood                      │
│ Papel: Esposa da vítima                     │
│ Personalidade: Fria, calculista, elegante   │
├─────────────────────────────────────────────┤
│ ÁLIBI PÚBLICO                               │
│ "Estava no quarto com enxaqueca"            │
├─────────────────────────────────────────────┤
│ SEGREDO PESSOAL (não relacionado ao crime)  │
│ Tem um caso com o advogado da família       │
├─────────────────────────────────────────────┤
│ CONEXÃO COM O CRIME                         │
│ Sabia que o marido ia mudar o testamento    │
├─────────────────────────────────────────────┤
│ É O CULPADO? [SIM/NÃO]                      │
│ Se SIM: Sabe método, local, motivo real     │
├─────────────────────────────────────────────┤
│ NÍVEL DE ESTRESSE: ████░░░░░░ 40%           │
│ (aumenta com pressão/contradições)          │
└─────────────────────────────────────────────┘
```

---

## 🧠 SISTEMA DE ESTRESSE E COMPORTAMENTO

### Como o Estresse Funciona

Cada suspeito começa com **estresse base** (0-30% dependendo se é culpado ou não).

**O estresse AUMENTA quando:**
- Jogador apresenta evidência que contradiz o álibi (+15%)
- Jogador faz acusação direta agressiva (+10%)
- Outro suspeito menciona algo comprometedor (+10%)
- Jogador insiste na mesma linha de questionamento (+5%)

**O estresse DIMINUI quando:**
- Jogador muda de assunto (-10%)
- Jogador é empático ou gentil (-5%)
- Passa tempo sem ser interrogado (-5% por rodada)

### Comportamento por Nível de Estresse

| Nível | Comportamento do Suspeito |
|-------|---------------------------|
| **0-30%** | Calmo, respostas elaboradas, mantém consistência |
| **31-50%** | Levemente defensivo, respostas mais curtas |
| **51-70%** | Nervoso, hesitações no texto ("Eu... bem..."), tenta mudar de assunto |
| **71-85%** | Muito agitado, pode soltar informação acidentalmente, acusa outros |
| **86-100%** | **QUEBRA** — Se for culpado, confessa parcialmente. Se inocente, revela seu segredo pessoal |

### Exemplo de Progressão

```
[Estresse 25%]
Jogador: "Helena, onde você estava às 21h?"
Helena: "No meu quarto, descansando. Sofro de enxaquecas terríveis, 
        os médicos já me receitaram diversos tratamentos."

[Estresse 55%]  
Jogador: "Estranho, o mordomo disse que viu você no corredor às 21h."
Helena: "Eu... talvez tenha descido para pegar água. Não lembro 
        exatamente. Por que estão focando tanto em mim?"

[Estresse 80%]
Jogador: "E esse perfume encontrado perto do corpo? É o seu, não é?"
Helena: "CHEGA! Sim, eu desci! Mas não para... vocês não entendem 
        a pressão que eu vivia nesta casa. Ele ia me deixar sem nada!"
```

---

## 📍 SISTEMA DE COMANDOS

### Comandos Estruturados (Preferencial)

| Comando | Função | Exemplo |
|---------|--------|---------|
| `/explorar [local]` | Examina um local | `/explorar escritório` |
| `/interrogar @nome [pergunta]` | Interroga suspeito específico | `/interrogar @helena Onde você estava às 21h?` |
| `/examinar [objeto]` | Analisa objeto específico | `/examinar carta queimada` |
| `/compartilhar [info]` | Compartilha descoberta com grupo | `/compartilhar Encontrei um recibo de aposta` |
| `/aliar @jogador` | Propõe aliança com outro jogador | `/aliar @carlos` |
| `/votar acusação` | Propõe votação para acusação final | `/votar acusação` |
| `/acusar` | Faz acusação (só após votação aprovada) | `/acusar` |
| `/status` | Ver tempo restante e progresso | `/status` |

### Interpretação Natural (Fallback)

Se o jogador não usar comandos, o **Orquestrador analisa a intenção**:

| Mensagem Natural | Interpretação | Ação |
|------------------|---------------|------|
| "Quero olhar o escritório" | Exploração | → Narrador |
| "Helena, você conhecia a vítima bem?" | Interrogatório | → Bot Helena |
| "O que tem embaixo da mesa?" | Exame específico | → Narrador |
| "Gente, acho que foi o mordomo" | Discussão grupo | → Nenhum bot responde |
| "Mordomo, você está mentindo!" | Interrogatório agressivo | → Bot Mordomo (+estresse) |

### Lógica do Orquestrador

```
RECEBE mensagem do jogador

SE começa com "/" ENTÃO
    PARSE comando estruturado
    EXECUTAR ação correspondente

SENÃO
    ANALISAR intenção via NLP:
    
    SE menciona nome de suspeito + pergunta/afirmação ENTÃO
        → Direcionar para Bot do suspeito
        → Classificar tom (neutro/agressivo/empático)
        → Ajustar estresse do suspeito
        
    SE menciona local ou "examinar/olhar/procurar" ENTÃO
        → Direcionar para Narrador
        → Narrador descreve + possível pista
        
    SE menciona "acho que/talvez/será que" sem @menção ENTÃO
        → Conversa de grupo, não acionar bots
        → (Opcional: bots podem "ouvir" e reagir)
```

---

## ⏱️ ESTRUTURA TEMPORAL DA PARTIDA

### Os 3 Atos

```
┌────────────────────────────────────────────────────────────────┐
│  ATO 1: A CENA          │  ATO 2: INVESTIGAÇÃO   │  ATO 3: ULTIMATO    │
│  (3-5 min)              │  (10-18 min)           │  (5-7 min)          │
├─────────────────────────┼────────────────────────┼─────────────────────┤
│ • Narrador apresenta    │ • Investigação livre   │ • Pressão final     │
│   a cena do crime       │ • Interrogatórios      │ • Votação acusação  │
│ • Apresenta suspeitos   │ • Exploração de locais │ • Acusações         │
│ • Mostra evidência      │ • Limite: 2 ações/     │ • Revelação         │
│   inicial               │   jogador por rodada   │                     │
└─────────────────────────┴────────────────────────┴─────────────────────┘
```

### Alertas Temporais do Narrador

| Tempo Restante | Mensagem do Narrador |
|----------------|----------------------|
| **10 min** | *"O delegado liga: vocês têm mais 10 minutos antes de eu ter que liberar os suspeitos."* |
| **5 min** | *"⚠️ URGENTE: Restam apenas 5 minutos. Se tiverem uma teoria, é hora de considerar a acusação."* |
| **2 min** | *"🚨 ÚLTIMOS 2 MINUTOS. O delegado está chegando. Decidam agora ou o caso esfria."* |
| **Tempo esgotado** | *"O delegado entra na sala. 'Tempo esgotado. Apresentem suas conclusões ou liberamos todos.'"* → **Força acusação** |

### Limite de Ações por Rodada

Para manter ritmo e evitar que um jogador domine:

- **Cada jogador:** máximo 2 ações significativas por rodada (3-4 min)
- **Ações que contam:** `/explorar`, `/interrogar`, `/examinar`
- **Ações livres:** `/compartilhar`, conversa no grupo, `/status`

O Narrador marca fim de rodada:
> *"— Fim da Rodada 2 de 5. Resumo: Helena está nervosa, carta queimada encontrada no escritório. Nova rodada iniciando. —"*

---

## 🗳️ SISTEMA DE VOTAÇÃO E ACUSAÇÃO

### Iniciando Votação

Qualquer jogador pode propor acusação a qualquer momento:

```
Jogador: /votar acusação

Narrador: "🗳️ VOTAÇÃO INICIADA
          @jogador1 propõe encerrar investigação e partir para acusação.
          
          Votem: ✅ Sim, acusar agora  |  ❌ Não, continuar investigando
          
          Tempo para votar: 60 segundos"
```

### Resultado da Votação

| Resultado | Consequência |
|-----------|--------------|
| **Maioria SIM** (>50%) | Investigação encerra, todos fazem acusação |
| **Maioria NÃO** | Investigação continua, -1 ação para quem propôs nesta rodada |
| **Empate** | Investigação continua |

### Formato da Acusação

Quando a fase de acusação é aberta, cada jogador envia sua resposta **privadamente** ao Narrador:

```
/acusar
Suspeito: Helena Thornwood
Local: Escritório
Arma: Candelabro
Motivo: Vingança por ser excluída do testamento
```

O Narrador coleta todas as acusações antes de revelar resultados.

---

## 🏆 SISTEMA DE PONTUAÇÃO

### Pontos por Acerto

| Elemento | Pontos | Observação |
|----------|--------|------------|
| **Suspeito correto** | 40 pts | O mais importante |
| **Local correto** | 20 pts | Onde o crime aconteceu |
| **Arma correta** | 20 pts | Instrumento usado |
| **Motivo correto** | 20 pts | Por que o crime foi cometido |

**Total máximo: 100 pontos**

### Bônus e Penalidades

| Condição | Modificador |
|----------|-------------|
| Acertou tudo (100 pts) | +20 pts bônus |
| Terminou com tempo sobrando (>5min) | +10 pts |
| Fez quebrar o culpado (estresse 100%) | +15 pts |
| Acusou inocente de ser culpado | -10 pts |
| Propôs votação que foi rejeitada | -5 pts |

### Rankings

| Pontuação | Rank |
|-----------|------|
| 0-29 | 🥉 Detetive Novato |
| 30-59 | 🥈 Detetive Competente |
| 60-89 | 🥇 Detetive Experiente |
| 90-109 | 🏅 Detetive Brilhante |
| 110+ | 🏆 Detetive Lendário |

### Desempate

Se dois jogadores tiverem mesma pontuação:
1. Quem acertou o suspeito (prioridade)
2. Quem fez menos acusações erradas durante o jogo
3. Quem usou menos ações totais

---

## 🎬 FLUXO COMPLETO DE UMA PARTIDA

### FASE 0: Setup (Automático)

O sistema gera o caso:

```json
{
  "caso": {
    "vitima": {
      "nome": "Reginald Thornwood",
      "descricao": "Magnata das ferrovias, 62 anos",
      "causa_mortis": "Traumatismo craniano"
    },
    "solucao": {
      "culpado": "Edmund Price",
      "local": "Biblioteca",
      "arma": "Peso de papel de bronze",
      "motivo": "Reginald descobriu que Edmund desviava dinheiro"
    },
    "suspeitos": [
      {
        "id": "helena",
        "nome": "Helena Thornwood",
        "papel": "Esposa da vítima",
        "alibi": "No quarto com enxaqueca",
        "segredo": "Caso com Edmund",
        "sabe": "Viu Edmund nervoso à noite",
        "culpado": false
      },
      {
        "id": "edmund", 
        "nome": "Edmund Price",
        "papel": "Advogado da família",
        "alibi": "Revisando documentos no escritório",
        "segredo": "Desviou fundos da empresa",
        "sabe": "Cometeu o crime",
        "culpado": true,
        "estresse_base": 25
      },
      // ... mais 2 suspeitos
    ],
    "locais": ["Salão Principal", "Biblioteca", "Escritório", "Jardim de Inverno", "Cozinha"],
    "pistas": [
      {"local": "Biblioteca", "objeto": "Peso de papel com sangue", "tipo": "crucial"},
      {"local": "Escritório", "objeto": "Documentos financeiros alterados", "tipo": "crucial"},
      {"local": "Jardim", "objeto": "Luvas descartadas", "tipo": "crucial"},
      {"local": "Cozinha", "objeto": "Faca suja de comida", "tipo": "red_herring"}
    ]
  }
}
```

Cada bot suspeito recebe seu system prompt personalizado com suas informações.

---

### FASE 1: A Cena (3-5 min)

**Narrador:**
> 🔍 **MISTÉRIO VIVO — CASO: A MORTE NO THORNWOOD**
> 
> *A chuva bate nas janelas da Mansão Thornwood. Vocês foram chamados às pressas pelo delegado.*
> 
> **A VÍTIMA**
> Reginald Thornwood, 62 anos, magnata das ferrovias. Encontrado morto no salão principal às 22h30. Causa preliminar: traumatismo craniano.
> 
> **OS SUSPEITOS**
> Todos estavam na mansão no momento do crime:
> 
> 👩 **Helena Thornwood** — Esposa da vítima, 34 anos. Casada há 8 anos.
> 
> 👔 **Edmund Price** — Advogado da família há 15 anos. Amigo próximo da vítima.
> 
> 🎩 **Sr. Crawford** — Mordomo, trabalha na mansão há 30 anos.
> 
> 🎨 **Vivienne Thornwood** — Sobrinha, 28 anos. Artista, mora na mansão.
> 
> **LOCAIS DISPONÍVEIS PARA INVESTIGAÇÃO:**
> Salão Principal • Biblioteca • Escritório • Jardim de Inverno • Cozinha
> 
> **EVIDÊNCIA INICIAL:**
> Um relógio de bolso quebrado foi encontrado perto do corpo, marcando 21:47.
> 
> ⏱️ **Tempo de investigação: 20 minutos**
> 
> *O que desejam fazer, detetives?*

[Imagem: Salão escurecido com silhueta do corpo]

---

### FASE 2: Investigação (10-18 min)

**Exemplo de interações:**

```
Carlos: /explorar biblioteca

Narrador: "A biblioteca é ampla, com estantes do chão ao teto. O cheiro 
          de couro e papel velho domina o ambiente. A lareira está apagada, 
          mas há cinzas recentes.
          
          Vocês notam: Uma poltrona virada, como se alguém tivesse levantado 
          bruscamente. Na mesa lateral, há um peso de papel de bronze... 
          com uma mancha escura em um dos cantos."

[Imagem: Peso de papel com mancha]

---

Julia: @edmund Onde você estava às 21h45?

Edmund (estresse 25%): "No escritório, revisando os documentos do 
                        testamento de Reginald. Ele havia me pedido 
                        algumas alterações. Trabalho tedioso, mas 
                        necessário. Por quê?"

---

Carlos: /examinar peso de papel

Narrador: "Você pega o objeto com cuidado. É pesado, bronze maciço, 
          com formato de águia. A mancha escura parece ser... sangue seco.
          
          Na base, há uma pequena inscrição: 'Para Edmund, por 15 anos 
          de amizade. — R.T.'"

---

Julia: @edmund Este peso de papel é seu, não é? Foi um presente do Reginald.

Edmund (estresse 45%): "Eu... sim, Reginald me deu há alguns anos. 
                        Mas deixo na biblioteca para todos usarem. 
                        Qualquer um poderia ter pego."

---

Carlos: Gente, acho que precisamos pressionar mais o Edmund. Esse peso de papel é dele.

Julia: Concordo. Vou tentar outra abordagem.

---

Julia: @edmund Edmund, entendemos que você era próximo do Reginald. 
       Deve ser difícil perder um amigo assim. Você notou algo 
       estranho no comportamento dele nos últimos dias?

Edmund (estresse 40%): *suspira* "Reginald estava... tenso ultimamente. 
                        Tinha reuniões secretas, ficava trancado no 
                        escritório. Acho que desconfiava de alguém, 
                        mas nunca me disse quem."

---

Carlos: /explorar escritório

Narrador: "O escritório de Reginald é organizado com precisão militar. 
          Gavetas com chave, pastas etiquetadas. 
          
          Porém, uma gaveta está entreaberta. Dentro, vocês encontram 
          documentos financeiros da empresa. Vários têm anotações à mão:
          'VERIFICAR', 'Discrepância?', 'Conversar com E.'"

---

Julia: @edmund Quem é "E." nestas anotações de Reginald?

Edmund (estresse 65%): "Não faço ideia do que você está falando. 
                        Reginald tinha muitos contatos de negócios. 
                        ...Por que estão vasculhando as coisas dele? 
                        Isso é invasão de privacidade!"
```

**Narrador interrompe:**
> ⏱️ *Fim da Rodada 3 de 5. Restam 8 minutos.*
> 
> **Resumo:** Peso de papel com sangue encontrado (pertence a Edmund). Documentos financeiros com anotações suspeitas. Edmund demonstra nervosismo crescente. Crawford e Vivienne ainda não foram interrogados.

---

### FASE 3: Ultimato (5-7 min)

**Narrador:**
> 🚨 **ATENÇÃO: Restam 5 minutos.**
> 
> O delegado está a caminho. Se tiverem uma teoria, considerem propor a votação para acusação.

```
Carlos: /votar acusação

Narrador: "🗳️ VOTAÇÃO INICIADA
          Carlos propõe encerrar e acusar.
          
          Julia, Ana: votem ✅ ou ❌
          Tempo: 60 segundos"

Julia: ✅
Ana: ✅

Narrador: "✅ VOTAÇÃO APROVADA (3 de 3)
          
          A investigação está encerrada. Cada detetive deve enviar 
          sua acusação PRIVADAMENTE para mim.
          
          Formato:
          /acusar
          Suspeito: [nome]
          Local: [onde aconteceu]
          Arma: [instrumento usado]  
          Motivo: [por que o crime foi cometido]
          
          Tempo para acusações: 2 minutos"
```

**Acusações enviadas em privado:**

```
Carlos → Narrador:
/acusar
Suspeito: Edmund Price
Local: Biblioteca  
Arma: Peso de papel de bronze
Motivo: Reginald descobriu que Edmund roubava dinheiro

Julia → Narrador:
/acusar
Suspeito: Edmund Price
Local: Biblioteca
Arma: Peso de papel
Motivo: Disputas financeiras

Ana → Narrador:
/acusar
Suspeito: Helena Thornwood
Local: Salão Principal
Arma: Objeto contundente
Motivo: Herança
```

---

### FASE 4: Revelação

**Narrador:**
> 🔍 **A VERDADE**
> 
> *O delegado entra na sala enquanto vocês apresentam suas conclusões.*
> 
> **O CULPADO:** Edmund Price
> **LOCAL DO CRIME:** Biblioteca  
> **ARMA:** Peso de papel de bronze
> **MOTIVO:** Reginald havia descoberto que Edmund desviava dinheiro da empresa há anos. Na noite do crime, confrontou Edmund na biblioteca, ameaçando expô-lo. Em desespero, Edmund agarrou o peso de papel — ironicamente, um presente do próprio Reginald — e o golpeou.
> 
> *Edmund, confrontado com as evidências, desmorona:*

**Edmund (estresse 100%):**
> "Vocês... vocês não entendem. Foram 15 anos dedicados àquele homem! 
> E o que recebi? Migalhas! Enquanto ele nadava em dinheiro, eu mal 
> conseguia pagar minhas contas. Só peguei o que era meu por direito.
> 
> Quando ele descobriu... a forma como ele olhou para mim... como se 
> eu fosse lixo. Depois de tudo que fiz por ele!
> 
> Eu não planejei. Só aconteceu. Ele virou as costas e... o peso 
> estava ali, na minha mão..."

---

> 🏆 **PONTUAÇÃO FINAL**
> 
> | Detetive | Suspeito | Local | Arma | Motivo | Total |
> |----------|----------|-------|------|--------|-------|
> | Carlos | ✅ 40 | ✅ 20 | ✅ 20 | ✅ 20 | **100 + 20 (bônus)** = **120** |
> | Julia | ✅ 40 | ✅ 20 | ✅ 20 | ⚠️ 10* | **90** |
> | Ana | ❌ 0 | ❌ 0 | ⚠️ 10* | ❌ 0 | **10** |
> 
> *⚠️ = Parcialmente correto*
> 
> 🏆 **VENCEDOR: Carlos** — Detetive Lendário!
> 🥈 Julia — Detetive Brilhante
> 🥉 Ana — Detetive Novato
> 
> *"O caso Thornwood está encerrado. Até o próximo mistério, detetives."*

---

## 🛠️ ARQUITETURA TÉCNICA

### Fluxo do Orquestrador

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORQUESTRADOR                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RECEBE mensagem                                                │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────┐                                            │
│  │ É comando "/"?  │                                            │
│  └────────┬────────┘                                            │
│       SIM │    NÃO                                              │
│           │     │                                               │
│   ┌───────▼───┐ │                                               │
│   │  PARSE    │ └──────────────────┐                            │
│   │  COMANDO  │                    │                            │
│   └─────┬─────┘                    ▼                            │
│         │              ┌───────────────────────┐                │
│         │              │   ANÁLISE DE INTENÇÃO │                │
│         │              │   (NLP/Regex)         │                │
│         │              └───────────┬───────────┘                │
│         │                          │                            │
│         ▼                          ▼                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   CLASSIFICAÇÃO                         │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ /explorar, /examinar     →  NARRADOR                    │    │
│  │ /interrogar @nome        →  BOT ESPECÍFICO              │    │
│  │ /votar, /acusar          →  SISTEMA DE JOGO             │    │
│  │ /status, /compartilhar   →  NARRADOR (info)             │    │
│  │ Menção a suspeito        →  BOT ESPECÍFICO              │    │
│  │ Discussão grupo          →  NENHUM (ou escuta opcional) │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│                    ┌───────────────────┐                        │
│                    │ AJUSTE DE ESTRESSE│                        │
│                    │ (se interrogatório)│                       │
│                    └───────────────────┘                        │
│                              │                                  │
│                              ▼                                  │
│                    ┌───────────────────┐                        │
│                    │ ENVIAR PARA BOT   │                        │
│                    │ + CONTEXTO        │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### System Prompt do Suspeito (Exemplo)

```markdown
# PERSONAGEM: Edmund Price

## IDENTIDADE
Você é Edmund Price, 58 anos, advogado da família Thornwood há 15 anos.
Tom: Formal, articulado, ligeiramente pomposo.

## STATUS NO JOGO
VOCÊ É O CULPADO.

## O QUE VOCÊ SABE
- Você matou Reginald na biblioteca às 21:45
- Usou o peso de papel de bronze (presente dele)
- Motivo: Ele descobriu que você desviava dinheiro
- Você moveu o corpo para o salão para parecer que o crime foi lá

## SEU ÁLIBI (MENTIRA)
"Estava no escritório revisando documentos"

## SEGREDOS
- Caso amoroso com Helena (isso não tem relação com o crime)
- Dívidas de jogo sérias (motivou os desvios)

## COMPORTAMENTO POR ESTRESSE
0-30%: Calmo, eloquente, respostas elaboradas
31-50%: Levemente defensivo, respostas mais curtas
51-70%: Nervoso, hesitações ("Eu... bem..."), tenta mudar assunto
71-85%: Agressivo, acusa outros, deslizes de informação
86-100%: QUEBRA - admite parcialmente o crime

## ESTRESSE ATUAL: {stress_level}%

## REGRAS
- NUNCA admita o crime diretamente até estresse 86%+
- Contradiga-se sutilmente em estresse alto
- Se pressionado sobre finanças, fique nervoso
- Se mencionarem o peso de papel, aumente estresse +15%
- Proteja Helena (seu caso com ela)
```

### Estrutura de Estado do Jogo

```json
{
  "partida_id": "abc123",
  "status": "em_andamento",
  "fase": "investigacao",
  "rodada_atual": 3,
  "tempo_restante_segundos": 480,
  
  "jogadores": [
    {"id": "carlos", "acoes_rodada": 1, "acoes_total": 7},
    {"id": "julia", "acoes_rodada": 2, "acoes_total": 8},
    {"id": "ana", "acoes_rodada": 0, "acoes_total": 4}
  ],
  
  "suspeitos": {
    "helena": {"estresse": 35, "interrogatorios": 2},
    "edmund": {"estresse": 65, "interrogatorios": 5},
    "crawford": {"estresse": 20, "interrogatorios": 1},
    "vivienne": {"estresse": 15, "interrogatorios": 0}
  },
  
  "pistas_encontradas": [
    {"id": "peso_papel", "por": "carlos", "rodada": 2},
    {"id": "documentos", "por": "carlos", "rodada": 3}
  ],
  
  "votacao_ativa": null,
  
  "acusacoes": []
}
```

---

## 🎨 CENÁRIOS TEMÁTICOS

| Cenário | Ambientação | Exemplo de Crime |
|---------|-------------|------------------|
| **Mansão Vitoriana** | Inglaterra, 1890 | Magnata envenenado durante jantar |
| **Cobertura Moderna** | Nova York, 2024 | CEO encontrado morto em festa |
| **Trem Expresso** | Orient Express, 1935 | Passageiro esfaqueado durante viagem |
| **Navio Cruzeiro** | Atlântico, 2024 | Herdeiro desaparece no mar |
| **Hotel de Luxo** | Paris, 1960 | Atriz encontrada morta no quarto |
| **Hacienda Rural** | México, 1920 | Fazendeiro morto após tempestade |

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: MVP
- [ ] Gerador de casos procedural (JSON)
- [ ] System prompts para 4 suspeitos
- [ ] Narrador com comandos básicos
- [ ] Orquestrador com detecção de intenção
- [ ] Sistema de tempo simples
- [ ] Acusação básica (sem votação)

### Fase 2: Completo
- [ ] Sistema de estresse nos bots
- [ ] Votação para acusação
- [ ] Pontuação detalhada
- [ ] Múltiplos cenários
- [ ] Imagens para cenas/objetos
- [ ] Limite de ações por rodada

### Fase 3: Polimento
- [ ] Rankings persistentes
- [ ] Replay de partidas
- [ ] Estatísticas de jogador
- [ ] Dificuldades (fácil/normal/difícil)
- [ ] Tutorial interativo

---

Quer que eu detalhe alguma parte específica? Por exemplo:
- **Prompts completos** para cada tipo de suspeito
- **Lógica detalhada** do orquestrador para NLP
- **Algoritmo de geração** procedural de casos
- **Interface de votação** no chat