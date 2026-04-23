/* script/utils.js */
export const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export const getPlayerColor = (playerId) => {
    const colors = {
        'miguel': '#10b981',
        'sophia': '#8b5cf6',
        'papai': '#374151'
    };
    return colors[playerId] || '#3b82f6';
};
