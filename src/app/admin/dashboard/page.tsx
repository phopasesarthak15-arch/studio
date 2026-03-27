
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, sendNotification, useUser } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { User } from '@/lib/data-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User as UserIcon, ShieldQuestion } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function DriverKycDialog({ driver, children }: { driver: User; children: React.ReactNode }) {
  const firestore = useFirestore();
  const [loading, setLoading] = useState<false | 'VERIFIED' | 'REJECTED'>(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleVerification = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!firestore) return;
    setLoading(status);
    const userDocRef = doc(firestore, 'users', driver.id);
    try {
      await setDocumentNonBlocking(userDocRef, { driverStatus: status, updatedAt: new Date().toISOString() }, { merge: true });
      
      sendNotification(driver.id, {
          title: `Driver Verification ${status}`,
          description: `Your driver application has been ${status.toLowerCase()}.`,
          href: '/driver-dashboard'
      });
      
      toast({
        title: `Driver ${status.toLowerCase()}`,
        description: `${driver.name}'s application has been ${status.toLowerCase()}.`,
      });
      setIsOpen(false);
    } catch (e: any) {
      toast({
        title: 'Update Failed',
        description: e.message || 'Could not update driver status.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Driver: {driver.name}</DialogTitle>
          <DialogDescription>Review the license and approve or reject the application.</DialogDescription>
        </DialogHeader>
        {driver.driverLicenseImageUrl ? (
            <div className="relative mt-4 h-64 w-full bg-muted rounded-md overflow-hidden">
                <Image
                    src={driver.driverLicenseImageUrl}
                    alt={`${driver.name}'s License`}
                    fill
                    className="object-contain"
                />
            </div>
        ) : (
            <Alert variant="destructive">
                <AlertTitle>No License Image</AlertTitle>
                <AlertDescription>This user has not uploaded a license image.</AlertDescription>
            </Alert>
        )}
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button
            variant="destructive"
            onClick={() => handleVerification('REJECTED')}
            disabled={!!loading}
          >
             {loading === 'REJECTED' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reject
          </Button>
          <Button 
            onClick={() => handleVerification('VERIFIED')} 
            disabled={!!loading || !driver.driverLicenseImageUrl}
          >
             {loading === 'VERIFIED' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const pendingDriversQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users'),
      where('roles', 'array-contains', 'DRIVER'),
      where('driverStatus', '==', 'PENDING')
    );
  }, [firestore, user]);

  const { data: pendingDrivers, isLoading } = useCollection<User>(pendingDriversQuery);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Driver KYC Verification</CardTitle>
          <CardDescription>Review and approve pending driver applications.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {!isLoading && (!pendingDrivers || pendingDrivers.length === 0) && (
            <Alert>
                <ShieldQuestion className="h-4 w-4" />
                <AlertTitle>All Clear!</AlertTitle>
                <AlertDescription>There are no pending driver verifications at this time.</AlertDescription>
            </Alert>
          )}
          {!isLoading && pendingDrivers && pendingDrivers.length > 0 && (
            <div className="space-y-4">
              {pendingDrivers.map((driver) => (
                <DriverKycDialog key={driver.id} driver={driver}>
                    <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={driver.profilePictureUrl || undefined} />
                                <AvatarFallback><UserIcon /></AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{driver.name}</p>
                                <p className="text-sm text-muted-foreground">{driver.contactPhoneNumber}</p>
                            </div>
                        </div>
                        <Button variant="secondary">Review</Button>
                    </div>
                </DriverKycDialog>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
