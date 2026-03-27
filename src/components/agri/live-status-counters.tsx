
'use client';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { useI18n } from '@/context/i18n-provider';

interface UserCounts {
    farmers?: number;
    equipmentOwners?: number;
    drivers?: number;
}

const CounterCard = ({ title, count, isLoading }: { title: string, count?: number, isLoading: boolean }) => (
    <Card className="text-center bg-background/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-10 w-20 mx-auto" />
            ) : (
                <div className="text-4xl font-bold text-primary">{Math.max(0, Math.floor(count || 0))}</div>
            )}
        </CardContent>
    </Card>
);

export function LiveStatusCounters() {
    const firestore = useFirestore();
    const { t } = useI18n();
    const statsDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'publicStats', 'userCounts');
    }, [firestore]);

    const { data: userCounts, isLoading } = useDoc<UserCounts>(statsDocRef);

    return (
        <div>
            <h3 className="text-lg font-bold font-headline text-soil-brown mb-4 text-center">{t('live_community_stats')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CounterCard title={t('total_farmers')} count={userCounts?.farmers} isLoading={isLoading} />
                <CounterCard title={t('total_equipment_owners')} count={userCounts?.equipmentOwners} isLoading={isLoading} />
                <CounterCard title={t('total_drivers')} count={userCounts?.drivers} isLoading={isLoading} />
            </div>
        </div>
    );
}
