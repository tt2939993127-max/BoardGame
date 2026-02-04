export const MAX_CHAT_LENGTH = 200;

export const sanitizeChatText = (raw: string): string | null => {
    const text = raw.trim();
    if (!text) {
        return null;
    }
    if (text.length > MAX_CHAT_LENGTH) {
        return null;
    }
    return text;
};
