"use client";

import { useState } from "react";
import { useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase, sendNotification } from "@/firebase";
import { doc, collection, serverTimestamp } from "firebase/firestore";
import type { Booking, Equipment } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Loader2, Phone, MapPin, Calendar, Clock, User as UserIcon } from "lucide-react";
import { format } from 'date-fns';
import { useI18n } from "@/context/i18n-provider";

function FarmerDetails({ farmerId }: { farmerId: string }) {
    const firestore = useFirestore();
    const { t } = useI18n();
    const farmerDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', farmerId) : null, [firestore, farmerId]);
    const { data: farmer, isLoading } = useDoc(farmerDocRef);

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">{t('loading_farmer_details')}</div>;
    }
    if (!farmer) {
        return <div className="text-sm text-destructive">{t('farmer_details_not_found')}</div>;
    }

    return (
        <div className="space-y-2 mt-2 pt-4 border-t">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={farmer.profilePictureUrl || undefined} />
                    <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                </Avatar>
                <span className="font-semibold text-base">{farmer.name}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{farmer.contactPhoneNumber}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{farmer.villageTehsil}</span>
            </div>
        </div>
    );
}


export function OwnerBookingCard({ booking }: { booking: Booking }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState<null | 'accepted' | 'rejected'>(null);
    const { t } = useI18n();

    const handleUpdateStatus = async (status: 'accepted' | 'rejected') => {
        if (!firestore || isUpdating) return;
        setIsUpdating(status);
        const bookingRef = doc(firestore, 'bookings', booking.id);
        try {
            const updateData = { status, updatedAt: serverTimestamp(), statusChangeAcknowledged: false };
            await setDocumentNonBlocking(bookingRef, updateData, { merge: true });

            const title = status === 'accepted' ? 'Booking Accepted' : 'Booking Rejected';
            const description = `Your booking for ${booking.equipmentName} has been ${status}.`;
            sendNotification(booking.farmerId, {
                title,
                description,
                href: `/my-bookings`
            });

            toast({
                title: t('toast_booking_status_changed_owner', { status }),
                description: t('toast_booking_status_desc_owner', { status }),
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: t('toast_update_failed'),
                description: error.message || t('toast_update_failed_desc'),
            });
            setIsUpdating(null); // Reset on error
        }
        // On success, component will unmount, no need to reset state
    };

    return (
        <Card>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={booking.id} className="border-b-0">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-grow">
                                <p className="font-semibold">{t('request_for_equipment', { equipmentName: booking.equipmentName })}</p>
                                 {booking.equipmentAttachments && booking.equipmentAttachments.length > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        {booking.equipmentAttachments.map(att => <p key={att.name}>+ {att.name}</p>)}
                                    </div>
                                )}
                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{booking.startDate.toDate ? format(booking.startDate.toDate(), 'PP') : ''}</span>
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                     <Clock className="h-4 w-4" />
                                     <span>{booking.duration} {booking.bookingType === 'daily' ? t('days_plural') : t('hours_plural')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <p className="font-bold text-lg whitespace-nowrap">Rs. {booking.totalPrice.toFixed(2)}</p>
                                <AccordionTrigger className="p-2 ml-auto sm:ml-2 hover:no-underline rounded-md hover:bg-muted" />
                                <div className="flex gap-2">
                                    {isUpdating ? (
                                        <Button size="icon" disabled>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </Button>
                                    ) : (
                                        <>
                                            <Button aria-label={t('accept')} size="icon" variant="outline" className="text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700 h-9 w-9" onClick={() => handleUpdateStatus('accepted')}><Check className="h-5 w-5"/></Button>
                                            <Button aria-label={t('reject')} size="icon" variant="outline" className="text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700 h-9 w-9" onClick={() => handleUpdateStatus('rejected')}><X className="h-5 w-5"/></Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <AccordionContent className="px-4 pb-4">
                        <FarmerDetails farmerId={booking.farmerId} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    )
}
