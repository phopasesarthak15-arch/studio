'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Notification } from '@/lib/data-types';

export function useNotifications() {
  const { user } = useUser();
  const firestore = useFirestore();

  const notificationsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      orderBy('createdAt', 'desc'),
      limit(50) // Limit to the last 50 notifications for performance
    );
  }, [user, firestore]);

  const { data: notifications, isLoading, error } = useCollection<Notification>(notificationsQuery);

  const unreadCount = useMemo(() => {
    if (!notifications) return 0;
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return { notifications, unreadCount, isLoading, error };
}
