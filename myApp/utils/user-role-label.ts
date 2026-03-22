/** Подписи ролей; ключи не обязаны совпадать с enum OpenAPI (например `manager` с другого бэка). */
const ROLE_LABEL_RU: Record<string, string> = {
  employee: 'Сотрудник',
  guest: 'Гость',
  manager: 'Руководитель',
  office_head: 'Руководитель',
  admin: 'Администратор',
};

/** Человекочитаемая роль для UI (GET /auth/me и т.п.). */
export function userRoleLabelRu(role: string | null | undefined): string {
  if (role == null || role === '') return '—';
  return ROLE_LABEL_RU[role] ?? String(role);
}
