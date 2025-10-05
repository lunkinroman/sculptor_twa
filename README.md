# Sculptor - Нет доступа (Telegram WebApp)

Экран "Нет доступа" для Telegram WebApp приложения Sculptor. Показывает пользователям сообщение о том, что для доступа к материалам необходимо приобрести тренировку.

## Особенности
- Адаптирован под дизайн Figma с фоновым изображением
- Подключены локальные шрифты PP Neue Montreal
- Интеграция с официальным `telegram-web-app.js`
- Адаптивный дизайн для мобильных устройств
- Поддержка темной/светлой темы Telegram
- Кнопка "Купить" с интеграцией Main Button
- Работает в браузере для локального тестирования

## Локальная разработка
Запустите HTTP сервер для тестирования (Telegram требует HTTPS в продакшене, но локальный HTTP подойдет для тестов).

```bash
cd /Users/romanlunkin/sculptor_twa
python3 -m http.server 5173
```

Откройте `http://localhost:5173` в браузере.

## Интеграция с Telegram
1. Разместите приложение на HTTPS (GitHub Pages, Vercel, Netlify и т.д.)
2. Создайте бота через `@BotFather` и настройте Web App URL:
   - Установите `Menu Button` → `Web App` с вашим URL
   - Или добавьте кнопку `web_app` в кастомную клавиатуру
3. Запустите Mini App из Telegram. Приложение получит `initData` и `themeParams`

Документация: `Telegram Mini Apps` Web Apps API или `core.telegram.org/bots/webapps`

## Деплой (GitHub Pages)
- Создайте репозиторий на GitHub и отправьте код (см. ниже)
- Включите GitHub Pages (Settings → Pages) и укажите ветку `main` и папку `/root`

## Отправка в GitHub
Используя GitHub CLI:
```bash
cd /Users/romanlunkin/sculptor_twa
git add .
git commit -m "feat: адаптировать экран 'нет доступа' под дизайн Figma"
# Создать и отправить репозиторий
gh repo create sculptor_twa --public --source=. --remote=origin --push -y
```

## Заметки
- Вне Telegram показывает fallback интерфейс в браузере
- В Telegram включает Main Button для покупки, `sendData` и реагирует на изменения темы
- В продакшене убедитесь, что домен разрешен в настройках BotFather
- Кнопка "Купить" отправляет данные о намерении приобрести тренировку
