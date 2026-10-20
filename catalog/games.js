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
        },
        {
            "id": "zvezdny-kurer",
            "section": "puzzles-games",
            "title": "Звёздный курьер",
            "genre": "Физическая аркада",
            "description": "Выполни семь доставок на планеты и спутники, выбирая траекторию полёта с учётом притяжения.",
            "imageUrl": "games/zvezdny-kurer/zvezdny-kurer-small.jpg",
            "link": "games/zvezdny-kurer/zvezdny-kurer.html?diff=3",
            "difficulties": {
                "1": {
                    "text": "🐣",
                    "label": "Уровень 1",
                    "link": "games/zvezdny-kurer/zvezdny-kurer.html?diff=1"
                },
                "2": {
                    "text": "🌱",
                    "label": "Уровень 2",
                    "link": "games/zvezdny-kurer/zvezdny-kurer.html?diff=2"
                },
                "3": {
                    "text": "🙂",
                    "label": "Уровень 3",
                    "link": "games/zvezdny-kurer/zvezdny-kurer.html?diff=3"
                },
                "4": {
                    "text": "🤔",
                    "label": "Уровень 4",
                    "link": "games/zvezdny-kurer/zvezdny-kurer.html?diff=4"
                },
                "5": {
                    "text": "😎",
                    "label": "Уровень 5",
                    "link": "games/zvezdny-kurer/zvezdny-kurer.html?diff=5"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/zvezdny-kurer"
        },
        {
            "id": "staya-svetlyachkov",
            "section": "puzzles-games",
            "title": "Стая светлячков",
            "genre": "Аркада",
            "description": "Проведи стаю из 50 светлячков к Лунному цветку, обходя препятствия и паутины.",
            "imageUrl": "games/staya-svetlyachkov/staya-svetlyachkov-small.jpg",
            "link": "games/staya-svetlyachkov/staya-svetlyachkov.html?diff=3",
            "difficulties": {
                "1": {
                    "text": "🐣",
                    "label": "Уровень 1",
                    "link": "games/staya-svetlyachkov/staya-svetlyachkov.html?diff=1"
                },
                "2": {
                    "text": "🌱",
                    "label": "Уровень 2",
                    "link": "games/staya-svetlyachkov/staya-svetlyachkov.html?diff=2"
                },
                "3": {
                    "text": "🙂",
                    "label": "Уровень 3",
                    "link": "games/staya-svetlyachkov/staya-svetlyachkov.html?diff=3"
                },
                "4": {
                    "text": "🤔",
                    "label": "Уровень 4",
                    "link": "games/staya-svetlyachkov/staya-svetlyachkov.html?diff=4"
                },
                "5": {
                    "text": "😎",
                    "label": "Уровень 5",
                    "link": "games/staya-svetlyachkov/staya-svetlyachkov.html?diff=5"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/staya-svetlyachkov"
        },
        {
            "id": "bashnya-oblakov",
            "section": "puzzles-games",
            "title": "Башня облаков",
            "genre": "Платформер",
            "description": "Поднимайся по облачным платформам, направляй прыжки героя и собирай звёзды.",
            "imageUrl": "games/bashnya-oblakov/bashnya-oblakov-small.jpg",
            "link": "games/bashnya-oblakov/bashnya-oblakov.html?diff=3",
            "difficulties": {
                "1": {
                    "text": "🐣",
                    "label": "Уровень 1",
                    "link": "games/bashnya-oblakov/bashnya-oblakov.html?diff=1"
                },
                "2": {
                    "text": "🌱",
                    "label": "Уровень 2",
                    "link": "games/bashnya-oblakov/bashnya-oblakov.html?diff=2"
                },
                "3": {
                    "text": "🙂",
                    "label": "Уровень 3",
                    "link": "games/bashnya-oblakov/bashnya-oblakov.html?diff=3"
                },
                "4": {
                    "text": "🤔",
                    "label": "Уровень 4",
                    "link": "games/bashnya-oblakov/bashnya-oblakov.html?diff=4"
                },
                "5": {
                    "text": "😎",
                    "label": "Уровень 5",
                    "link": "games/bashnya-oblakov/bashnya-oblakov.html?diff=5"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/bashnya-oblakov"
        },
        {
            "id": "bashnya-do-oblakov",
            "section": "puzzles-games",
            "title": "Башня до облаков",
            "genre": "Аркада / Строительство",
            "description": "Лови строительные блоки тележкой и доставляй их к крану, чтобы построить башню.",
            "imageUrl": "games/bashnya-do-oblakov/bashnya-do-oblakov-small.jpg",
            "link": "games/bashnya-do-oblakov/bashnya-do-oblakov.html?diff=3",
            "difficulties": {
                "1": {
                    "text": "🐣",
                    "label": "Уровень 1",
                    "link": "games/bashnya-do-oblakov/bashnya-do-oblakov.html?diff=1"
                },
                "2": {
                    "text": "🌱",
                    "label": "Уровень 2",
                    "link": "games/bashnya-do-oblakov/bashnya-do-oblakov.html?diff=2"
                },
                "3": {
                    "text": "🙂",
                    "label": "Уровень 3",
                    "link": "games/bashnya-do-oblakov/bashnya-do-oblakov.html?diff=3"
                },
                "4": {
                    "text": "🤔",
                    "label": "Уровень 4",
                    "link": "games/bashnya-do-oblakov/bashnya-do-oblakov.html?diff=4"
                },
                "5": {
                    "text": "😎",
                    "label": "Уровень 5",
                    "link": "games/bashnya-do-oblakov/bashnya-do-oblakov.html?diff=5"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/bashnya-do-oblakov"
        },
        {
            "id": "podvodnaya-ekspeditsiya",
            "section": "puzzles-games",
            "title": "Подводная экспедиция",
            "genre": "Аркада / Лабиринт",
            "description": "Собери четыре редких образца в коралловом лабиринте и вернись на станцию. Используй сонар, чтобы пройти мимо морских существ.",
            "imageUrl": "games/podvodnaya-ekspeditsiya/podvodnaya-ekspeditsiya-small.jpg",
            "link": "games/podvodnaya-ekspeditsiya/podvodnaya-ekspeditsiya.html?diff=3",
            "difficulties": {
                "1": {
                    "text": "🐣",
                    "label": "Уровень 1",
                    "link": "games/podvodnaya-ekspeditsiya/podvodnaya-ekspeditsiya.html?diff=1"
                },
                "2": {
                    "text": "🌱",
                    "label": "Уровень 2",
                    "link": "games/podvodnaya-ekspeditsiya/podvodnaya-ekspeditsiya.html?diff=2"
                },
                "3": {
                    "text": "🙂",
                    "label": "Уровень 3",
                    "link": "games/podvodnaya-ekspeditsiya/podvodnaya-ekspeditsiya.html?diff=3"
                },
                "4": {
                    "text": "🤔",
                    "label": "Уровень 4",
                    "link": "games/podvodnaya-ekspeditsiya/podvodnaya-ekspeditsiya.html?diff=4"
                },
                "5": {
                    "text": "😎",
                    "label": "Уровень 5",
                    "link": "games/podvodnaya-ekspeditsiya/podvodnaya-ekspeditsiya.html?diff=5"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/podvodnaya-ekspeditsiya"
        },
        {
            "id": "tictac-sea",
            "section": "puzzles-games",
            "title": "Лагуна",
            "genre": "Головоломка / 3D",
            "description": "Крестики-нолики в море. Обойди кракена по цифрам.",
            "imageUrl": "games/tictac-sea/preview.jpg",
            "imageUrlMobile": "games/tictac-sea/preview-mobile.jpg",
            "link": "games/tictac-sea/tictac-sea.html?diff=normal",
            "difficulties": {
                "2": {
                    "text": "🐣",
                    "label": "Тихая бухта",
                    "link": "games/tictac-sea/tictac-sea.html?diff=easy"
                },
                "3": {
                    "text": "🙂",
                    "label": "Приключение",
                    "link": "games/tictac-sea/tictac-sea.html?diff=normal"
                },
                "4": {
                    "text": "🤔",
                    "label": "Опасные воды",
                    "link": "games/tictac-sea/tictac-sea.html?diff=hard"
                },
                "5": {
                    "text": "😎",
                    "label": "Штормовой маршрут",
                    "link": "games/tictac-sea/tictac-sea.html?diff=expert"
                }
            },
            "available": true,
            "creator": "teacher",
            "directory": "games/tictac-sea"
        }
    ]
};
