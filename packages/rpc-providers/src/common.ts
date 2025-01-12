import axios, { AxiosResponse } from "axios";

export const timeout = <T>(prom: Promise<T>, timeoutMS: number): Promise<T> => {
  let timer: NodeJS.Timeout;
  return Promise.race<T>([
    prom,
    new Promise(
      (_r, reject) =>
        (timer = setTimeout(
          () => reject(new Error(`Timeout error ${timeoutMS} [MS]`)),
          timeoutMS
        ))
    ),
  ]).finally(() => clearTimeout(timer));
};

export const sleepMS = (ms: number) =>
  new Promise((resolve, reject) => setTimeout(resolve, ms));

const FETCH_CACHE: Record<
  string,
  { response: AxiosResponse; capturedAt: number }
> = {};
export const fetchWithCache = async <T>(url: string, ttl: number) => {
  if (FETCH_CACHE[url] && Date.now() - FETCH_CACHE[url].capturedAt <= ttl) {
    return FETCH_CACHE[url].response as AxiosResponse<T>;
  }
  const capturedAt = Date.now();
  const response = await axios.get(url);

  FETCH_CACHE[url] = { response, capturedAt };

  return response as AxiosResponse<T>;
};
