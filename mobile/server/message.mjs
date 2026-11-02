export function buildMessage({ environment, token, title, body, path = '/' }) {
  if (!['development', 'production'].includes(environment))
    throw new Error('Invalid environment');
  if (typeof title !== 'string' || !title.trim() || title.length > 100)
    throw new Error('Invalid title');
  if (typeof body !== 'string' || !body.trim() || body.length > 500)
    throw new Error('Invalid body');
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\')
  ) {
    throw new Error('Use an internal path');
  }
  const base =
    environment === 'production'
      ? 'https://www.jachwi-sunbae.kr'
      : 'https://dev.jachwi-sunbae.kr';
  const url = new URL(path, base);
  if (url.origin !== base) throw new Error('Invalid destination');
  if (token !== undefined && (typeof token !== 'string' || !token.trim()))
    throw new Error('Invalid token');
  return {
    ...(token
      ? { token }
      : {
          topic:
            environment === 'production'
              ? 'jachwi-service-prod'
              : 'jachwi-service-dev',
        }),
    notification: { title, body },
    data: { url: url.href },
    android: {
      priority: 'high',
      notification: { icon: 'ic_notification', sound: 'default' },
    },
    apns: {
      headers: { 'apns-push-type': 'alert', 'apns-priority': '10' },
      payload: { aps: { sound: 'default' } },
    },
  };
}
