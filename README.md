# Quem Sou Eu? Online

App web mobile-first para jogar o clássico jogo de adivinhação em família durante chamadas de video.

## 🚀 Como Configurar o Firebase

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

## 🎮 Como Jogar

1.  **Papai** entra em `papai.html` (usa a senha).
2.  **Miguel** entra em `miguel.html`.
3.  **Sophia** entra em `sophia.html`.
4.  Papai clica em **Gerar Cartas**. Cada filho clica em "Ver Carta" no seu celular.
5.  Papai cola o link do **Google Meet** e clica em **Ativar**. O botão aparecerá para os filhos.
6.  Papai inicia o **Cronômetro** e começa a rodada!
