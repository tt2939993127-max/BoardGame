export const isTextEntryElement = (candidate: Element | null): candidate is HTMLElement => {
    if (typeof HTMLElement === 'undefined' || !(candidate instanceof HTMLElement)) {
        return false;
    }

    const contentEditableAttr = candidate.getAttribute('contenteditable');
    if (
        candidate.isContentEditable
        || contentEditableAttr === ''
        || contentEditableAttr?.toLowerCase() === 'true'
        || contentEditableAttr?.toLowerCase() === 'plaintext-only'
    ) {
        return true;
    }

    const tagName = candidate.tagName.toLowerCase();
    if (tagName === 'textarea') {
        const textarea = candidate as HTMLTextAreaElement;
        return !textarea.readOnly && !textarea.disabled;
    }

    if (tagName !== 'input') {
        return false;
    }

    const input = candidate as HTMLInputElement;
    if (input.readOnly || input.disabled) {
        return false;
    }

    const blockedTypes = new Set([
        'button',
        'checkbox',
        'color',
        'file',
        'hidden',
        'image',
        'radio',
        'range',
        'reset',
        'submit',
    ]);
    return !blockedTypes.has(input.type.toLowerCase());
};

export const scrollTextEntryIntoView = (
    candidate: Element | null,
    behavior: ScrollBehavior = 'smooth',
) => {
    if (!isTextEntryElement(candidate)) {
        return false;
    }

    candidate.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior,
    });
    return true;
};
