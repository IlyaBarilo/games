(() => {
    const overlay = document.getElementById('pavilion-loading');
    const stage = document.getElementById('loading-stage');
    const caption = document.getElementById('loading-caption');
    const main = document.getElementById('games');
    const mascot = document.getElementById('loading-mascot');
    const characters = ['robot', 'kraken', 'firefly', 'rocket'];
    let previousCharacter;
    try { previousCharacter = sessionStorage.getItem('pavilion-loading-character'); } catch {}
    const choices = characters.filter(character => character !== previousCharacter);
    const character = choices[Math.floor(Math.random() * choices.length)];
    mascot.dataset.character = character;
    try { sessionStorage.setItem('pavilion-loading-character', character); } catch {}
    let total = 0, completed = 0, initialized = false, finished = false, failed = false;
    const characterCaptions = {
        robot: [
            'Бип уже завёл мотор.',
            'Расставляем сцены. Бип проверяет, всё ли на своих местах.',
            'Развешиваем превью: {count}. Бип пересчитал — всё на месте.',
            'Включаем свет. Бип помигал фарами в ответ.',
            'Готовим первый кадр. Бип, смотри в камеру!',
            'Почти готово. Бип освобождает проход.'
        ],
        kraken: [
            'Ключи нашлись у кракена.',
            'Расставляем сцены. Кракен помогает всеми щупальцами.',
            'Развешиваем превью: {count}. Кракен держит рамки ровно.',
            'Включаем свет. Кракен пока прищурился.',
            'Готовим первый кадр. Кракен, улыбочку!',
            'Почти готово. Кракен убирает щупальца с прохода.'
        ],
        firefly: [
            'Светлячок уже на дежурстве.',
            'Расставляем сцены. Светлячок подсвечивает нужные места.',
            'Развешиваем превью: {count}. Светлячок проверяет яркость.',
            'Включаем свет. Светлячки помогают.',
            'Готовим первый кадр. Светлячок, только без вспышки!',
            'Почти готово. Светлячок показывает дорогу в зал.'
        ],
        rocket: [
            'Ракета ждёт разрешения на старт.',
            'Расставляем сцены. Ракета проверяет маршрут.',
            'Развешиваем превью: {count}. Ракета сверяется с картой.',
            'Включаем свет. Ракета зажигает бортовые огни.',
            'Готовим первый кадр. Ракета, в кадре не разгоняться!',
            'Почти готово. Ракета перешла на малую тягу.'
        ]
    };
    const captions = characterCaptions[character].map(text => () => text.replace('{count}', total ? `${completed} из ${total}` : 'проверяем картинки'));
    caption.textContent = captions[0]();
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
            ? completed < total ? `Загружаем превью: ${completed} из ${total}` : 'Показываем зал…'
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
        document.getElementById('loading-fallback').hidden = false;
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
