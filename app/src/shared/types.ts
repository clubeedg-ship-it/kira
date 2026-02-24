export {};

declare global {
  namespace Express {
    interface Request {
      userId: string;
      params: Record<string, string>;
    }
  }
}
