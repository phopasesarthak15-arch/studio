'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/firebase/firestore/use-notifications';
import { NotificationPanel } from './notification-panel';
import { useUser } from '@/firebase';
import { Skeleton } from '../ui/skeleton';

export function NotificationBell() {
  const { user } = useUser();
  const { notifications, unreadCount, isLoading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        {isLoading || !user ? (
            <div className="w-80 p-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        ) : (
            <NotificationPanel 
                notifications={notifications || []} 
                currentUserId={user.uid}
                onClose={() => setIsOpen(false)}
            />
        )}
      </PopoverContent>
    </Popover>
  );
}
