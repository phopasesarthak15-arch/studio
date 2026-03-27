
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/context/i18n-provider";

export default function SahayakPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { t } = useI18n();

    const usersColRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'users');
    }, [firestore, user]);
    const { data: users, isLoading } = useCollection(usersColRef);

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">{t('book_for_farmer')}</CardTitle>
                        <CardDescription>{t('select_farmer_to_book')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border rounded-md">
                            <div className="divide-y">
                                {isLoading && (
                                    <>
                                        <Skeleton className="h-16 w-full" />
                                        <Skeleton className="h-16 w-full" />
                                        <Skeleton className="h-16 w-full" />
                                    </>
                                )}
                                {users && users.filter(f => f.id !== user?.uid).map(farmer => (
                                    <div key={farmer.id} className="flex items-center justify-between p-4">
                                        <div>
                                            <p className="font-semibold">{farmer.name}</p>
                                            <p className="text-sm text-muted-foreground">{farmer.villageTehsil} - {farmer.contactPhoneNumber}</p>
                                        </div>
                                        <Button asChild>
                                            <Link href={`/equipment?beneficiaryId=${farmer.id}`}>
                                                {t('book_for_this_farmer')}
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                                {users && users.length <= 1 && !isLoading && (
                                    <div className="p-4 text-center text-muted-foreground">
                                        {t('no_other_users')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div>
                 <Card className="bg-primary text-primary-foreground">
                    <CardHeader>
                        <CardTitle className="font-headline">{t('commission_tracker')}</CardTitle>
                        <CardDescription className="text-primary-foreground/80">{t('earnings_this_week')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-5xl font-bold">Rs. 500</p>
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-primary-foreground/80">{t('updated_just_now')}</p>
                    </CardFooter>
                 </Card>
            </div>
        </div>
    );
}
