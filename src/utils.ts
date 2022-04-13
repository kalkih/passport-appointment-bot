import path from "path";

export const getPath = (filepath: string): string => {
  if ((process as any).pkg) {
    return path.join(path.dirname(process.execPath), filepath);
  } else {
    return path.join(process.cwd(), filepath);
  }
};
