# 📜 Quem Sou Eu? Online — Documentação Técnica & Guia do Sistema

Seja bem-vindo à documentação oficial do **Quem Sou Eu? Online**. Este documento foi projetado de forma modular, incremental e profissional para servir tanto como um guia completo para apresentação do ecossistema a investidores ou terceiros, quanto como um guia prático de referência técnica para manutenção rápida do código.

---

## 📌 1. Visão Geral do Sistema

O **Quem Sou Eu? Online** é um aplicativo web interativo, responsivo e com arquitetura *mobile-first*, projetado especificamente para aproximar familiares através de sessões divertidas de jogos de adivinhação de cartas. 

### 🎯 Propósito e Conectividade Familiar
O projeto foi idealizado e desenvolvido por **Eduardo Lima** em homenagem aos seus filhos, **Sophia** e **Miguel**. 
- **O Desafio:** Manter o engajamento e a diversão ativa entre pais e filhos à distância durante chamadas de vídeo (como Google Meet).
- **A Solução:** Um jogo interativo sincronizado em tempo real. Cada participante se conecta do seu próprio dispositivo, enquanto jogam o clássico jogo de adivinhação de cartas na testa (*"Quem Sou Eu?"*).
- **A Experiência:** Enquanto um jogador faz perguntas de "Sim" ou "Não" para adivinhar a carta secreta atribuída à sua cabeça, os demais visualizam e o guiam. O fluxo lúdico é controlado diretamente com pontuação, sons interativos e cronômetro de turnos.

---

## 🏗️ 2. Arquitetura e Tecnologias

O sistema é construído sobre uma arquitetura híbrida e otimizada (Frontend Single-Page App reativo + Backend utilitário minimalista de persistência em Node/Express) estruturado para rodar perfeitamente em servidores de hospedagem modernos e integrável com serviços na nuvem da plataforma Firebase.

```
       ┌────────────────────────────────────────────────────────┐
       │                                                        │
       │                   Navegadores Clientes                 │
       │     (papai.html, sophia.html, miguel.html, jogo.html)  │
       │                                                        │
       └───────┬────────────────────────┬───────────────────────┘
               │ Websockets             │ chamadas HTTP
               │ (Tempo Real)           │ (Validações / Logs)
               ▼                        ▼
       ┌────────────────┐       ┌────────────────────────┐
       │                │       │     Express Server     │
       │    Firebase    │       │       (server.ts)      │
       │   Firestore    │       │                        │
       │  & Auth Cloud  │       │ Regrava relatórios em  │
       │                │       │  validated_tests.json  │
       └────────────────┘       └────────────────────────┘
```

### 🛠️ Tecnologias Utilizadas
- **Frontend Core:** HTML5, CSS3, JavaScript (ES6+), e estilização moderna via **Tailwind CSS**.
- **Servidor Backend:** Node.js, Express e TypeScript (`server.ts` compilado para CJS na pasta `dist`).
- **Banco de Dados em Tempo Real:** **Firebase Firestore** para manter mesas sincronizadas com latência ultrabaixa.
- **Autenticação de Usuários:** **Firebase Authentication** com suporte para credenciais híbridas (Login com Google para o Papai; E-mail e Senha para os filhos).
- **Efeitos de Áudio:** Efeitos sonoros gerados dinamicamente via **Web Audio API** no cliente (sem dependência de carregamento de arquivos externos).
- **Versionamento & Deploy:** Git, GitHub Repositories e automação de CI/CD por GitHub Actions.

### 📂 Estrutura de Diretórios e Componentes
O ecossistema é organizado de forma modular, separando as cascas HTML de visualização das lógicas lúdicas em diretórios claros:

```
├── .github/
│   └── workflows/
│       └── deploy.yml          # Pipeline automatizado de testes e deploy via FTP
├── script/
│   ├── audio.js                # Síntese sonora de efeitos (Sucesso, derrota, etc.)
│   ├── cards.js                # Banco de dados estático de cartas e categorias
│   ├── chat.js                 # Gerenciamento de múltiplas salas de chat (Família, Global)
│   ├── firebase-service.js     # Ponte unificada de API, Firestore e Auth
│   ├── index.js                # Lógica da tela inicial de login e validação de papéis
│   ├── jogo.js                 # Controlador geral do tabuleiro e visualização (jogo.html)
│   ├── lobby.js                # Interface adaptada de recepção para Miguel & Sophia
│   ├── papai.js                # Dashboard executivo de controle do Papai (papai.html)
│   ├── utils.js                # Auxiliares de embaralhamento e manipulação de DOM
│   ├── version-control.js      # Gerenciamento do histórico de lançamentos e modal de feedback
│   └── visitante.js            # Visão externa para público observador (visitante.html)
├── style/
│   └── app.css                 # Customização de temas e layouts responsivos
├── firestore.rules             # Regras de segurança robustas do Firestore
├── package.json                # Gerenciamento de dependências, scripts de build e TS
├── server.ts                   # Backend Express utilitário e server de produção
├── index.html                  # Terminal de acesso universal (Página de Entrada)
├── papai.html                  # Console Administrativo de Operação (Papai)
├── miguel.html / sophia.html   # Lobbys simplificados para as crianças
├── jogo.html                   # Arena de Partida Principal (Consolidada)
├── visitante.html              # Interface de visualização compartilhada
└── win.html                    # Tela celebrativa de fim de partida
```

### 🗄️ Estrutura de Documentos no Firestore
A sincronização global é mantida em tempo real utilizando a seguinte árvore lógica no Firestore:

| Caminho da Coleção/Documento | Descrição da Entidade de Dados |
| :--- | :--- |
| `rooms/{ROOM_ID}` | Estado mestres da sala de jogo (Tempo do cronômetro, quem é o jogador ativo, link do Meet, se está ocorrendo partida). |
| `rooms/{ROOM_ID}/players/{PLAYER_ID}` | Status de conexão do jogador (`online: true/false`), pontuação acumulada (`score`), foto e metadados. |
| `rooms/{ROOM_ID}/privateHands/{PLAYER_ID}` | Armazena a carta atual atribuída ao jogador (oculta da tela do próprio jogador e legível para adversários). |
| `rooms/{ROOM_ID}/messages/{MSG_ID}` | Registro de mensagens instantâneas filtradas em canais pelo atributo chave `chatId` (`global` ou `family`). |

---

## 🚦 3. Status Atual do Desenvolvimento

Esta seção sinaliza de forma clara o nível de maturidade do projeto e as próximas etapas planejadas para manter o ciclo de desenvolvimento incremental saudável:

### ✅ Já está Pronto e Funcional (Produção)
- **Painel Centralizado de Versão (v1.2.2):** Sistema unificado que injeta dinamicamente o modal de histórico e controle de validações em todas as telas, evitando duplicidade de lógicas HTML.
- **Autenticação Confiável:** Login isolado configurado no Firebase Auth. Miguel e Sophia acessam com credenciais simplificadas (`qwerty`), e o Papai com autenticação segura Google.
- **Segurança de Sala Sincronizada:** Exclusão automática de dados de salas vazias para preservação de largura de banda do banco Firestore.
- **Auto-Join em Partidas Ativas:** Garantia de que, se o usuário sofrer uma oscilação na rede e recarregar a tela em `jogo.html`, ele é reinserido na partida de forma transparente sem quebrar o tabuleiro.
- **Chat em Canais Paralelos:** Divisão inteligente em chat global ou chat fechado restrito à Família (Papai, Sophia e Miguel).
- **Mecanismo de Logs de Validação Estável:** Canal integrado de API (`/api/validate` e `/api/validated`) acoplado no Express, gravando relatos em texto e alteração de checkpoints em arquivo JSON integrado no servidor.

### 📋 Backlog / Próximas Atualizações (Ainda por Implementar)
- **Mecanismo de Desafios Customizados:** Permitir que os jogadores escrevam suas próprias opções ou adicionem itens extras de adivinhação fora do banco fixo.
- **Modo Co-Op de Equipes:** Criação de duplas para jogos com maior volume de familiares simultâneos.
- **Indicador Visual Avançado de Conexão Estável:** Alertas sutis no painel quando a rede de uma das crianças estiver apresentando latências de envio altas.

---

## 🚀 4. Fluxo de Trabalho e Deploy

O ciclo de entrega de código do aplicativo foi simplificado para ser eficiente, rápido e livre de intervenções manuais propensas a erros.

```
┌──────────────┐     git push      ┌──────────────┐   Dispara   ┌─────────────────┐
│ Desenvolvedor│ ────────────────> │ GitHub Repo  │ ------------> │ GitHub Actions  │
│  (Alteração) │                   │ (Branch main)│               │  (deploy.yml)   │
└──────────────┘                   └──────────────┘               └────────┬────────┘
                                                                           │
                                                                           │ 1. npm run build
                                                                           │ 2. FTP Sync
                                                                           ▼
                                                                 ┌─────────────────┐
                                                                 │ Servidor Web de │
                                                                 │   Hospedagem    │
                                                                 └─────────────────┘
```

### Processo de Atualização Prático
1. **Desenvolvimento Local / Modificações:** O desenvolvedor executa ou aplica os ajustes de código nos arquivos da plataforma.
2. **Commit e Envio:** Ao final das correções, é efetuado um commit com as alterações diretamente na branch principal (`main`) do GitHub.
3. **Execução do Workflow de Deploy:**
   O GitHub detecta a atualização na branch `main` e inicia imediatamente a rotina contida no arquivo `.github/workflows/deploy.yml`:
   - Instala o Node.js v20 e suas dependências.
   - Executa `npm run build` gerando um pacote estático de build otimizado na pasta `./dist/`.
   - Utiliza a Action `SamKirkland/FTP-Deploy-Action` para transferir os arquivos atualizados em `./dist/` de forma segura para o servidor de hospedagem.
4. **Segredos do GitHub (Secrets):**
   Todos os dados sensíveis do servidor FTP estão protegidos sob variáveis de ambiente no painel de configurações do repositório no GitHub:
   - `FTP_SERVER`: Endereço host do servidor FTP.
   - `FTP_USER`: Usuário com permissão de escrita.
   - `FTP_PASSWORD`: Senha estrita de transferência.
   - `FTP_DIR`: Caminho absolutizado da pasta pública (ex: `/public_html/quemsoueu/`).

---

## 🔧 5. Guia de Manutenção Futura

Para estender, manter ou debugar o aplicativo rapidamente sem quebrar funcionalidades legadas, siga este manual estruturado de procedimentos padrões de código:

### 🎮 Como Adicionar Mudanças no Histórico e Subir de Versão (Incrementos)
Toda a base de controle de alterações é centralizada no script `/script/version-control.js`.
1. Para declarar uma nova versão, navegue até a constante `VERSION_HISTORY` no topo e insira um novo bloco de histórico, alterando a variável `VERSION`:

```js
// Configuração em /script/version-control.js
const VERSION = "1.2.3"; // Altere para a nova numeração padrão

const VERSION_HISTORY = [
    {
        version: "1.2.3",
        status: "Atuais",
        color: "#4ade80",
        features: [
            "Novo: Descrição da nova feature inserida para as crianças.",
            "Fix: Detalhamento do ajuste efetuado neste release."
        ]
    },
    // Versões mais antigas devem ser movidas para baixo
];
```

2. Certifique-se também de atualizar o texto do botão de rodapé nos arquivos HTML (`index.html`, `papai.html`, `sophia.html`, `miguel.html`, `jogo.html`) de forma correspondente para garantir concordância em todos os acessos.

### 🃏 Como Adicionar Novas Cartas de Personagens ou Categorias
As opções de adivinhação estão armazenadas no arquivo unificado `/script/cards.js`.
1. Abra `/script/cards.js`.
2. Para adicionar itens na coleção global, localize a estrutura `CARD_BANK` e estenda o respectivo array de categorias (como `animais`, `pessoas`, `lugares`, `objetos`):

```js
export const CARD_BANK = {
    animais: [
        "Leão", "Elefante", "Golfinho",
        // Insira novos aqui
    ],
    // ...
};
```

### ⚡ Desenvolvimento Local e Execução do Servidor
Caso necessite rodar em seu próprio laptop ou ambiente de testes para pré-visualizar as rotas do backend que gravam os relatórios:
1. Certifique-se de possuir o Node.js v20+ configurado.
2. No terminal do projeto, execute o instalador:
   ```bash
   npm install
   ```
3. Inicie o servidor de testes:
   ```bash
   npm run dev
   ```
4. O servidor iniciará automaticamente executando o arquivo principal de orquestração `server.ts` combinando a compilação instantânea do Vite para uma experiência responsiva e sem problemas.

*(Documentação atualizada em: junho de 2026).*
