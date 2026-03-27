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
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import Link from "next/link";
import { PlusCircle, Tractor } from "lucide-react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/context/i18n-provider";

export default function OwnerDashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { t } = useI18n();

    const equipmentQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, "equipment"), where("ownerId", "==", user.uid));
    }, [user, firestore]);

    const { data: equipment, isLoading } = useCollection(equipmentQuery);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline">{t('my_equipment')}</h1>
                    <p className="text-muted-foreground">{t('manage_listings')}</p>
                </div>
                <Button asChild>
                    <Link href="/owner-dashboard/add-equipment">
                        <PlusCircle className="mr-2 h-4 w-4" /> {t('add_equipment')}
                    </Link>
                </Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading && Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-40 w-full" />
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-6 w-3/4 mb-2" />
                             <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}

                {equipment && equipment.map(item => (
                    <Card key={item.id} className="flex flex-col">
                        <CardHeader className="p-0">
                            <Image src={item.imageUrl} alt={item.name} width={400} height={250} className="rounded-t-lg object-cover aspect-video" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <CardTitle className="font-headline">{item.name}</CardTitle>
                            <CardDescription>{item.type}</CardDescription>
                        </CardContent>
                        <CardFooter className="mt-auto">
                            <Button variant="outline" className="w-full">{t('manage_listing')}</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {!isLoading && equipment?.length === 0 && (
                <Card className="text-center py-20">
                     <CardContent className="flex flex-col items-center gap-4">
                        <Tractor className="h-16 w-16 text-muted-foreground" />
                        <h3 className="text-xl font-semibold font-headline">{t('no_equipment_listed')}</h3>
                        <p className="text-muted-foreground">{t('add_first_equipment')}</p>
                        <Button asChild className="mt-4">
                             <Link href="/owner-dashboard/add-equipment">
                                <PlusCircle className="mr-2 h-4 w-4" /> {t('add_equipment')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
