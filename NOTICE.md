# Сторонние компоненты и лицензии

Авторские материалы коллекции регулируются [условиями использования](LICENSE.md).
Перечисленные ниже сторонние компоненты сохраняют собственные лицензии;
ограничения авторских материалов на них не распространяются.

Автономные игры содержат встроенные сторонние библиотеки и шрифты. Уведомления находятся
в HTML игр и в сопровождающей папке `licenses/`, как указано ниже. HTML-файлы игр
содержат полные условия автора и применимые сторонние уведомления внутри файла;
скачивание одного HTML сохраняет эти тексты без обращения к внешнему сайту.
Полные сведения о встроенных зависимостях автономных игр сохраняются в их HTML.

## Компоненты готовых игр

| Компонент | Файлы и применение | Лицензия и полный текст |
|---|---|---|
| three.js r128 | `games/snake3d-turns/snake3d-turns.html`; встроенная three.js, трёхмерная графика «Змейки» | [MIT](licenses/three.js-MIT.txt) |
| three.js r186 | `games/tictac-sea/tictac-sea.html`; встроенная трёхмерная графика «Лагуны» | [MIT](licenses/three.js-r186-MIT.txt) |
| Earcut 3.0.2 | Триангуляция в составе three.js r186 в «Лагуне» | [ISC](licenses/earcut-3.0.2-ISC.txt) |
| Earcut 2.2.2 | Триангуляция в составе three.js r128 в «Змейке» | [ISC](licenses/earcut-2.2.2-ISC.txt) |
| Roboto 3.015; 2026 | `games/tictac/tictac.html`; встроенные Roboto Regular, Medium и Bold «Крестиков-ноликов с сапёром» | [SIL Open Font License 1.1](licenses/Roboto-OFL.txt) |
| Phaser 3.90.0 и включённые в него компоненты | `games/tictac-robots/tictac-robots.html`; движок «Робосклада» | MIT и другие разрешительные лицензии внутри HTML; отдельная копия BSD — [полный текст](licenses/phaser-adaptations-BSD-2-Clause.txt) |

### three.js

Copyright © 2010–2021 three.js authors.

Исходный проект и лицензия версии r128:
[three.js r128](https://github.com/mrdoob/three.js/tree/r128),
[LICENSE](https://github.com/mrdoob/three.js/blob/r128/LICENSE).
Уведомление и полный текст MIT сохраняются при распространении библиотеки.
Библиотека, уведомление и полный текст MIT встроены в
`games/snake3d-turns/snake3d-turns.html`; отдельный файл библиотеки для запуска не требуется.

В состав этой версии three.js входит адаптация
[Earcut 2.2.2](https://github.com/mrdoob/three.js/blob/r128/src/extras/Earcut.js).
Copyright (c) 2016, Mapbox. Полный текст ISC встроен в HTML «Змейки»;
отдельная копия находится в `licenses/earcut-2.2.2-ISC.txt`.

### «Лагуна»

В `games/tictac-sea/tictac-sea.html` встроены three.js r186 и Earcut 3.0.2.
Copyright © 2010–2026 three.js authors; Copyright (c) 2024, Mapbox.
Полные тексты MIT и ISC сохранены в HTML и в папке `licenses/`.
Источники: [three.js r186 / LICENSE](https://github.com/mrdoob/three.js/blob/r186/LICENSE),
[Earcut в three.js r186](https://github.com/mrdoob/three.js/blob/r186/src/extras/lib/earcut.js),
[Earcut 3.0.2 / LICENSE](https://github.com/mapbox/earcut/blob/v3.0.2/LICENSE).

### Roboto

Copyright 2011 The Roboto Project Authors
(https://github.com/googlefonts/roboto-classic).

Три начертания Roboto (Regular 400, Medium 500 и Bold 700) встроены в
`games/tictac/tictac.html` через Base64 без изменения исходных байтов шрифтов.
В этих файлах указаны версия `3.015; 2026` и ссылка на SIL Open Font License.
Уведомление правообладателей и полный текст OFL сохранены в читаемом комментарии
внутри CSS того же HTML, поэтому передаются вместе с отдельно скачанной игрой.
Отдельные TTF в коллекции не распространяются; для запуска достаточно встроенных шрифтов.
Применяется лицензия именно этих файлов.
Полный текст с уведомлением правообладателей взят из
[Roboto Classic / OFL.txt](https://github.com/googlefonts/roboto-classic/blob/main/OFL.txt).
[Официальный текст и пояснения OFL](https://openfontlicense.org/).

Шрифты допускается использовать, встраивать, изменять и распространять
при соблюдении OFL. Нельзя продавать шрифт сам по себе. При распространении
необходимо сохранять уведомление о правах и лицензию; требования к изменённым
шрифтам определяются полным текстом OFL. Эта лицензия не переводит код игры
или остальные материалы коллекции под OFL.

### «Робосклад»

В начале `games/tictac-robots/tictac-robots.html` находятся лицензионный блок Phaser
и уведомления о включённых и адаптированных компонентах. Они сохраняют исходные
условия MIT, ISC, BSD-2-Clause и разрешительные условия Gavin Kistner; их нельзя
заменять условиями автора коллекции. Исходный движок:
[Phaser 3.90.0](https://github.com/phaserjs/phaser/tree/v3.90.0).

Полные условия BSD-2-Clause для адаптаций klasse и vecmath встроены в HTML;
отдельная копия — `licenses/phaser-adaptations-BSD-2-Clause.txt`. Декларации лицензии:
[klasse 1.0.9](https://registry.npmjs.org/klasse/1.0.9),
[vecmath 0.1.4](https://registry.npmjs.org/vecmath/0.1.4).
Автор адаптированных утилит — Matt DesLauriers. Уведомление MIT исходной gl-matrix
также сохранено в HTML.

### Графика, фотографии, значки и системные шрифты

Обложки и логотипы игр, SVG-значки шапочки преподавателя,
фотографии инфокиоска и оформление коллекции подготовлены Ильёй Барило для своих
проектов. Игровые скриншоты показывают соответствующие игры. Эти материалы
распространяются по [условиям автора](LICENSE.md) в пределах его прав;
условия сторонних компонентов внутри игр сохраняются.

Значки сложности в 3D-павильоне — собственные геометрические рисунки,
формируемые из векторных контуров. Набор emoji или сторонний иконочный шрифт
для этих рисунков не поставляется. В остальных интерфейсах символы Unicode
отображаются средствами устройства. Segoe UI, Arial и системные шрифты
не включены в файлы поставки; внешний сервис шрифтов для их загрузки не используется.
Исключение — встроенные Roboto, описанные выше.

3D-павильон использует API WebGL браузера без отдельного графического движка.
Его геометрия и служебные текстуры создаются кодом витрины. Для «Шариков с
поздравлениями» отдельные сторонние библиотеки, шрифты и наборы изображений
в комплекте не поставляются.

## «Змейка: эволюция видеоигр»

Игра поставляется одним автономным HTML-файлом со встроенными вариантами
змейки для 11 эпох. В этой сборке отдельные внешние библиотеки, шрифты
и сетевые ресурсы не используются. Полные условия автора включены в HTML.

## «Диагностика интерактивного экрана»

Interactive Screen Benchmark поставляется одним автономным HTML-файлом.
В проверенной сборке не обнаружены внешние библиотеки, встроенные шрифтовые
файлы или загружаемые сетевые ресурсы. Графика создаётся средствами браузера;
имена Inter, Segoe UI, Roboto и Arial в CSS обозначают установленные шрифты
устройства, сами шрифты с этой игрой не распространяются.

На авторские материалы действуют [условия коллекции](LICENSE.md).
Полный текст этих условий встроен в HTML диагностического теста.

## QR-коды витрины

Для создания QR-кодов в браузере используется [QR Code generator library v1.8.0](https://github.com/nayuki/QR-Code-generator/releases/tag/v1.8.0)
Project Nayuki, лицензия MIT. Официальная JavaScript-сборка сохранена в
`assets/vendor/qrcodegen-v1.8.0.js` вместе с полным исходным лицензионным заголовком.
Отдельная копия условий — [qrcodegen-MIT.txt](licenses/qrcodegen-MIT.txt).
Библиотека включена только в веб-витрину; QR-коды формируются локально,
без передачи текста внешнему сервису. В файлы самих игр библиотека не добавляется.

## Зависимости сборщика и проверок

Эти пакеты используются Node.js при преобразовании Markdown, подготовке скрипта
павильона и проверках. Их программный
код не включается в готовый сайт и комплект GameSpace. Точные зависимости
и контрольные суммы npm-пакетов зафиксированы в `package-lock.json`.
Полные лицензионные тексты сохранены также в комплекте уведомлений:

| Пакет | Версия | Лицензия и полный текст | Исходный проект |
|---|---|---|---|
| markdown-it | 14.3.2 | [MIT](licenses/build/markdown-it.txt) | [markdown-it](https://github.com/markdown-it/markdown-it) |
| argparse | 2.0.1 | [Python-2.0 и исторические уведомления](licenses/build/argparse.txt) | [argparse](https://github.com/nodeca/argparse) |
| entities | 4.5.0 | [BSD-2-Clause](licenses/build/entities.txt) | [entities](https://github.com/fb55/entities) |
| linkify-it | 5.0.2 | [MIT](licenses/build/linkify-it.txt) | [linkify-it](https://github.com/markdown-it/linkify-it) |
| mdurl | 2.1.0 | [MIT](licenses/build/mdurl.txt) | [mdurl](https://github.com/markdown-it/mdurl) |
| punycode.js | 2.3.1 | [MIT](licenses/build/punycode.js.txt) | [punycode.js](https://github.com/mathiasbynens/punycode.js) |
| uc.micro | 2.1.0 | [MIT](licenses/build/uc.micro.txt) | [uc.micro](https://github.com/markdown-it/uc.micro) |
| jsqr | 1.4.0 | [Apache-2.0](licenses/build/jsqr.txt) | [jsQR](https://github.com/cozmo/jsQR) |
| @jridgewell/gen-mapping | 0.3.13 | [MIT](licenses/build/@jridgewell/gen-mapping.txt) | [@jridgewell/gen-mapping](https://github.com/jridgewell/sourcemaps) |
| @jridgewell/resolve-uri | 3.1.2 | [MIT](licenses/build/@jridgewell/resolve-uri.txt) | [@jridgewell/resolve-uri](https://github.com/jridgewell/resolve-uri) |
| @jridgewell/source-map | 0.3.11 | [MIT](licenses/build/@jridgewell/source-map.txt) | [@jridgewell/source-map](https://github.com/jridgewell/sourcemaps) |
| @jridgewell/sourcemap-codec | 1.6.0 | [MIT](licenses/build/@jridgewell/sourcemap-codec.txt) | [@jridgewell/sourcemap-codec](https://github.com/jridgewell/sourcemaps) |
| @jridgewell/trace-mapping | 0.3.31 | [MIT](licenses/build/@jridgewell/trace-mapping.txt) | [@jridgewell/trace-mapping](https://github.com/jridgewell/sourcemaps) |
| acorn | 8.19.0 | [MIT](licenses/build/acorn.txt) | [acorn](https://github.com/acornjs/acorn) |
| buffer-from | 1.1.2 | [MIT](licenses/build/buffer-from.txt) | [buffer-from](https://github.com/LinusU/buffer-from) |
| commander | 2.20.3 | [MIT](licenses/build/commander.txt) | [commander](https://github.com/tj/commander.js) |
| source-map | 0.6.1 | [BSD-3-Clause](licenses/build/source-map.txt) | [source-map](https://github.com/mozilla/source-map) |
| source-map-support | 0.5.21 | [MIT](licenses/build/source-map-support.txt) | [source-map-support](https://github.com/evanw/node-source-map-support) |
| terser | 5.51.2 | [BSD-2-Clause](licenses/build/terser.txt) | [terser](https://github.com/terser/terser) |

jsQR используется только в автоматических тестах для независимой проверки чтения
созданных QR-кодов. Декодер не включается в JavaScript сайта или игр.

Terser используется только сборщиком для уменьшения собственного скрипта 3D-павильона.
Вычисления не преобразуются, все комментарии сохраняются. Исходники витрины и файлы
игр остаются без такой обработки; код минификатора в браузер не передаётся.

Node.js, npm и установленная отдельно программа 7-Zip не поставляются
в составе коллекции и сохраняют собственные условия использования.

## Комплект уведомлений

Этот документ, условия автора и папка `licenses/` входят в обе сборки
и в официальный архив GameSpace. Полные тексты сторонних лицензий
сохраняются на языке оригинала; русские пояснения их не заменяют.
При добавлении сторонних компонентов, перечисляемых в этом документе, перечень
и комплект лицензий необходимо обновлять. Для автономных игр со встроенными
уведомлениями полный состав зависимостей и необходимые лицензионные тексты
поддерживаются в соответствующих HTML-файлах.

При скачивании одной игры условия автора и необходимые сторонние тексты уже
сохранены в её HTML.
Комментарии с лицензиями нельзя удалять при последующем
копировании или обработке файла. Самостоятельное распространение авторских
материалов определяется [условиями автора](LICENSE.md); встраивание уведомлений
не предоставляет дополнительных разрешений.

При передаче всего документа вместе с коллекцией сохраняйте всю папку `licenses/`,
чтобы ссылки на полные тексты оставались доступны офлайн.
