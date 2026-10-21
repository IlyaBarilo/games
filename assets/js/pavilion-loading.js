(() => {
    const overlay = document.getElementById('pavilion-loading');
    const stage = document.getElementById('loading-stage');
    const caption = document.getElementById('loading-caption');
    const main = document.getElementById('games');
    let total = 0, completed = 0, initialized = false, finished = false, failed = false;
    const captions = [
        () => 'Открываем павильон. Ключи нашлись у кракена.',
        () => 'Расставляем сцены. Башни просим не шататься.',
        () => total ? `Развешиваем превью: ${completed} из ${total}. Всё по местам.` : 'Развешиваем превью. Всё по местам.',
        () => 'Включаем свет. Светлячки помогают.',
        () => 'Готовим первый кадр. Кракен, улыбочку!',
        () => 'Почти готово. Корабль паркуется у своего стенда.'
    ];
    let captionIndex = 0;
    const captionChoices = () => !total ? [0] : !initialized ? [1, 3] : completed < total ? [2, 3] : [4];
    const captionTimer = setInterval(() => {
        if (failed || finished) return;
        const choices = captionChoices();
        captionIndex = choices[(choices.indexOf(captionIndex) + 1) % choices.length];
        caption.textContent = captions[captionIndex]();
    }, 2600);
    let resolveInitialized;
    const initializedPromise = new Promise(resolve => { resolveInitialized = resolve; });
    main.inert = true;
    const update = () => {
        if (failed || finished) return;
        const choices = captionChoices();
        if (!choices.includes(captionIndex)) captionIndex = choices[0];
        caption.textContent = captions[captionIndex]();
        stage.textContent = initialized
            ? completed < total ? `Загружаем превью: ${completed} из ${total}` : 'Открываем павильон…'
            : 'Создаём игровые сцены…';
    };
    const fail = (message = 'Не удалось открыть павильон. Попробуйте обновить страницу или перейдите в GameSpace.') => {
        if (failed || finished) return;
        failed = true;
        clearInterval(captionTimer);
        caption.hidden = true;
        overlay.classList.add('has-error');
        stage.textContent = message;
        document.getElementById('loading-title').textContent = 'Павильон пока недоступен';
        document.getElementById('loading-progress').hidden = true;
        main.setAttribute('aria-busy', 'false');
        resolveInitialized(false);
    };
    window.PAVILION_LOADING = Object.freeze({
        // Let the static loading screen paint before building the WebGL scene.
        painted: new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        initialized: initializedPromise,
        start(count) { total = count; update(); },
        previewDone() { completed++; update(); },
        sceneInitialized() { initialized = true; update(); resolveInitialized(true); },
        frameRendered() {
            if (finished || failed || !initialized || completed < total) return;
            finished = true;
            clearInterval(captionTimer);
            caption.textContent = captions[5]();
            main.inert = false;
            main.setAttribute('aria-busy', 'false');
            overlay.classList.add('is-ready');
            setTimeout(() => { overlay.hidden = true; }, 220);
        },
        fail
    });
    window.addEventListener('error', event => {
        const script = event.target?.tagName === 'SCRIPT' ? event.target.src : event.filename;
        if (script && /\/(?:pavilion(?:-loading)?|catalog|games)\.js(?:[?#]|$)/.test(script)) fail();
    }, true);
})();
