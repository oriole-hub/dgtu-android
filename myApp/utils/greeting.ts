/** Фраза с «!» — для анимации на экране приветствия входа */
export function timeOfDayGreetingExclaimed(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Доброе утро!';
  if (h >= 12 && h < 17) return 'Добрый день!';
  if (h >= 17 && h < 23) return 'Добрый вечер!';
  return 'Доброй ночи!';
}

/** Без восклицательного знака — перед именем: «Доброе утро, Иван!» */
export function timeOfDayGreetingPrefix(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 17) return 'Добрый день';
  if (h >= 17 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}
