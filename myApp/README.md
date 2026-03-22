# Ростелеком — мобильное приложение

Кроссплатформенное приложение на **Expo** (Android, iOS, Web): вход, PIN / биометрия, личный кабинет сотрудника, QR‑пропуск, календарь посещаемости, карта офиса.

## Стек

- **Expo SDK** ~54, **React Native** 0.81, **React** 19  
- **expo-router** — маршрутизация по файлам в `app/`  
- **TypeScript**

## Требования

- Node.js (LTS)  
- npm или совместимый менеджер пакетов

## Установка и запуск

```bash
cd myApp
npm install
```

| Команда | Назначение |
|--------|------------|
| `npm run start` / `npx expo start` | Dev-сервер Metro |
| `npm run android` | Сборка и запуск на Android |
| `npm run ios` | Сборка и запуск на iOS |
| `npm run web` | Запуск в браузере |
| `npm run lint` | ESLint (`expo lint`) |

В терминале Expo можно открыть эмулятор, **Expo Go** или веб.

## API и окружение

Базовый URL API задаётся в `utils/config.ts`:

- **`EXPO_PUBLIC_API_BASE_URL`** — явный базовый URL (с завершающим `/` или без; в коде нормализуется).  
- Если переменная не задана: на **нативе** по умолчанию используется `https://dstu.devoriole.ru`.  
- **Web + `__DEV__`**: запросы идут на тот же origin, что и Metro (`/api/dstu/...`), с прокси в `metro.config.js` (обход CORS).

Пример `.env` в корне `myApp` (при необходимости):

```env
EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com
```

## Структура проекта

| Путь | Содержимое |
|------|------------|
| `app/` | Экраны и layout (`_layout.tsx`, `login.tsx`, `index.tsx`, `dashboard.tsx`, …) |
| `components/` | Переиспользуемые UI (кнопки, панели, PIN‑клавиатура, …) |
| `features/employee-dashboard/` | Экран дашборда, календарь, карта, модалки |
| `utils/` | API (`api.ts`, `auth.ts`), конфиг, геокодинг, PIN |
| `assets/` | Шрифты Rostelecom Basis, изображения |
| `constants/` | Темы, шрифты |

## Основные возможности

- Вход по логину/паролю, восстановление пароля (если поддерживается бэкендом)  
- Локальный PIN и **биометрия** (Face ID / отпечаток) для быстрого входа  
- Профиль и статистика из **`GET /auth/me`**  
- Генерация и отображение **QR‑пропуска**  
- Календарь посещаемости  
- Карта: офис и пользователь (**Yandex** через WebView, при необходимости геокодинг адреса)

## Сборка продакшена

Используйте [EAS Build](https://docs.expo.dev/build/introduction/) и настройки в `app.json` / `eas.json` (при наличии). Имя приложения в сторе и иконки задаются в `app.json` (`expo.name`, `expo.android.package`, и т.д.).

## Лицензия

Приватный проект (`"private": true` в `package.json`).
