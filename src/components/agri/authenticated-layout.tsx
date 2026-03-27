
'use client';

import { useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { collection, doc, query, where } from 'firebase/firestore';
import type { DrivingJob } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { AppHeader } from '@/components/agri/app-header';
import { AppSidebar } from '@/components/agri/app-sidebar';
import { BottomNav } from '@/components/agri/bottom-nav';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppFooter } from './footer';

export function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard';

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData } = useDoc(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userData?.roles?.includes('ADMIN') && !pathname.startsWith('/admin')) {
      router.replace('/admin/dashboard');
    }
  }, [userData, pathname, router]);

  const isVerifiedDriver = userData?.driverStatus === 'VERIFIED';

  const openJobsQuery = useMemoFirebase(() => {
    if (!user || !firestore || !isVerifiedDriver) return null;
    return query(
      collection(firestore, 'driving-jobs'),
      where('status', '==', 'open')
    );
  }, [user, firestore, isVerifiedDriver]);

  const { data: openJobs } = useCollection<DrivingJob>(openJobsQuery);

  const availableJobsCount = useMemo(() => {
    if (!openJobs || !user) return 0;
    return openJobs.filter((job) => !job.rejectedBy?.includes(user.uid)).length;
  }, [openJobs, user]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar userData={userData} availableJobsCount={availableJobsCount} />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <AppHeader />
          <main
            className={cn(
              'flex-1 p-4 md:p-8 pb-20 md:pb-8',
              isDashboard ? 'bg-cover bg-center' : 'bg-muted/40'
            )}
            style={
              isDashboard
                ? {
                    backgroundImage:
                      "url('https://image2url.com/r2/default/images/1771521102799-94b27787-7f9f-4a3a-8442-2bf69073bf42.webp')",
                  }
                : {}
            }
          >
            {children}
          </main>
          {isDashboard && <AppFooter />}
          <BottomNav
            userData={userData}
            availableJobsCount={availableJobsCount}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
