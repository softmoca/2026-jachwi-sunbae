import { readInteger, readRecord, readString } from '@/shared/api/responseParsers';

type Session = { token: string; expiresAt: number };

class GoodPriceServerError extends Error {
  constructor(readonly status: number) {
    super('가게 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}

const readData = async (response: Response): Promise<unknown> => {
  if (!response.ok) throw new GoodPriceServerError(response.status);
  const envelope = readRecord(await response.json());
  if (envelope.code !== 'SUCCESS' || !Object.prototype.hasOwnProperty.call(envelope, 'data')) {
    throw new Error('가게 서버의 응답 형식이 올바르지 않습니다.');
  }
  return envelope.data;
};

// 프로토타입의 목 로그인과 분리한다. 실제 토큰은 메모리에만 보관하며 가게 조회에만 사용한다.
export const createGoodPriceServerClient = (baseUrl: string) => {
  let session: Session | null = null;
  let pendingAuthentication: Promise<Session> | null = null;
  const url = (path: string) => new URL(path, baseUrl).toString();

  const authenticate = async (): Promise<Session> => {
    let response = await fetch(url('/api/auth/refresh'), { method: 'POST', credentials: 'include' });
    if (response.status === 401) {
      response = await fetch(url('/api/auth/login'), { method: 'POST', credentials: 'include' });
    }
    const data = readRecord(await readData(response));
    if (data.tokenType !== 'Bearer') throw new Error('인증 응답 형식이 올바르지 않습니다.');
    return {
      token: readString(data, 'accessToken'),
      expiresAt: Date.now() + readInteger(data, 'expiresIn', 1) * 1000,
    };
  };

  const getSession = (): Promise<Session> => {
    if (session !== null && session.expiresAt > Date.now() + 5000) return Promise.resolve(session);
    if (pendingAuthentication !== null) return pendingAuthentication;
    pendingAuthentication = authenticate()
      .then((next) => {
        session = next;
        return next;
      })
      .finally(() => {
        pendingAuthentication = null;
      });
    return pendingAuthentication;
  };

  return async (parameters: URLSearchParams, signal?: AbortSignal): Promise<unknown> => {
    signal?.throwIfAborted();
    const request = async (current: Session) => {
      signal?.throwIfAborted();
      return fetch(url(`/api/maps/good-price-stores?${parameters}`), {
        headers: { Authorization: `Bearer ${current.token}` },
        signal,
      });
    };
    const current = await getSession();
    let response = await request(current);
    if (response.status === 401) {
      signal?.throwIfAborted();
      if (session === current) session = null;
      response = await request(await getSession());
    }
    return readData(response);
  };
};

const clients = new Map<string, ReturnType<typeof createGoodPriceServerClient>>();

export const fetchGoodPriceServerData = (baseUrl: string, parameters: URLSearchParams, signal?: AbortSignal) => {
  let client = clients.get(baseUrl);
  if (client === undefined) {
    client = createGoodPriceServerClient(baseUrl);
    clients.set(baseUrl, client);
  }
  return client(parameters, signal);
};
