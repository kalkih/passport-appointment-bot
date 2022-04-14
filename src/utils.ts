import path from "path";

export const getPath = (filepath: string): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((process as any).pkg) {
    return path.join(path.dirname(process.execPath), filepath);
  } else {
    return path.join(process.cwd(), filepath);
  }
};

export const shuffleArray = <T>(array: T[]) => {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
};

export const randomDate = (start: Date, end: Date): Date => {
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  date.setUTCHours(12, 0, 0, 0);
  return date;
};

export const getToday = (): Date => {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  return date;
};

export const getMaxDate = (maxDate: string): Date => {
  const date = new Date(maxDate);
  date.setUTCHours(12, 0, 0, 0);
  return date;
};

export const getStartOfWeekDate = (inDate: string | Date): Date => {
  const date = new Date(inDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day == 0 ? -6 : 1);
  date.setDate(diff);
  return date;
};

export const addDays = (inDate: string | Date) => {
  const date = new Date(inDate);
  date.setDate(date.getDate() + 7);
  return date;
};

export const getShortDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};
