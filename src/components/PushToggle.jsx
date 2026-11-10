import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  isPushPermissionGranted, linkPushIdentity, loadOneSignal, requestPushPermission,
} from '../services/pushNotifications.js';

/** "Turn on order alerts" menu item. Renders nothing when push is not configured or already allowed. */
export default function PushToggle() {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isGranted, setIsGranted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadOneSignal().then(async (OneSignal) => {
      if (cancelled || !OneSignal) return;
      setIsAvailable(true);
      setIsGranted(await isPushPermissionGranted());
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (isAvailable && user?.pushId) linkPushIdentity(user.pushId); }, [isAvailable, user]);

  if (!isAvailable || isGranted) return null;
  const turnOn = async () => setIsGranted(await requestPushPermission());
  return <button type="button" className="mi" onClick={turnOn}><Bell />Turn on order alerts</button>;
}
