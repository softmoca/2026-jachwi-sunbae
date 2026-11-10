/** 지금은 쓰지 않는 기능이 예전 브라우저에 남긴 키의 접두사. 없앤 예시 매물의 닫은 기록이 여기에 든다. */
const LEGACY_KEY_PREFIXES = ['jachwi-sunbae:example-property:'] as const;

/** 앱을 시작할 때 한 번 불러, 더는 읽지 않는 키를 브라우저에서 지운다. */
export const removeLegacyStorageKeys = (storage?: Storage): void => {
  try {
    const target = storage ?? window.localStorage;
    // 지우는 동안 순서가 당겨지므로 지울 키를 먼저 모은다.
    const keys = Array.from({ length: target.length }, (_, index) => target.key(index)).filter(
      (key): key is string => key !== null && LEGACY_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)),
    );
    for (const key of keys) target.removeItem(key);
  } catch {
    /* 저장소를 막아 둔 브라우저에는 남은 키도 없다. */
  }
};
