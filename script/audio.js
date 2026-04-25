/* script/audio.js */
const sounds = {
    timerEnd: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
    cardReveal: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    roundStart: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    wrong: 'https://assets.mixkit.co/active_storage/sfx/2205/2205-preview.mp3',
    timerWarning: 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    pop: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    success: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'
};

export const playSound = (soundName) => {
    try {
        const audio = new Audio(sounds[soundName]);
        audio.play().catch(e => console.warn("Audio play blocked", e));
    } catch (err) {
        console.error("Audio error", err);
    }
};
