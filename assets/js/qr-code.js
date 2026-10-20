(function (global) {
    'use strict';

    // Shared text encoder and optional page widgets. No network requests are made.
    function encode(text) {
        if (typeof text !== 'string' || !text.length) throw new TypeError('Укажите текст для QR-кода.');
        const { QrCode, QrSegment } = global.qrcodegen;
        const segments = /[^\x00-\x7f]/.test(text)
            ? [QrSegment.makeEci(26), QrSegment.makeBytes(Array.from(new TextEncoder().encode(text)))]
            : QrSegment.makeSegments(text);
        return QrCode.encodeSegments(segments, QrCode.Ecc.MEDIUM);
    }

    function resolveLink(reference, base) {
        const url = new URL(reference, base);
        if (!['https:', 'http:'].includes(url.protocol)) throw new TypeError('Для запуска игры нужна HTTP(S)-ссылка.');
        return url.href;
    }

    function createSvg(text, label = 'QR-код') {
        const qr = encode(text), border = 4, size = qr.size + border * 2;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', label);
        svg.setAttribute('shape-rendering', 'crispEdges');
        const background = document.createElementNS(svg.namespaceURI, 'rect');
        background.setAttribute('width', '100%');
        background.setAttribute('height', '100%');
        background.setAttribute('fill', '#fff');
        const path = document.createElementNS(svg.namespaceURI, 'path'), runs = [];
        for (let y = 0; y < qr.size; y++) {
            for (let x = 0; x < qr.size;) {
                if (!qr.getModule(x, y)) { x++; continue; }
                const start = x;
                while (x < qr.size && qr.getModule(x, y)) x++;
                runs.push(`M${start + border},${y + border}h${x - start}v1h-${x - start}z`);
            }
        }
        path.setAttribute('fill', '#000');
        path.setAttribute('d', runs.join(''));
        svg.append(background, path);
        return svg;
    }

    let modal, modalTitle, modalGraphic, modalText, lastTrigger;
    function showLarge(text, label, trigger) {
        if (!modal) {
            modal = document.createElement('dialog');
            modal.className = 'qr-modal';
            modal.setAttribute('aria-labelledby', 'qr-modal-title');
            modalTitle = document.createElement('h2');
            modalTitle.id = 'qr-modal-title';
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'qr-close';
            close.textContent = 'Закрыть';
            close.addEventListener('click', () => modal.close());
            const header = document.createElement('div');
            header.className = 'qr-modal-header';
            header.append(modalTitle, close);
            modalGraphic = document.createElement('div');
            modalGraphic.className = 'qr-modal-graphic';
            modalText = document.createElement('p');
            modalText.className = 'qr-payload';
            modal.append(header, modalGraphic, modalText);
            document.body.append(modal);
            modal.addEventListener('click', event => {
                if (event.target !== modal) return;
                const rect = modal.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
            });
            modal.addEventListener('close', () => {
                if (lastTrigger?.isConnected) lastTrigger.focus();
            });
        }
        modalTitle.textContent = label;
        modalGraphic.replaceChildren(createSvg(text, label));
        modalText.textContent = text;
        lastTrigger = trigger;
        modal.showModal();
    }

    function mount(element, text, { label = 'QR-код', caption = 'Нажмите, чтобы увеличить' } = {}) {
        const svg = createSvg(text, label), trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'qr-trigger';
        trigger.setAttribute('aria-label', 'Увеличить QR-код: ' + label);
        trigger.setAttribute('aria-haspopup', 'dialog');
        svg.setAttribute('aria-hidden', 'true');
        trigger.append(svg);
        trigger.addEventListener('click', () => showLarge(text, label, trigger));
        const note = document.createElement('span');
        note.className = 'qr-caption';
        note.textContent = caption;
        element.classList.add('qr-code');
        element.replaceChildren(trigger, note);
        element.hidden = false;
        return trigger;
    }

    const initialized = new WeakMap();
    function init(root = document) {
        const base = document.querySelector('link[rel="canonical"]')?.href || document.baseURI;
        for (const element of root.querySelectorAll('[data-qr-text], [data-qr-link], [data-qr-target]')) {
            const label = element.dataset.qrLabel || 'QR-код';
            try {
                const target = element.dataset.qrTarget ? document.querySelector(element.dataset.qrTarget) : null;
                const reference = element.dataset.qrLink || target?.getAttribute('href');
                const text = element.hasAttribute('data-qr-text') ? element.dataset.qrText : reference ? resolveLink(reference, base) : null;
                if (text === null || initialized.get(element) === text) continue;
                mount(element, text, { label, caption: element.dataset.qrCaption || 'Нажмите, чтобы увеличить' });
                initialized.set(element, text);
            } catch {
                initialized.delete(element);
                element.hidden = false;
                element.textContent = 'Не удалось создать QR-код.';
                element.setAttribute('role', 'status');
            }
        }
    }

    global.QRCodeTools = Object.freeze({ encode, resolveLink, createSvg, mount, init });
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(), { once: true });
        else init();
    }
})(globalThis);
