# Security Specification - Herança Kids

## 1. Data Invariants
- A **Player** must have a valid `id`, `name`, and `role`.
- A **Room** is the root of all data; no subcollection can exist without its parent Room.
- **PrivateHands** are sensitive and should only be readable by the player owning them or the parent.
- **Messages** must always have a `chatId` and correspond to the room.
- **Guesses** have a state machine: `pending` -> `correct` | `wrong`. They cannot be modified once responded to.
- **ScoreHistory** entries are immutable once created.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing (Player ID)**: Attempt to create a player with an ID that doesn't match the URL path.
2. **State Shortcutting (Guess status)**: A player attempts to create a guess with `status: 'correct'`.
3. **Resource Poisoning (Room code)**: Attempt to create a room with a 1MB string as a code.
4. **Privilege Escalation (Score)**: A player attempts to directly update their own score without a `scoreHistory` entry.
5. **Unauthorized Read (PrivateHand)**: "Sophia" attempts to read "Miguel's" card text.
6. **Immutable Field Write (createdAt)**: Attempting to update a room's `createdAt` timestamp.
7. **Phantom Room Write**: Attempting to add a player to a room that doesn't exist.
8. **Shadow Field Injection**: Adding `isVerified: true` to a player document.
9. **Chat Hijacking**: A guest player attempts to send a message to a private chat they are not part of (e.g., `papai-miguel`).
10. **Admin Logic Bypass**: A normal player attempting to update the `gameObjective`.
11. **Timer Manipulation**: A player attempting to start/stop the timer.
12. **Malicious ID**: Creating a room with code `../rooms/other`.

## 3. Test Runner (Mock Logic)
The `firestore.rules.test.ts` will verify these scenarios.
