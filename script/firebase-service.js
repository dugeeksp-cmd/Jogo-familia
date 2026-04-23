/* script/firebase-service.js */
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signInAnonymously,
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
    limit, 
    limitToLast,
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
        return result.user;
    } catch (error) {
        console.error("Erro ao fazer login anônimo:", error);
        throw error;
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
export const sendMessage = async (chatId, senderId, senderName, text) => {
    try {
        const messagesRef = collection(db, "rooms", ROOM_ID, "messages");
        await addDoc(messagesRef, {
            chatId,
            senderId,
            senderName,
            text,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        handleFirestoreError(e, 'create', `rooms/${ROOM_ID}/messages`);
    }
};

export const listenToMessages = (chatId, callback) => {
    const messagesRef = collection(db, "rooms", ROOM_ID, "messages");
    // Removendo 'where' da query principal para evitar a necessidade de Índice Composto no Firestore.
    // Buscamos as últimas 100 mensagens da sala e filtramos por chatId no cliente.
    // Isso é seguro e performático para o volume deste aplicativo.
    const q = query(
        messagesRef, 
        orderBy("createdAt", "asc"),
        limitToLast(100)
    );
    
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const msgs = snapshot.docs
            .map(doc => {
                const data = doc.data();
                // Handling serverTimestamp being null in local cache
                return { 
                    id: doc.id, 
                    ...data,
                    createdAt: data.createdAt || { toDate: () => new Date() } 
                };
            })
            .filter(msg => msg.chatId === chatId); // Filtro no lado do cliente
        
        callback(msgs);
    }, (error) => {
        console.error(`Erro no listener de mensagens para ${chatId}:`, error);
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
