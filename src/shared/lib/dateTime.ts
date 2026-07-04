export const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

const dateInputFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRASILIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BRASILIA_TIME_ZONE,
  month: 'numeric',
});

const hourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BRASILIA_TIME_ZONE,
  hour: 'numeric',
  hourCycle: 'h23',
});

const dateTimeInputFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRASILIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const getFormatterPart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
  parts.find((part) => part.type === type)?.value || '';

export function dateInputInBrasilia(value: Date | string = new Date()) {
  return dateInputFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

export function dateTimeInputInBrasilia(value: Date | string | null | undefined) {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const parts = dateTimeInputFormatter.formatToParts(date);
  return [
    getFormatterPart(parts, 'year'),
    getFormatterPart(parts, 'month'),
    getFormatterPart(parts, 'day'),
  ].join('-') + `T${getFormatterPart(parts, 'hour')}:${getFormatterPart(parts, 'minute')}`;
}

export function monthInBrasilia(value: Date = new Date()) {
  return monthFormatter.format(value);
}

export function hourInBrasilia(value: Date = new Date()) {
  return Number(hourFormatter.format(value));
}

export function formatBrasiliaDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short' },
) {
  return new Intl.DateTimeFormat('pt-BR', {
    ...options,
    timeZone: BRASILIA_TIME_ZONE,
  }).format(typeof value === 'string' ? new Date(value) : value);
}

export function formatBrasiliaTime(value: Date | string) {
  return formatBrasiliaDate(value, { hour: '2-digit', minute: '2-digit' });
}

export function startOfBrasiliaDayInput(value: string) {
  return value ? `${value}T00:00:00.000` : null;
}

export function endOfBrasiliaDayInput(value: string) {
  return value ? `${value}T23:59:59.999` : null;
}
