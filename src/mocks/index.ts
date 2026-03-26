let started = false;
let mswPromise: Promise<void> | null = null;

function startMSW() {
  if (started) return Promise.resolve();
  if (mswPromise) return mswPromise;
  mswPromise = import("./browser").then(({ worker }) =>
    worker.start({ onUnhandledRequest: "bypass" }).then(() => {
      started = true;
    }),
  );
  return mswPromise;
}

export async function initMocks() {
  if (typeof window === "undefined") return;
  return startMSW();
}
