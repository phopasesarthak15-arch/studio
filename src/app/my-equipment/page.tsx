"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import Link from "next/link";
import { PlusCircle, Tractor, Trash2, Loader2, Eye } from "lucide-react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/context/i18n-provider";
import { Badge } from "@/components/ui/badge";
import type { Attachment } from "@/lib/data";

export default function MyEquipmentPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useI18n();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const equipmentQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, "equipment"), where("ownerId", "==", user.uid));
    }, [user, firestore]);

    const { data: equipment, isLoading } = useCollection(equipmentQuery);

    const handleDelete = async (equipmentId: string) => {
        if (!firestore) return;
        setIsDeleting(equipmentId);
        try {
            const equipmentRef = doc(firestore, 'equipment', equipmentId);
            await deleteDocumentNonBlocking(equipmentRef);
            toast({
                title: t('toast_equipment_deleted'),
                description: t('toast_equipment_removed'),
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: t('toast_deletion_failed'),
                description: error.message || t('toast_error_deleting'),
            });
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline">{t('my_equipment')}</h1>
                    <p className="text-muted-foreground">{t('manage_listings')}</p>
                </div>
                <Button asChild>
                    <Link href="/my-equipment/add">
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
                            {item.attachments && item.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-2">
                                    {item.attachments.map((att: Attachment) => (
                                        <Badge key={att.name} variant="secondary" className="text-xs font-semibold"> + {att.name}</Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="mt-auto flex flex-col gap-2">
                            <Button asChild variant="outline" className="w-full">
                                <Link href={`/equipment/${item.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Listing
                                </Link>
                            </Button>
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full" disabled={isDeleting === item.id}>
                                        {isDeleting === item.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="mr-2 h-4 w-4" />
                                        )}
                                        {t('delete_listing')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('toast_cannot_be_undone_equipment')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(item.id)}>
                                            {t('continue')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
                             <Link href="/my-equipment/add">
                                <PlusCircle className="mr-2 h-4 w-4" /> {t('add_equipment')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
