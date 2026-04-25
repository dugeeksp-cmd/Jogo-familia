/* script/version-control.js */
import { playSound } from './audio.js';

const VERSION = "1.2.2";

const VERSION_HISTORY = [
    {
        version: "1.2.2",
        status: "Atuais",
        color: "#4ade80",
        features: [
            "Novo: Controle de versão centralizado em todas as páginas.",
            "Fix: Entrada automática na sala de jogo.",
            "Fix: Correção no salvamento de validações (feedback melhorado).",
            "Fix: Relato de problemas agora confirma o envio."
        ]
    },
    {
        version: "1.2.1",
        status: "Validados",
        color: "#60a5fa",
        features: [
            "Novo: Botão para iniciar jogo disponível para Miguel e Sophia.",
            "Novo: Salar são excluídas automaticamente quando ficam vazias.",
            "Fix: Persistência e movimentação das validações no histórico."
        ]
    }
];

export function initVersionControl() {
    createVersionModal();
    setupVersionHooks();
}

function createVersionModal() {
    if (document.getElementById('version-modal')) return;

    const modalHtml = `
    <div id="version-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
        <div class="bg-gray-800 w-full max-w-md rounded-3xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-6 overflow-y-auto no-scrollbar">
                <h2 class="text-2xl font-black mb-6 flex items-center gap-3">
                    <span class="text-3xl">📜</span> Histórico de Versões
                </h2>
                
                <div id="version-items-container" class="flex flex-col gap-6">
                    <!-- Iterated below -->
                </div>

                <div id="validated-section" class="mt-8 pt-6 border-t border-white/5">
                    <h3 class="text-[10px] font-black text-green-500 uppercase tracking-widest mb-4">✓ JÁ VALIDADOS PELA FAMÍLIA</h3>
                    <div id="validated-list" class="space-y-2"></div>
                </div>
            </div>

            <div class="p-6 bg-gray-900/50 border-t border-white/5 space-y-3">
                <div id="correction-area" class="hidden bg-red-500/10 p-4 rounded-2xl border border-red-500/20 mb-2">
                    <label class="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-2">Relatar Nova Correção</label>
                    <textarea id="correction-text" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-red-500 min-h-[80px]" placeholder="O que não está funcionando?"></textarea>
                    <button id="send-correction-btn" class="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl font-bold text-xs mt-2 transition-all">Enviar Relato</button>
                    <div id="correction-success" class="hidden text-center py-2 text-green-500 font-bold text-xs animate-pulse">✓ Relato enviado com sucesso!</div>
                </div>
                
                <button id="add-correction-btn" class="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 p-3 rounded-xl font-bold text-xs transition-all tracking-tight">+ Adicionar Correção Necessária</button>
                <button id="save-version-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl font-black text-sm shadow-lg transition-all transform active:scale-95">Salvar Validação</button>
                <button id="close-version-btn" class="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 p-3 rounded-xl font-bold text-xs transition-all">Fechar</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Render Version Items
    const container = document.getElementById('version-items-container');
    VERSION_HISTORY.forEach(v => {
        const itemHtml = `
            <div class="version-item">
                <div class="flex justify-between items-center mb-3">
                    <strong style="color: ${v.color};" class="font-black text-lg">v${v.version}</strong>
                    <span class="text-[10px] font-black opacity-30 uppercase tracking-widest">${v.status}</span>
                </div>
                <ul class="version-list space-y-3" data-version="${v.version}">
                    ${v.features.map(f => `
                        <li class="flex items-start gap-3 group">
                            <input type="checkbox" class="v-check w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-900 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer" data-feat="${f}">
                            <span class="text-xs text-gray-400 leading-relaxed font-medium group-hover:text-gray-200 transition-colors">${f}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
    });
}

function setupVersionHooks() {
    const versionModal = document.getElementById('version-modal');
    const closeBtn = document.getElementById('close-version-btn');
    const saveBtn = document.getElementById('save-version-btn');
    const addCorrectionBtn = document.getElementById('add-correction-btn');
    const sendCorrectionBtn = document.getElementById('send-correction-btn');
    const correctionArea = document.getElementById('correction-area');
    const correctionText = document.getElementById('correction-text');
    const correctionSuccess = document.getElementById('correction-success');

    // Global listeners for any "v-btn" across the app
    const footerBtn = document.querySelector('[class*="version-btn"]') || document.getElementById('version-btn');
    
    if (footerBtn) {
        footerBtn.textContent = `Versão ${VERSION}`;
        footerBtn.style.opacity = "0.7";
        footerBtn.addEventListener('click', async () => {
            versionModal.classList.remove('hidden');
            await loadValidationHistory();
        });
    }

    closeBtn?.addEventListener('click', () => versionModal.classList.add('hidden'));

    addCorrectionBtn?.addEventListener('click', () => {
        correctionArea.classList.toggle('hidden');
        correctionSuccess.classList.add('hidden');
    });

    sendCorrectionBtn?.addEventListener('click', async () => {
        const text = correctionText.value.trim();
        if (!text) return;

        sendCorrectionBtn.disabled = true;
        sendCorrectionBtn.textContent = 'Enviando...';

        try {
            const resp = await fetch('/api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [`RELATO_${Date.now()}`]: text })
            });

            if (resp.ok) {
                playSound('success');
                correctionText.value = '';
                correctionSuccess.classList.remove('hidden');
                setTimeout(() => {
                    correctionArea.classList.add('hidden');
                    correctionSuccess.classList.add('hidden');
                }, 2000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            sendCorrectionBtn.disabled = false;
            sendCorrectionBtn.textContent = 'Enviar Relato';
        }
    });

    saveBtn?.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.v-check');
        const results = Array.from(checkboxes).map(cb => ({
            version: cb.closest('.version-list').dataset.version,
            feat: cb.dataset.feat,
            checked: cb.checked
        }));

        try {
            saveBtn.textContent = "Salvando...";
            saveBtn.disabled = true;

            const validatedData = {};
            results.forEach(item => {
                if (item.checked) validatedData[item.feat] = true;
            });

            const resp = await fetch('/api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validatedData)
            });

            if (resp.ok) {
                saveBtn.textContent = "✅ Validação Salva!";
                playSound('success');
                await loadValidationHistory();
            } else {
                throw new Error("Falha no servidor");
            }
        } catch (e) {
            console.error(e);
            saveBtn.textContent = "❌ Erro ao Salvar";
        } finally {
            setTimeout(() => {
                saveBtn.textContent = "Salvar Validação";
                saveBtn.disabled = false;
            }, 2000);
        }
    });
}

async function loadValidationHistory() {
    try {
        const res = await fetch('/api/validated');
        const history = await res.json();
        
        const checkboxes = document.querySelectorAll('.v-check');
        const validatedList = document.getElementById('validated-list');
        validatedList.innerHTML = '';
        
        checkboxes.forEach(cb => {
            const version = cb.closest('.version-list').dataset.version;
            const feat = cb.dataset.feat;
            const isCheck = (history[version] && history[version][feat]) || (history["current"] && history["current"][feat]);
            
            cb.checked = isCheck;
            
            if (isCheck) {
                const li = document.createElement('div');
                li.className = "flex items-center gap-2 group animate-in fade-in";
                li.innerHTML = `
                    <div class="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg class="w-2 h-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <span class="text-[10px] text-gray-500 line-through font-medium">${feat.replace('Fix:', '').replace('Novo:', '').trim()}</span>
                `;
                validatedList.appendChild(li);
                cb.parentElement.style.display = 'none';
            } else {
                cb.parentElement.style.display = 'flex';
            }
        });
    } catch (e) {
        console.error(e);
    }
}
