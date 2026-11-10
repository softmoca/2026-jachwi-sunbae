import NativeJachwiAppInfo, {
  type Spec as AppInfoModule,
} from './native/NativeJachwiAppInfo';

/** 웹에 알리는 앱 버전과 빌드 번호. 읽지 못하면 null이다. */
export type AppInfo = { appVersion: string | null; appBuild: string | null };

const VALUE = /^[0-9A-Za-z._+-]{1,32}$/;
const clean = (value: unknown): string | null =>
  typeof value === 'string' && VALUE.test(value.trim()) ? value.trim() : null;

/** 네이티브 모듈이 없거나 값이 이상해도 앱이 죽지 않게 null로 둔다. */
export const toAppInfo = (
  module: AppInfoModule | null | undefined,
): AppInfo => {
  if (!module) return { appVersion: null, appBuild: null };
  try {
    const info: unknown = module.getAppInfo();
    if (typeof info !== 'object' || info === null)
      return { appVersion: null, appBuild: null };
    const { appVersion, appBuild } = info as Record<string, unknown>;
    return { appVersion: clean(appVersion), appBuild: clean(appBuild) };
  } catch {
    return { appVersion: null, appBuild: null };
  }
};

export const readAppInfo = (): AppInfo => toAppInfo(NativeJachwiAppInfo);
