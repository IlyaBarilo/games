// Общие данные сайта и GameSpace. Пути отсчитываются от корня витрины.
// Ключи difficulties задают порядок кнопок; параметры запуска берутся из link.
window.GAMES_CATALOG = {
    "version": 1,
    "sections": [
        {
            "id": "puzzles-games",
            "header": "Головоломки и игры",
            "description": "Небольшие игры с уровнями сложности и быстрым запуском.",
            "creator": "teacher"
        },
        {
            "id": "holidays",
            "header": "Праздничные игры",
            "description": "Игры на темы праздников.",
            "creator": "teacher"
        },
        {
            "id": "testing",
            "header": "Тестирование",
            "description": "Интерактивные тесты экрана и производительности.",
            "creator": "teacher"
        }
    ],
    "games": [
        {
            "id": "snake3d-turns",
            "section": "puzzles-games",
            "title": "Змейка 3D",
            "genre": "Аркада / 3D",
            "description": "Собирай фрукты и обходи препятствия в саду четырёх сезонов.",
            "imageUrl": "games/snake3d-turns/preview.jpg",
            "imageUrlMobile": "games/snake3d-turns/preview-mobile.jpg",
            "link": "games/snake3d-turns/snake3d-turns.html?diff=normal",
            "difficulties": {
                "2": {
                    "text": "🐣",
                    "label": "Лёгкая",
                    "link": "games/snake3d-turns/snake3d-turns.html?diff=easy"
                },
                "3": {
                    "text": "🙂",
                    "label": "Обычная",
                    "link": "games/snake3d-turns/snake3d-turns.html?diff=normal"
                },
                "4": {
                    "text": "🤔",
                    "label": "Сложная",
                    "link": "games/snake3d-turns/snake3d-turns.html?diff=hard"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/snake3d-turns",
            "detailsUrl": "content/games/snake3d-turns.html",
            "detailsSource": "content/games/snake3d-turns.md"
        },
        {
            "id": "tictac",
            "section": "puzzles-games",
            "title": "Крестики-нолики с сапером",
            "genre": "Головоломка",
            "description": "Ходи осторожно — мины любят неожиданные ходы",
            "imageUrl": "games/tictac/logo_small.jpg",
            "imageUrlMobile": "games/tictac/logo_small-mobile.jpg",
            "link": "games/tictac/tictac.html?diff=normal",
            "difficulties": {
                "2": {
                    "text": "🐣",
                    "label": "Простая",
                    "link": "games/tictac/tictac.html?diff=simple"
                },
                "3": {
                    "text": "🙂",
                    "label": "Обычная",
                    "link": "games/tictac/tictac.html?diff=normal"
                },
                "4": {
                    "text": "🤔",
                    "label": "Сложная",
                    "link": "games/tictac/tictac.html?diff=hard"
                },
                "5": {
                    "text": "😎",
                    "label": "Эксперт",
                    "link": "games/tictac/tictac.html?diff=expert"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/tictac",
            "detailsUrl": "content/games/tictac.html",
            "detailsSource": "content/games/tictac.md"
        },
        {
            "id": "tictac-robots",
            "section": "puzzles-games",
            "title": "Робосклад",
            "genre": "Головоломка",
            "description": "Крестики-нолики с неисправными плитами, подсказками и механическими руками.",
            "imageUrl": "games/tictac-robots/preview.webp",
            "imageUrlMobile": "games/tictac-robots/preview-mobile.webp",
            "imageShape": "square",
            "link": "games/tictac-robots/tictac-robots.html?diff=normal",
            "difficulties": {
                "2": {
                    "text": "🐣",
                    "label": "Лёгкая",
                    "link": "games/tictac-robots/tictac-robots.html?diff=simple"
                },
                "3": {
                    "text": "🙂",
                    "label": "Обычная",
                    "link": "games/tictac-robots/tictac-robots.html?diff=normal"
                },
                "4": {
                    "text": "🤔",
                    "label": "Сложная",
                    "link": "games/tictac-robots/tictac-robots.html?diff=hard"
                },
                "5": {
                    "text": "😎",
                    "label": "Эксперт",
                    "link": "games/tictac-robots/tictac-robots.html?diff=expert"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/tictac-robots"
        },
        {
            "id": "8march-shariki",
            "section": "holidays",
            "title": "8 марта. Шарики с поздравлениями",
            "genre": "2D",
            "description": "Выберите шарик с поздравлением",
            "imageUrl": "games/8march-shariki/logo_8march-shariki.jpg",
            "link": "games/8march-shariki/8march-shariki.html",
            "available": true,
            "creator": "teacher",
            "directory": "games/8march-shariki",
            "detailsUrl": "content/games/8march-shariki.html",
            "detailsSource": "content/games/8march-shariki.md"
        },
        {
            "id": "snake-evolution",
            "section": "puzzles-games",
            "title": "Змейка: эволюция видеоигр",
            "genre": "Аркада / История видеоигр",
            "description": "Пройди 11 эпох змейки: от терминала 1980 года до трёхмерного фруктового сада.",
            "imageUrl": "games/snake-evolution/preview.jpg",
            "imageUrlMobile": "games/snake-evolution/preview-mobile.jpg",
            "link": "games/snake-evolution/snake-evolution.html?diff=3",
            "difficulties": {
                "1": {
                    "text": "🐣",
                    "label": "Легко",
                    "link": "games/snake-evolution/snake-evolution.html?diff=1"
                },
                "2": {
                    "text": "🌱",
                    "label": "Спокойно",
                    "link": "games/snake-evolution/snake-evolution.html?diff=2"
                },
                "3": {
                    "text": "🙂",
                    "label": "Обычно",
                    "link": "games/snake-evolution/snake-evolution.html?diff=3"
                },
                "4": {
                    "text": "🤔",
                    "label": "Сложно",
                    "link": "games/snake-evolution/snake-evolution.html?diff=4"
                },
                "5": {
                    "text": "😎",
                    "label": "Эксперт",
                    "link": "games/snake-evolution/snake-evolution.html?diff=5"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/snake-evolution"
        },
        {
            "id": "interactive-screen-benchmark",
            "section": "testing",
            "title": "Диагностика интерактивного экрана",
            "genre": "Тестирование / Экран",
            "description": "Проверь касания, мультитач, точность ввода и FPS в девяти этапах диагностики.",
            "imageUrl": "games/interactive-screen-benchmark/interactive-screen-benchmark-small.jpg",
            "link": "games/interactive-screen-benchmark/interactive-screen-benchmark.html",
            "available": true,
            "creator": "teacher",
            "directory": "games/interactive-screen-benchmark"
        }
    ]
};
