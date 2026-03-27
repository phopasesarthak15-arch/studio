'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { type Notification } from '@/lib/data-types';

export function NotificationCard({ notification, onClick }: { notification: Notification, onClick: () => void }) {
  const content = (
    <div
      onClick={onClick}
      className={cn(
        'block w-full p-3 text-sm transition-colors hover:bg-muted/50 border-b',
        !notification.read && 'bg-primary/5'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{notification.title}</p>
        {!notification.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
      </div>
      <p className="text-muted-foreground text-xs">{notification.description}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
      </p>
    </div>
  );

  const wrapperProps = notification.href ? { href: notification.href } : {};
  const Wrapper = notification.href ? Link : 'div';

  return <Wrapper {...wrapperProps}>{content}</Wrapper>;
}
