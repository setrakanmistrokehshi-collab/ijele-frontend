// The single OneSignal loader for the storefront. The app id comes from VITE_ONESIGNAL_APP_ID when set,
// otherwise from the API's /config endpoint. The SDK is loaded once, after the page is interactive, and every
// caller shares the same promise, so OneSignal is never initialised twice.
import { configApi } from './api.js';

const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
let sdkPromise = null;

async function findAppId() {
  if (import.meta.env.VITE_ONESIGNAL_APP_ID) return import.meta.env.VITE_ONESIGNAL_APP_ID;
  try {
    return (await configApi.get()).oneSignalAppId ?? null;
  } catch {
    return null;
  }
}

/** Resolves to the OneSignal SDK, or null when push is not configured or the SDK could not load. */
export function loadOneSignal() {
  sdkPromise ??= findAppId().then((appId) => {
    if (!appId) return null;
    return new Promise((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.init({
            appId,
            notifyButton: { enable: false }, // we show our own prompt
            promptOptions: { slidedown: { prompts: [{ type: 'push', autoPrompt: false }] } }, // never prompt automatically
          });
          resolve(OneSignal);
        } catch {
          resolve(null);
        }
      });
      document.head.appendChild(Object.assign(document.createElement('script'), {
        src: SDK_URL, defer: true, onerror: () => resolve(null),
      }));
    });
  });
  return sdkPromise;
}

/** True when the browser supports push and the visitor has not already said yes or no. */
export async function canAskForPushPermission() {
  const OneSignal = await loadOneSignal();
  return Boolean(OneSignal) && OneSignal.Notifications.permissionNative === 'default';
}

/** Asks the browser for push permission. Resolves true if the visitor allowed it. */
export async function requestPushPermission() {
  const OneSignal = await loadOneSignal();
  if (!OneSignal) return false;
  await OneSignal.Slidedown.promptPush();
  return OneSignal.Notifications.permissionNative === 'granted';
}

export async function isPushPermissionGranted() {
  const OneSignal = await loadOneSignal();
  return Boolean(OneSignal?.Notifications.permission);
}

/** Ties this browser to an opaque push id the server issued after it verified the customer's email. */
export async function linkPushIdentity(pushId) {
  if (!pushId) return;
  const OneSignal = await loadOneSignal();
  try { await OneSignal?.login(pushId); } catch { /* non-critical */ }
}

/** Unlinks the browser on sign-out so notifications no longer go to this device. */
export async function unlinkPushIdentity() {
  const OneSignal = await loadOneSignal();
  try { await OneSignal?.logout(); } catch { /* non-critical */ }
}
