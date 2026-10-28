(() => {
    'use strict';
    // CSS viewport dimensions already include Windows scaling and browser zoom.
    // DPR is only a lower bound: never multiply the UI by it a second time.
    function interfaceScale(width, height, pixelRatio = 1) {
        const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
        if (!(width > 0 && height > 0)) return 1;
        const fit = Math.min(width / 1920, height / 1080);
        // Browser zoom can make a desktop viewport narrower than mobile breakpoints.
        const desktop = desktopPointer.matches || (width >= 900 && height >= 450 && width >= height);
        return desktop ? Math.max(1 / ratio, fit) : Math.max(1, fit);
    }
    const root = document.documentElement;
    const desktopPointer = matchMedia('(hover: hover) and (pointer: fine)');
    let scale = 1;
    function updateInterfaceScale() {
        const width = window.innerWidth, height = window.innerHeight;
        const next = interfaceScale(width, height, window.devicePixelRatio);
        const desktop = width / next > 900 && height / next > 700;
        const changed = next !== scale || root.hasAttribute('data-pavilion-desktop') !== desktop;
        scale = next;
        root.style.setProperty('--pavilion-ui-scale', String(scale));
        root.toggleAttribute('data-pavilion-desktop', desktop);
        if (changed) window.dispatchEvent(new Event('pavilion-ui-resize'));
    }
    window.PAVILION_UI = Object.freeze({ get scale() { return scale; } });
    window.addEventListener('resize', updateInterfaceScale);
    desktopPointer.addEventListener('change', updateInterfaceScale);
    function watchPixelRatio() {
        const query = matchMedia('(resolution: ' + window.devicePixelRatio + 'dppx)');
        query.addEventListener('change', () => { updateInterfaceScale(); watchPixelRatio(); }, { once: true });
    }
    updateInterfaceScale();
    watchPixelRatio();
})();
