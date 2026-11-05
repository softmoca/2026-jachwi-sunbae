import { UNSAFE_createBrowserHistory } from 'react-router-dom';

type History = ReturnType<typeof UNSAFE_createBrowserHistory>;
type Update = Parameters<Parameters<History['listen']>[0]>[0];

const unsafeNavigationWarning =
  '일부 체크 항목을 저장하지 못했어요. 이대로 이동하면 저장되지 않은 입력을 잃을 수 있어요. 그래도 이동할까요?';

type NavigationGuard = {
  shouldFlush: () => boolean;
  flush: () => Promise<boolean>;
  onFlushFailure: () => void;
};

let activeGuard: NavigationGuard | null = null;

export const registerNavigationGuard = (guard: NavigationGuard) => {
  activeGuard = guard;
  return () => {
    if (activeGuard === guard) activeGuard = null;
  };
};

const shouldProceed = async (guard: NavigationGuard) => {
  try {
    const saved = await guard.flush();
    return saved || window.confirm(unsafeNavigationWarning);
  } catch {
    return false;
  }
};

export const createGuardedHistory = (history: History): History => {
  let navigationInProgress = false;
  let bypassNextPop = false;
  let restoringPop: { delta: number; guard: NavigationGuard } | null = null;

  const runGuardedNavigation = (navigate: () => void) => {
    const guard = activeGuard;
    if (guard === null || !guard.shouldFlush()) {
      navigate();
      return;
    }
    if (navigationInProgress) return;

    navigationInProgress = true;
    void shouldProceed(guard)
      .then((proceed) => {
        if (proceed) navigate();
        else guard.onFlushFailure();
      })
      .finally(() => {
        navigationInProgress = false;
      });
  };

  const handlePop = (update: Update, listener: (update: Update) => void) => {
    if (bypassNextPop) {
      bypassNextPop = false;
      listener(update);
      return;
    }

    if (restoringPop !== null) {
      const pending = restoringPop;
      restoringPop = null;
      void shouldProceed(pending.guard)
        .then((proceed) => {
          if (proceed) {
            bypassNextPop = true;
            history.go(pending.delta);
          } else {
            pending.guard.onFlushFailure();
          }
        })
        .finally(() => {
          navigationInProgress = false;
        });
      return;
    }

    const guard = activeGuard;
    if (
      update.action !== 'POP' ||
      update.delta === null ||
      update.delta === 0 ||
      guard === null ||
      !guard.shouldFlush()
    ) {
      listener(update);
      return;
    }

    if (navigationInProgress) return;
    navigationInProgress = true;
    restoringPop = { delta: update.delta, guard };
    history.go(-update.delta);
  };

  return {
    get action() {
      return history.action;
    },
    get location() {
      return history.location;
    },
    createHref: (to) => history.createHref(to),
    createURL: (to) => history.createURL(to),
    encodeLocation: (to) => history.encodeLocation(to),
    push: (to, state) => runGuardedNavigation(() => history.push(to, state)),
    replace: (to, state) => runGuardedNavigation(() => history.replace(to, state)),
    go: (delta) => history.go(delta),
    listen: (listener) => history.listen((update) => handlePop(update, listener)),
  };
};
