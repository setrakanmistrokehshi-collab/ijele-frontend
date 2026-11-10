import { useEffect, useState } from 'react';
import { canAskForPushPermission, requestPushPermission } from '../services/pushNotifications.js';

const DISMISSED_KEY = 'push_dismissed';
const SHOW_AFTER_MS = 8000;

/**
 * A small, dismissable prompt shown once when the customer has neither given nor refused push permission.
 * It waits until the visitor has been on the page for 8 seconds, so it does not fire on every quick visit.
 */
export default function PushPrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return undefined;
    const timer = setTimeout(async () => {
      if (await canAskForPushPermission()) setIsVisible(true);
    }, SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  async function handleAllow() {
    setIsVisible(false);
    await requestPushPermission();
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setIsVisible(false);
  }

  if (!isVisible) return null;
  return (
    <div className="push-prompt" role="dialog" aria-label="Push notifications">
      <p><strong>Stay in the loop</strong><br />Get notified when your order ships, and hear about new arrivals first.</p>
      <div className="push-prompt-btns">
        <button type="button" className="cta" onClick={handleAllow}>Allow notifications</button>
        <button type="button" onClick={handleDismiss}>No thanks</button>
      </div>
    </div>
  );
}
