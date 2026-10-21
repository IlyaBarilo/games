(function() {
    "use strict";

    const preventViewportDrag = (event) => event.preventDefault();
    document.addEventListener('gesturestart', preventViewportDrag, { passive: false });
    document.addEventListener('contextmenu', preventViewportDrag);
    document.addEventListener('dragstart', preventViewportDrag);
    document.addEventListener('selectstart', preventViewportDrag);

    const phoneImageQuery = window.matchMedia('(max-width: 767px), (max-width: 1024px) and (max-height: 520px) and (orientation: landscape)');
    const creatorBadges = {
        teacher: {
            icon: 'assets/icons/role/teacher-cap-minimal.svg',
            label: '\u0421\u0434\u0435\u043b\u0430\u043d\u043e \u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u0435\u043c'
        }
    };

    const normalizeCreator = (creator) => (creator || '').trim().toLowerCase();

    const selectImageUrl = (desktopUrl, mobileUrl) => {
        const desktopImage = (desktopUrl || '').trim();
        const mobileImage = (mobileUrl || '').trim();
        return phoneImageQuery.matches && mobileImage ? mobileImage : desktopImage;
    };

    const setCardImage = (imageDiv, imageUrl) => {
        if (imageUrl) {
            imageDiv.className = 'card-image';
            imageDiv.style.backgroundImage = `url('${imageUrl}')`;
        } else {
            imageDiv.className = 'card-image no-image-bg';
            imageDiv.style.backgroundImage = '';
        }
    };

    const refreshResponsiveImages = () => {
        document.querySelectorAll('.card-image').forEach((imageDiv) => {
            const imageUrl = selectImageUrl(imageDiv.dataset.imageUrl, imageDiv.dataset.imageUrlMobile);
            setCardImage(imageDiv, imageUrl);
        });
    };

    // Каталог загружается из catalog/games.js.
    const games = window.GAMES_CATALOG;

    // ================================================================
    // РЕНДЕРИНГ КАРТОЧЕК
    // ================================================================
    const container = document.getElementById('gamesGridContainer');
    if (!container) return;

    const expandedSections = new Set();
    const getQueryParts = () => (window.location.search || '').replace(/^\?/, '').split('&');
    const decodeQueryPart = (value) => decodeURIComponent((value || '').replace(/\+/g, ' '));
    const hasQueryParam = (name) => {
        for (const part of getQueryParts()) {
            if (!part) continue;
            const equalsIndex = part.indexOf('=');
            const rawKey = equalsIndex >= 0 ? part.slice(0, equalsIndex) : part;
            if (decodeQueryPart(rawKey) === name) {
                return true;
            }
        }
        return false;
    };
    const getQueryParam = (name) => {
        for (const part of getQueryParts()) {
            if (!part) continue;
            const equalsIndex = part.indexOf('=');
            const rawKey = equalsIndex >= 0 ? part.slice(0, equalsIndex) : part;
            const rawValue = equalsIndex >= 0 ? part.slice(equalsIndex + 1) : '';
            if (decodeQueryPart(rawKey) === name) {
                return decodeQueryPart(rawValue);
            }
        }
        return '';
    };
    const PRELOAD_IMAGES = hasQueryParam('app') || hasQueryParam('tv');
    const INDEX_STATE_SCOPE = getQueryParam('gamespaceIndexSession') || 'default';
    const INDEX_STATE_KEY = `gamespace:index-state:${window.location.pathname}:${INDEX_STATE_SCOPE}`;
    const INDEX_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

    const getIndexStateStorage = () => {
        try {
            const probeKey = `${INDEX_STATE_KEY}:probe`;
            sessionStorage.setItem(probeKey, '1');
            sessionStorage.removeItem(probeKey);
            return sessionStorage;
        } catch (error) {
            return null;
        }
    };

    const indexStateStorage = getIndexStateStorage();

    const getScrollTop = () => {
        const scrollEl = document.scrollingElement || document.documentElement || document.body;
        return scrollEl ? scrollEl.scrollTop : (window.scrollY || 0);
    };

    const setScrollTop = (value) => {
        const target = Math.max(0, Number(value) || 0);
        const scrollEl = document.scrollingElement || document.documentElement || document.body;
        if (scrollEl) {
            scrollEl.scrollTop = target;
        }
        window.scrollTo(0, target);
    };

    const restoreScrollTop = (value) => {
        const target = Number(value);
        if (!Number.isFinite(target) || target <= 0) return;

        const restore = () => setScrollTop(target);
        restore();
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(() => {
                restore();
                window.requestAnimationFrame(restore);
            });
        }
        window.setTimeout(restore, 80);
        window.setTimeout(restore, 250);
    };

    const getGameCount = () => sections.reduce((count, section) => count + section.games.length, 0);
    const imagePreloaders = [];

    const preloadCatalogImages = (catalogSections) => {
        if (!PRELOAD_IMAGES) return;

        const imageUrls = new Set();
        catalogSections.forEach((section) => {
            section.games.forEach((game) => {
                const imageUrl = selectImageUrl(game.imageUrl, game.imageUrlMobile);
                if (imageUrl) {
                    imageUrls.add(imageUrl);
                }

                const badge = creatorBadges[normalizeCreator(game.creator)];
                if (badge && badge.icon) {
                    imageUrls.add(badge.icon);
                }
            });
        });

        imageUrls.forEach((imageUrl) => {
            const image = new Image();
            const releasePreloader = () => {
                const index = imagePreloaders.indexOf(image);
                if (index >= 0) {
                    imagePreloaders.splice(index, 1);
                }
            };
            image.onload = releasePreloader;
            image.onerror = releasePreloader;
            image.decoding = 'async';
            image.src = imageUrl;
            imagePreloaders.push(image);
        });
    };

    const loadIndexState = () => {
        if (!indexStateStorage) return null;
        try {
            const raw = indexStateStorage.getItem(INDEX_STATE_KEY);
            if (!raw) return null;
            const state = JSON.parse(raw);
            if (!state || state.v !== 1) return null;
            if (Date.now() - Number(state.savedAt || 0) > INDEX_STATE_MAX_AGE_MS) {
                indexStateStorage.removeItem(INDEX_STATE_KEY);
                return null;
            }
            return state;
        } catch (error) {
            return null;
        }
    };

    const saveIndexState = () => {
        if (!indexStateStorage) return;
        try {
            const state = {
                v: 1,
                savedAt: Date.now(),
                sectionCount: sections.length,
                gameCount: getGameCount(),
                expandedSections: Array.from(expandedSections),
                scrollTop: getScrollTop()
            };
            indexStateStorage.setItem(INDEX_STATE_KEY, JSON.stringify(state));
        } catch (error) {
            // Ignore storage quota/security errors.
        }
    };

    const applyIndexState = (state) => {
        if (!state || state.sectionCount !== sections.length || state.gameCount !== getGameCount()) return;
        if (!Array.isArray(state.expandedSections)) return;

        const sectionIds = new Set(sections.map(section => section.id));
        state.expandedSections.forEach((sectionId) => {
            if (sectionIds.has(sectionId)) {
                expandedSections.add(sectionId);
            }
        });
    };

    const getCollapsedLimit = () => {
        const value = getComputedStyle(document.documentElement).getPropertyValue('--columns').trim();
        const columns = Number.parseInt(value, 10);
        return Number.isFinite(columns) && columns > 0 ? columns : 3;
    };

    const buildSections = () => window.GameCatalog.sections();

    const createGameCard = (game) => {
        const cardLink = document.createElement('div');
        cardLink.className = 'game-card';
        cardLink.setAttribute('role', 'link');
        cardLink.setAttribute('aria-label', game.title || 'Открыть игру');
        cardLink.tabIndex = 0;
        cardLink.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) return;
            if (game.link) {
                saveIndexState();
                window.location.href = window.GameCatalog.link(game.link);
            }
        });
        cardLink.addEventListener('keydown', (e) => {
            if (e.target !== cardLink) return;
            if ((e.key === 'Enter' || e.key === ' ') && game.link) {
                e.preventDefault();
                saveIndexState();
                window.location.href = window.GameCatalog.link(game.link);
            }
        });

        const imageDiv = document.createElement('div');
        imageDiv.dataset.imageUrl = (game.imageUrl || '').trim();
        imageDiv.dataset.imageUrlMobile = (game.imageUrlMobile || '').trim();
        setCardImage(imageDiv, selectImageUrl(game.imageUrl, game.imageUrlMobile));

        const overlay = document.createElement('div');
        overlay.className = 'image-overlay';

        if (game.genre && game.genre.trim() !== '') {
            const genreSpan = document.createElement('span');
            genreSpan.className = 'game-genre';
            genreSpan.textContent = game.genre.trim();
            overlay.appendChild(genreSpan);
        }

        const titleEl = document.createElement('h2');
        titleEl.className = 'game-title';
        titleEl.textContent = game.title || 'Без названия';
        overlay.appendChild(titleEl);

        if (game.description && game.description.trim() !== '') {
            const descEl = document.createElement('p');
            descEl.className = 'game-description';
            descEl.textContent = game.description.trim();
            overlay.appendChild(descEl);
        }

        if (game.difficulties && Object.keys(game.difficulties).length > 0) {
            const difficultyContainer = document.createElement('div');
            difficultyContainer.className = 'difficulty-buttons';
            const sortedLevels = Object.keys(game.difficulties)
                .map(Number)
                .sort((a, b) => a - b);

            sortedLevels.forEach(level => {
                const difficulty = game.difficulties[level];
                if (difficulty && difficulty.text && difficulty.link) {
                    const btn = document.createElement('a');
                    btn.href = window.GameCatalog.link(difficulty.link);
                    btn.className = 'difficulty-btn';
                    btn.textContent = difficulty.text;
                    if (difficulty.label) {
                        btn.title = difficulty.label;
                        btn.setAttribute('aria-label', (game.title || 'Игра') + ': ' + difficulty.label);
                    }
                    btn.target = '_self';
                    btn.addEventListener('click', (e) => {
                        saveIndexState();
                        e.stopPropagation();
                    });
                    difficultyContainer.appendChild(btn);
                }
            });

            overlay.appendChild(difficultyContainer);
        }

        imageDiv.appendChild(overlay);

        const creatorBadge = creatorBadges[normalizeCreator(game.creator)];
        if (creatorBadge) {
            const roleBadge = document.createElement('img');
            roleBadge.className = 'role-badge';
            roleBadge.src = creatorBadge.icon;
            roleBadge.alt = creatorBadge.label;
            roleBadge.title = creatorBadge.label;
            roleBadge.loading = 'lazy';
            imageDiv.appendChild(roleBadge);
        }

        cardLink.appendChild(imageDiv);
        return cardLink;
    };

    const createSectionElement = (section) => {
        const collapsedLimit = getCollapsedLimit();
        const isExpanded = expandedSections.has(section.id);
        const visibleGames = isExpanded ? section.games : section.games.slice(0, collapsedLimit);
        const hiddenCount = Math.max(0, section.games.length - visibleGames.length);

        const sectionEl = document.createElement('section');
        sectionEl.className = 'game-section';

        const headerEl = document.createElement('div');
        headerEl.className = 'section-header';

        const headingEl = document.createElement('div');
        headingEl.className = 'section-heading';

        const titleEl = document.createElement('h2');
        titleEl.className = 'section-title';
        titleEl.textContent = section.header;
        headingEl.appendChild(titleEl);

        if (section.description) {
            const descEl = document.createElement('p');
            descEl.className = 'section-description';
            descEl.textContent = section.description;
            headingEl.appendChild(descEl);
        }

        headerEl.appendChild(headingEl);
        sectionEl.appendChild(headerEl);

        const sectionGrid = document.createElement('div');
        sectionGrid.className = 'section-games-grid';
        visibleGames.forEach((game, index) => {
            const card = createGameCard(game);
            const isLastVisibleCard = index === visibleGames.length - 1;

            if (false && !isExpanded && hiddenCount > 0 && isLastVisibleCard) {
                card.classList.add('has-show-more');
                const showMoreBtn = document.createElement('button');
                showMoreBtn.type = 'button';
                showMoreBtn.className = 'show-more-btn';
                showMoreBtn.textContent = `+${hiddenCount}`;
                showMoreBtn.setAttribute('aria-label', `Показать еще ${hiddenCount} игр`);
                showMoreBtn.title = `Показать еще ${hiddenCount} игр`;
                showMoreBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    expandedSections.add(section.id);
                    renderSections();
                    saveIndexState();
                });
                card.appendChild(showMoreBtn);
            }

            sectionGrid.appendChild(card);
        });
        sectionEl.appendChild(sectionGrid);

        if (!isExpanded && hiddenCount > 0) {
            const moreDivider = document.createElement('div');
            moreDivider.className = 'section-more-divider';

            const moreBtn = document.createElement('button');
            moreBtn.type = 'button';
            moreBtn.className = 'section-more-btn';
            const moreBtnLabel = document.createElement('span');
            moreBtnLabel.className = 'section-more-btn-label';
            moreBtnLabel.textContent = '+';
            moreBtn.appendChild(moreBtnLabel);
            moreBtn.setAttribute('aria-label', `Показать еще ${hiddenCount} игр`);
            moreBtn.title = `Показать еще ${hiddenCount} игр`;
            moreBtn.addEventListener('click', () => {
                expandedSections.add(section.id);
                renderSections();
                saveIndexState();
            });

            moreDivider.appendChild(moreBtn);
            sectionEl.appendChild(moreDivider);
        }

        return sectionEl;
    };

    const sections = buildSections(games);
    const savedIndexState = loadIndexState();
    applyIndexState(savedIndexState);
    preloadCatalogImages(sections);

    function renderSections() {
        container.innerHTML = '';
        sections.forEach((section) => {
            container.appendChild(createSectionElement(section));
        });
        refreshResponsiveImages();
    }

    const renderSectionsKeepingScroll = () => {
        const scrollTop = getScrollTop();
        renderSections();
        restoreScrollTop(scrollTop);
        saveIndexState();
    };

    renderSections();
    if (savedIndexState && Number.isFinite(Number(savedIndexState.scrollTop))) {
        restoreScrollTop(savedIndexState.scrollTop);
    }

    if (phoneImageQuery.addEventListener) {
        phoneImageQuery.addEventListener('change', renderSectionsKeepingScroll);
    } else if (phoneImageQuery.addListener) {
        phoneImageQuery.addListener(renderSectionsKeepingScroll);
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        const scrollTop = getScrollTop();
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            renderSections();
            restoreScrollTop(scrollTop);
            saveIndexState();
        }, 120);
    });

    window.addEventListener('pagehide', saveIndexState);
    window.addEventListener('beforeunload', saveIndexState);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveIndexState();
        }
    });

    const countSpan = document.querySelector('.game-count');
    if (countSpan) {
        const gameCount = getGameCount();
        countSpan.textContent = window.GameCatalog.countLabel(gameCount);
    }
})();
