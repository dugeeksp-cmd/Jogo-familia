/* script/firebase-service.js */
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signInAnonymously,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    updateDoc, 
    setDoc, 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    where,
    limit, 
    serverTimestamp,
    getDoc,
    getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        throw error;
    }
};

export const loginAnonymously = async () => {
    try {
        const result = await signInAnonymously(auth);
        console.log("[AUTH] Login anônimo realizado com sucesso:", result.user.uid);
        return result.user;
    } catch (error) {
        console.error("[AUTH] Erro ao fazer login anônimo:", error);

        if (error.code === "auth/admin-restricted-operation") {
            console.error(
                "[AUTH] O login anônimo está bloqueado/desativado no Firebase. " +
                "Ative em: Firebase Console > Authentication > Sign-in method > Anonymous > Enable"
            );
        }

        throw error;
    }
};

export const loginWithEmail = async (email, password) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        console.log("[AUTH] Login realizado com sucesso:", result.user.email);
        return result.user;
    } catch (error) {
        console.error("[AUTH] Erro ao fazer login com e-mail:", error);
        throw error;
    }
};

// --- GUEST AUTH & PROFILE ---

const GUEST_USERS_COL = "guestUsers";
const USERNAMES_COL = "usernames";

const generateRandomColor = () => {
    const colors = [
        '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', 
        '#ef4444', '#06b6d4', '#f97316', '#a855f7', '#14b8a6'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

export const signUpGuest = async (username, email, password) => {
    try {
        const cleanUsername = username.toLowerCase().trim();
        
        // 0. Check if username is already taken
        const usernameRef = doc(db, USERNAMES_COL, cleanUsername);
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists()) {
            throw new Error("Este nome de usuário já está em uso.");
        }

        // 1. Create user in Auth
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        const chatColor = generateRandomColor();
        const profile = {
            uid: user.uid,
            username: cleanUsername,
            email: email,
            displayName: username,
            role: "guest",
            chatColor: chatColor,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // 2. Save profile in Firestore
        try {
            await setDoc(doc(db, GUEST_USERS_COL, user.uid), profile);
        } catch (e) {
            console.error("[Firestore] Erro ao criar perfil:", e);
            handleFirestoreError(e, 'create', `${GUEST_USERS_COL}/${user.uid}`);
        }

        // 3. Save username index
        try {
            await setDoc(usernameRef, {
                uid: user.uid,
                email: email,
                username: cleanUsername
            });
        } catch (e) {
            console.error("[Firestore] Erro ao criar index de username:", e);
            handleFirestoreError(e, 'create', `${USERNAMES_COL}/${cleanUsername}`);
        }

        return user;
    } catch (error) {
        console.error("[Firebase] Erro no cadastro de convidado:", error);
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("Este e-mail já está cadastrado.");
        }
        if (error.code === 'auth/invalid-email') {
            throw new Error("O e-mail fornecido é inválido.");
        }
        if (error.code === 'auth/weak-password') {
            throw new Error("A senha é muito fraca (use pelo menos 6 caracteres).");
        }
        throw error;
    }
};

export const loginWithUsernameOrEmail = async (login, password) => {
    try {
        let email = login;

        // If it's not an email, assume it's a username and look it up
        if (!login.includes('@')) {
            const usernameDoc = await getDoc(doc(db, USERNAMES_COL, login.toLowerCase().trim()));
            if (usernameDoc.exists()) {
                email = usernameDoc.data().email;
            } else {
                throw new Error("Usuário não encontrado.");
            }
        }

        return await loginWithEmail(email, password);
    } catch (error) {
        console.error("[Firebase] erro no login:", error);
        throw error;
    }
};

export const syncGoogleGuestProfile = async (user) => {
    try {
        const profileRef = doc(db, GUEST_USERS_COL, user.uid);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
            const chatColor = generateRandomColor();
            const profile = {
                uid: user.uid,
                username: user.email.split('@')[0].toLowerCase(),
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                role: "guest",
                chatColor: chatColor,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            await setDoc(profileRef, profile);
            
            // Also update usernames index
            await setDoc(doc(db, USERNAMES_COL, profile.username), {
                uid: user.uid,
                email: user.email,
                username: profile.username
            });
        } else {
            await updateDoc(profileRef, { updatedAt: serverTimestamp() });
        }
        return (await getDoc(profileRef)).data();
    } catch (error) {
        console.error("[Firebase] Erro ao sincronizar perfil Google:", error);
        throw error;
    }
};

export const getGuestProfile = async (uid) => {
    try {
        const docSnap = await getDoc(doc(db, GUEST_USERS_COL, uid));
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("[Firebase] erro ao pegar perfil:", error);
        return null;
    }
};

export const onAuth = (callback) => {
    return onAuthStateChanged(auth, callback);
};

const ROOM_ID = "PRINCIPAL"; // Sala única para simplificar como pedido

async function testConnection() {
    try {
        // Test with a non-existent doc just to check connectivity
        await getDocFromServer(doc(db, 'rooms', 'test-connection'));
    } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration or connection.");
        }
    }
}
testConnection();

// Inicializar sala se não existir
export const initRoom = async () => {
    try {
        const roomRef = doc(db, "rooms", ROOM_ID);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
            await setDoc(roomRef, {
                code: ROOM_ID,
                status: "waiting",
                parentPlayerId: "papai",
                gameStarted: false,
                roundNumber: 1,
                timer: { durationSeconds: 60, isRunning: false, startedAtMs: null, endsAtMs: null },
                filters: { difficulty: "all", category: "all", blockedCards: [] },
                meeting: { enabled: false, link: "", updated_at: Date.now() },
                createdAt: serverTimestamp()
            });
            console.log("Sala inicializada com sucesso.");
        }
    } catch (e) {
        console.error("Erro ao inicializar sala:", e);
        handleFirestoreError(e, 'write', `rooms/${ROOM_ID}`);
    }
};

export const listenToRoom = (callback) => {
    return onSnapshot(doc(db, "rooms", ROOM_ID), (snapshot) => {
        if (snapshot.exists()) callback(snapshot.data());
    });
};

export const updateRoom = async (data) => {
    try {
        const roomRef = doc(db, "rooms", ROOM_ID);
        await updateDoc(roomRef, data);
    } catch (e) {
        handleFirestoreError(e, 'update', `rooms/${ROOM_ID}`);
    }
};

// Guesses
export const sendGuess = async (playerId, playerName, guessText) => {
    try {
        const guessRef = collection(db, "rooms", ROOM_ID, "guesses");
        await addDoc(guessRef, {
            playerId,
            playerName,
            text: guessText,
            status: "pending",
            createdAt: serverTimestamp()
        });
    } catch (e) {
        handleFirestoreError(e, 'create', `rooms/${ROOM_ID}/guesses`);
    }
};

export const listenToGuesses = (callback) => {
    const guessRef = collection(db, "rooms", ROOM_ID, "guesses");
    const q = query(guessRef, orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const guesses = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(g => g.status === "pending"); // Filtro no cliente
        callback(guesses);
    });
};

export const respondToGuess = async (guessId, isCorrect) => {
    try {
        const guessRef = doc(db, "rooms", ROOM_ID, "guesses", guessId);
        await updateDoc(guessRef, {
            status: isCorrect ? "correct" : "wrong",
            respondedAt: serverTimestamp()
        });
    } catch (e) {
        handleFirestoreError(e, 'update', `rooms/${ROOM_ID}/guesses/${guessId}`);
    }
};

// Messaging
export const sendMessage = async (chatId, senderId, senderName, text, extra = {}) => {
    try {
        console.log(`[Firebase] Enviando mensagem para ${chatId}: "${text}"`);

        const { senderRole = 'guest', senderColor = '#f59e0b' } = extra;

        if (!chatId || !senderId || !senderName || !text.trim()) {
            throw new Error("Dados inválidos para envio de mensagem");
        }

        // Security check for family chat
        if (senderRole === 'guest' && chatId === 'family') {
            console.error("[Security] Convidados não podem enviar para o chat da família.");
            return;
        }

        const messagesRef = collection(db, "rooms", ROOM_ID, "messages");

        await addDoc(messagesRef, {
            chatId,
            senderId,
            senderName,
            senderRole,
            senderColor,
            text: text.trim(),
            createdAt: serverTimestamp(),
            createdAtMs: Date.now()
        });

    } catch (e) {
        console.error("[Firebase] Erro ao enviar mensagem:", e);
        handleFirestoreError(e, "create", `rooms/${ROOM_ID}/messages`);
    }
};

export const listenToMessages = (chatId, callback, errorCallback) => {
    console.log(`[Firebase] Iniciando listener para chat: ${chatId}`);

    if (!chatId) {
        console.error("[Firebase] listenToMessages chamado sem chatId");
        return () => {};
    }

    const messagesRef = collection(db, "rooms", ROOM_ID, "messages");

    const q = query(
        messagesRef,
        where("chatId", "==", chatId),
        orderBy("createdAtMs", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        console.log(`[Firebase] Snapshot recebido para ${chatId}. Total docs: ${snapshot.docs.length}`);

        const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        callback(msgs);

    }, (error) => {
        console.error(`[Firebase] Erro CRÍTICO no listener de mensagens para ${chatId}:`, error);

        if (error.code === "failed-precondition") {
            console.error("[Firebase] Provável índice ausente no Firestore. O chat pode não funcionar até que o índice seja criado.");
        }

        if (errorCallback) errorCallback(error);
        else handleFirestoreError(error, "list", `rooms/${ROOM_ID}/messages (chatId=${chatId})`);
    });
};

// Private Hands
export const updatePrivateHand = async (playerId, card) => {
    try {
        const handRef = doc(db, "rooms", ROOM_ID, "privateHands", playerId);
        await setDoc(handRef, {
            playerId,
            card,
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        handleFirestoreError(e, 'write', `rooms/${ROOM_ID}/privateHands/${playerId}`);
    }
};

export const listenToPrivateHand = (playerId, callback) => {
    return onSnapshot(doc(db, "rooms", ROOM_ID, "privateHands", playerId), (snapshot) => {
        if (snapshot.exists()) callback(snapshot.data());
    });
};

export const listenToAllHands = (callback) => {
    return onSnapshot(collection(db, "rooms", ROOM_ID, "privateHands"), (snapshot) => {
        const hands = snapshot.docs.map(doc => doc.data());
        callback(hands);
    });
};

// Players
export const updatePlayerStatus = async (playerId, data) => {
    try {
        const playerRef = doc(db, "rooms", ROOM_ID, "players", playerId);
        await setDoc(playerRef, {
            id: playerId,
            ...data,
            joinedAtMs: Date.now()
        }, { merge: true });
    } catch (e) {
        handleFirestoreError(e, 'write', `rooms/${ROOM_ID}/players/${playerId}`);
    }
};

export const updatePlayer = async (playerId, data) => {
    try {
        const playerRef = doc(db, "rooms", ROOM_ID, "players", playerId);
        await updateDoc(playerRef, data);
    } catch (e) {
        handleFirestoreError(e, 'update', `rooms/${ROOM_ID}/players/${playerId}`);
    }
};

export const listenToPlayers = (callback) => {
    return onSnapshot(collection(db, "rooms", ROOM_ID, "players"), (snapshot) => {
        const players = snapshot.docs.map(doc => doc.data());
        callback(players);
    });
};

// Scores
export const addScore = async (playerId, playerName, round, points) => {
    try {
        // 1. Add to history
        const historyRef = collection(db, "rooms", ROOM_ID, "scoreHistory");
        await addDoc(historyRef, {
            playerId,
            playerName,
            round,
            points,
            timestamp: serverTimestamp()
        });

        // 2. Update player total score
        const playerRef = doc(db, "rooms", ROOM_ID, "players", playerId);
        const playerSnap = await getDoc(playerRef);
        const currentScore = playerSnap.exists() ? (playerSnap.data().score || 0) : 0;
        
        await updateDoc(playerRef, {
            score: currentScore + points
        });
    } catch (e) {
        handleFirestoreError(e, 'write', `rooms/${ROOM_ID}/scoreHistory`);
    }
};

export const listenToScoreHistory = (callback) => {
    const historyRef = collection(db, "rooms", ROOM_ID, "scoreHistory");
    const q = query(historyRef, orderBy("timestamp", "desc"), limit(30));
    return onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(history);
    });
};

export function handleFirestoreError(error, operationType, path = null) {
    if (error.code === 'permission-denied') {
        const user = auth.currentUser;
        const errorInfo = {
            error: error.message,
            operationType,
            path,
            authInfo: {
                userId: user?.uid || 'anonymous',
                email: user?.email || 'N/A',
                emailVerified: user?.emailVerified || false,
                isAnonymous: user?.isAnonymous || true,
                providerInfo: user?.providerData.map(p => ({
                    providerId: p.providerId,
                    displayName: p.displayName || '',
                    email: p.email || ''
                })) || []
            }
        };
        throw new Error(JSON.stringify(errorInfo));
    }
    throw error;
}
