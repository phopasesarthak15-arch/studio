'use client';

import { useFirestore } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Notification } from '@/lib/data-types';
import { NotificationCard } from './notification-card';
import { Button } from '../ui/button';

interface NotificationPanelProps {
  notifications: Notification[];
  currentUserId: string;
  onClose: () => void;
}

export function NotificationPanel({ notifications, currentUserId, onClose }: NotificationPanelProps) {
  const firestore = useFirestore();

  const handleMarkAsRead = (notification: Notification) => {
    if (!firestore || notification.read) return;
    const notifRef = doc(firestore, `users/${currentUserId}/notifications`, notification.id);
    setDocumentNonBlocking(notifRef, { read: true }, { merge: true });
    if (notification.href) {
        onClose();
    }
  };
  
  const handleMarkAllAsRead = () => {
    if(!firestore) return;
    notifications.forEach(n => {
        if(!n.read) {
            const notifRef = doc(firestore, `users/${currentUserId}/notifications`, n.id);
            setDocumentNonBlocking(notifRef, { read: true }, { merge: true });
        }
    })
  }

  return (
    <div className="w-80 rounded-lg border bg-card text-card-foreground shadow-lg">
      <div className="p-3 border-b flex justify-between items-center">
        <h3 className="font-semibold">Notifications</h3>
        {notifications.some(n => !n.read) && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={handleMarkAllAsRead}>Mark all as read</Button>
        )}
      </div>
      <ScrollArea className="h-96">
        {notifications.length > 0 ? (
          <div className="flex flex-col">
            {notifications.map((n) => (
              <NotificationCard key={n.id} notification={n} onClick={() => handleMarkAsRead(n)} />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
            You have no new notifications.
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
