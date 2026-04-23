/* script/firebase-service.js */
import { initializeApp } from 'firebase/app';
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
    serverTimestamp,
    getDoc,
    getDocs,
    where
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const ROOM_ID = "PRINCIPAL"; // Sala única para simplificar como pedido

// Inicializar sala se não existir
export const initRoom = async () => {
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
            meeting: { enabled: false, link: "", updatedAt: Date.now() },
            createdAt: serverTimestamp()
        });
    }
};

export const listenToRoom = (callback) => {
    return onSnapshot(doc(db, "rooms", ROOM_ID), (snapshot) => {
        if (snapshot.exists()) callback(snapshot.data());
    });
};

export const updateRoom = async (data) => {
    const roomRef = doc(db, "rooms", ROOM_ID);
    await updateDoc(roomRef, data);
};

// Messaging
export const sendMessage = async (chatId, senderId, senderName, text) => {
    const messagesRef = collection(db, "rooms", ROOM_ID, "messages");
    await addDoc(messagesRef, {
        chatId,
        senderId,
        senderName,
        text,
        createdAt: serverTimestamp()
    });
};

export const listenToMessages = (chatId, callback) => {
    const messagesRef = collection(db, "rooms", ROOM_ID, "messages");
    const q = query(
        messagesRef, 
        where("chatId", "==", chatId),
        orderBy("createdAt", "asc"),
        limit(50)
    );
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(msgs);
    });
};

// Private Hands
export const updatePrivateHand = async (playerId, card) => {
    const handRef = doc(db, "rooms", ROOM_ID, "privateHands", playerId);
    await setDoc(handRef, {
        playerId,
        card,
        updatedAt: serverTimestamp()
    });
};

export const listenToPrivateHand = (playerId, callback) => {
    return onSnapshot(doc(db, "rooms", ROOM_ID, "privateHands", playerId), (snapshot) => {
        if (snapshot.exists()) callback(snapshot.data());
    });
};

// Players
export const updatePlayerStatus = async (playerId, data) => {
    const playerRef = doc(db, "rooms", ROOM_ID, "players", playerId);
    await setDoc(playerRef, {
        id: playerId,
        ...data,
        joinedAtMs: Date.now()
    }, { merge: true });
};

export const listenToPlayers = (callback) => {
    return onSnapshot(collection(db, "rooms", ROOM_ID, "players"), (snapshot) => {
        const players = snapshot.docs.map(doc => doc.data());
        callback(players);
    });
};

// Scores
export const addScore = async (playerId, playerName, round, points) => {
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
};

export const listenToScoreHistory = (callback) => {
    const historyRef = collection(db, "rooms", ROOM_ID, "scoreHistory");
    const q = query(historyRef, orderBy("timestamp", "desc"), limit(30));
    return onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(history);
    });
};
