/**
 * Checks if the user agent indicates an iOS device or a Mac with touch support (iPad).
 */
export const isIOSDevice = (navigator: Navigator, document: Document): boolean => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

/**
 * Toggles fullscreen mode.
 * Falls back to pseudo-fullscreen on iOS devices.
 */
export const toggleFullscreen = async (
    document: Document,
    navigator: Navigator,
    setIsFullscreen: (val: boolean) => void
): Promise<void> => {
    if (isIOSDevice(navigator, document)) {
        const body = document.body;
        if (body.classList.contains('ios-pseudo-fullscreen')) {
            body.classList.remove('ios-pseudo-fullscreen');
            setIsFullscreen(false);
        } else {
            body.classList.add('ios-pseudo-fullscreen');
            setIsFullscreen(true);
        }
    } else {
        if (!document.fullscreenElement) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (err: any) {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    }
};
