# Quem Sou Eu? Online

App web mobile-first para jogar o clássico jogo de adivinhação em família durante chamadas de video.

## 🚀 Configuração Crítica do Firebase

Para que o jogo funcione corretamente (Miguel, Sophia e Papai), você **PRECISA** garantir que os usuários e provedores estejam configurados no Console do Firebase:

1.  **Login com E-mail e Senha** (Para Miguel e Sophia):
    *   Vá em: **Firebase Console** > **Authentication** > **Sign-in method**.
    *   Clique em **Add new provider** e selecione **Email/Password**.
    *   Ative-o e salve.
    *   Vá na aba **Users** e crie os dois usuários abaixo (se já não existirem):
        *   `miguel@sabermidia.com.br` / Senha: `qwerty`
        *   `sophia@sabermidia.com.br` / Senha: `qwerty`

2.  **Login com Google** (Para o Papai):
    *   Vá em: **Firebase Console** > **Authentication** > **Sign-in method**.
    *   Clique em **Add new provider** e selecione **Google**.
    *   Ative-o, configure o e-mail de suporte e salve.

Sem essas configurações, o aplicativo não conseguirá autenticar os jogadores.

## 🛠️ Como Configurar o Firestore

1.  O app já está configurado com o Firestore.
2.  As regras foram implantadas para permitir leitura/escrita sincronizada.
3.  **Importante:** Se você estiver rodando em seu próprio ambiente Firebase, atualize o arquivo `firebase-applet-config.json` com suas credenciais.

## 🛠️ Customizações

-   **Senha do Papai:** No arquivo `script/index.js`, altere a constante `FIXED_PASSWORD`. (Senha padrão: `420933`).
-   **Imagem de Topo:** Na `index.html`, altere a URL no CSS da classe `.banner-img` ou o style inline se preferir.
-   **Duração do Cronômetro:** No `papai.html`, o tempo é controlado pelo painel. A duração padrão pode ser alterada no `script/firebase-service.js` na função `initRoom`.
-   **Cartas e Categorias:** Adicione ou remova itens no arquivo `script/cards.js`.

## 📁 Estrutura do Jogo no Firestore

-   `rooms/PRINCIPAL`: Documento principal com estado da sala, timer e reunião.
-   `rooms/PRINCIPAL/players/{id}`: Status online de cada jogador.
-   `rooms/PRINCIPAL/privateHands/{id}`: Carta atual do jogador (segurança por lógica de ID).
-   `rooms/PRINCIPAL/messages/{id}`: Coleção única para mensagens, filtrada por `chatId` no cliente (group, papai-miguel, papai-sophia).

## 🎮 Regras do Jogo 'Quem Sou Eu?'

O objetivo do game é adivinhar qual é o nome, animal, objeto ou lugar que está na sua "testa" (sua carta secreta) fazendo perguntas aos outros jogadores.

### Como Jogar
1.  **Acesso:** Papai entra em `papai.html` (senha padrão `420933`). Miguel, Sophia e Convidados entram pelas suas respectivas páginas.
2.  **Preparação:** Papai clica em **Gerar Cartas**. Cada jogador ouve um som e sua carta aparece desfocada na tela.
3.  **Sua Carta:** Você não deve ver sua própria carta! Ela é para que os outros saibam quem você é.
4.  **Seu Turno:** Quando for a sua vez (indicada pelo brilho verde e pelo cronômetro), você deve fazer perguntas de "Sim" ou "Não" para os outros para tentar descobrir seu personagem.
5.  **Cronômetro:** Você tem 60 segundos. Se o tempo acabar, a vez passa para o próximo.
6.  **Adivinhando:** Se você acha que sabe quem é, faça o seu palpite. Se acertar, o Papai registra seus pontos no painel!

### O Objetivo
Acumular o máximo de pontos adivinhando corretamente suas cartas!

---
