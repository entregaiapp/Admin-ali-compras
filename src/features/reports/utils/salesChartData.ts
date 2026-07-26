const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type SalesChartPoint = {
  day: string;
  vendas: number;
  start: string;
  end: string;
};

export const parseDateInput = (value: string) => {
  if (!DATE_INPUT_PATTERN.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const isSameDate = date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;

  return isSameDate ? date : null;
};

export const isValidDateInput = (value: string) => parseDateInput(value) !== null;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatChartLabel = (date: Date, endDate?: Date) => {
  const sameMonth = endDate
    && date.getMonth() === endDate.getMonth()
    && date.getFullYear() === endDate.getFullYear();
  return date.toLocaleDateString('pt-BR', sameMonth
    ? { day: '2-digit' }
    : { day: '2-digit', month: '2-digit' });
};

const getSalesPointDate = (point: any) => {
  const value = point?.date || point?.data || point?.dia || point?.created_at || point?.periodo;
  if (!value || typeof value !== 'string') return null;

  const date = value.includes('T') ? new Date(value) : parseDateInput(value.slice(0, 10));
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getSalesPointValue = (point: any) => {
  const value = point?.vendas ?? point?.valor ?? point?.total ?? point?.revenue ?? 0;
  const number = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
};

export const buildSalesChartData = (
  rawData: unknown,
  startDate: string,
  endDate: string
): SalesChartPoint[] => {
  const start = parseDateInput(startDate);
  if (!start) return [];

  const parsedEnd = parseDateInput(endDate);
  const end = parsedEnd && parsedEnd >= start ? parsedEnd : start;
  const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1);
  const bucketSize = totalDays <= 14 ? 1 : Math.ceil(totalDays / 12);
  const bucketCount = Math.max(1, Math.ceil(totalDays / bucketSize));

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = addDays(start, index * bucketSize);
    const bucketEnd = addDays(bucketStart, Math.min(bucketSize, totalDays - index * bucketSize) - 1);
    const label = bucketSize === 1
      ? formatChartLabel(bucketStart, end)
      : `${formatChartLabel(bucketStart, end)}-${formatChartLabel(bucketEnd, end)}`;

    return {
      day: label,
      vendas: 0,
      start: formatDateInput(bucketStart),
      end: formatDateInput(bucketEnd)
    };
  });

  const safeRawData = Array.isArray(rawData) ? rawData : [];
  const dataWithDates = safeRawData.filter(point => getSalesPointDate(point));

  if (dataWithDates.length > 0) {
    dataWithDates.forEach((point) => {
      const pointDate = getSalesPointDate(point);
      if (!pointDate || pointDate < start || pointDate > end) return;

      const bucketIndex = Math.floor(
        (pointDate.getTime() - start.getTime()) / DAY_MS / bucketSize
      );
      const bucket = Number.isInteger(bucketIndex) ? buckets[bucketIndex] : undefined;
      if (!bucket) return;

      bucket.vendas += getSalesPointValue(point);
    });
    return buckets;
  }

  if (safeRawData.length === bucketCount) {
    return buckets.map((bucket, index) => ({
      ...bucket,
      vendas: getSalesPointValue(safeRawData[index])
    }));
  }

  if (safeRawData.length === 1 && bucketCount === 1) {
    return [{ ...buckets[0], vendas: getSalesPointValue(safeRawData[0]) }];
  }

  return buckets;
};
