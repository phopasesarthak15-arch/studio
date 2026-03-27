
"use client";

import { useState } from "react";
import { useFirestore, useUser, setDocumentNonBlocking, useDoc, useMemoFirebase, sendNotification } from "@/firebase";
import { doc, collection, serverTimestamp, writeBatch } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Booking } from "@/lib/data";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Loader2, Info, Star, CreditCard, User as UserIcon, BadgeCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RatingForm } from "./rating-form";
import { useI18n } from "@/context/i18n-provider";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const statusColors: { [key: string]: string } = {
    pending: "bg-yellow-500 hover:bg-yellow-600",
    accepted: "bg-green-500 hover:bg-green-600",
    rejected: "bg-red-500 hover:bg-red-600",
    cancelled: "bg-gray-500 hover:bg-gray-600",
    completion_pending: "bg-purple-500 hover:bg-purple-600",
    completed: "bg-blue-500 hover:bg-blue-600",
};

const DriverDetails = ({ driverId }: { driverId: string }) => {
    const firestore = useFirestore();
    const driverDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', driverId) : null, [firestore, driverId]);
    const { data: driver } = useDoc(driverDocRef);

    if (!driver) {
        return (
             <div className="mt-4 flex items-center gap-2 rounded-md bg-blue-50 p-3 text-blue-800 border border-blue-200">
                <BadgeCheck className="h-5 w-5" />
                <p className="text-sm font-semibold">Driver Appointed</p>
            </div>
        )
    }

    return (
        <div className="mt-4 flex flex-col gap-2 rounded-md bg-blue-50 p-3 text-blue-800 border border-blue-200">
             <div className="flex items-center gap-2 font-semibold">
                <BadgeCheck className="h-5 w-5" />
                <p className="text-sm">Driver Appointed</p>
             </div>
             <div className="flex items-center gap-2 pl-1">
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={driver.profilePictureUrl || undefined} />
                    <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-medium">{driver.name}</p>
                    <p className="text-xs">{driver.contactPhoneNumber}</p>
                </div>
             </div>
        </div>
    )
}

export function BookingCard({ booking }: { booking: Booking }) {
    const firestore = useFirestore();
    const user = useUser();
    const { toast } = useToast();
    const { t } = useI18n();
    const [isCancelling, setIsCancelling] = useState(false);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

    const handleCancelBooking = async () => {
        if (!firestore) return;
        setIsCancelling(true);
        const bookingRef = doc(firestore, 'bookings', booking.id);
        try {
            await setDocumentNonBlocking(bookingRef, { status: 'cancelled', updatedAt: new Date() }, { merge: true });
            sendNotification(booking.ownerId, {
                title: 'Booking Cancelled',
                description: `The booking for ${booking.equipmentName} has been cancelled by the farmer.`,
                href: '/owner-bookings'
            });
            toast({
                title: t('toast_booking_cancelled'),
                description: t('toast_booking_cancelled_desc'),
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: t('toast_cancellation_failed'),
                description: error.message,
            });
            setIsCancelling(false);
        }
    };
    
    const handleWorkCompleted = async () => {
        if (!firestore) return;
        setIsCompleting(true);
        const bookingRef = doc(firestore, 'bookings', booking.id);
        try {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await setDocumentNonBlocking(bookingRef, {
                status: 'completion_pending',
                completionOtp: otp,
                updatedAt: new Date()
            }, { merge: true });
            
            sendNotification(booking.ownerId, {
                title: 'Completion Pending',
                description: `The farmer has marked the job for ${booking.equipmentName} as complete. Please verify with the OTP.`,
                href: '/owner-bookings'
            });
    
            toast({
                title: t('toast_work_completed'),
                description: t('toast_share_otp'),
                duration: 10000,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: t('toast_update_failed'),
                description: error.message,
            });
            setIsCompleting(false); // only reset on error
        }
    };

    const handleConfirmPayment = async () => {
        if (!firestore) return;
        setIsPaying(true);
        
        const bookingRef = doc(firestore, 'bookings', booking.id);
        const newJobRef = doc(collection(firestore, 'driving-jobs'));
        const batch = writeBatch(firestore);

        try {
            // Stage the creation of the new driving job
            const drivingJobData = {
                id: newJobRef.id,
                bookingId: booking.id,
                equipmentId: booking.equipmentId,
                equipmentName: booking.equipmentName,
                equipmentVillage: booking.equipmentVillage,
                farmerId: booking.farmerId,
                ownerId: booking.ownerId,
                status: 'open',
                driverId: null,
                rejectedBy: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            batch.set(newJobRef, drivingJobData);

            // Stage the update of the booking
            batch.update(bookingRef, { 
                paymentStatus: 'completed', 
                drivingJobId: newJobRef.id,
                updatedAt: serverTimestamp() 
            });
            
            // Atomically commit both operations
            await batch.commit();

            sendNotification(booking.ownerId, {
                title: 'Payment Confirmed',
                description: `The farmer has confirmed payment for the booking of ${booking.equipmentName}. A driving job has been created.`,
                href: '/owner-bookings'
            });

            toast({
                title: "Payment Confirmed",
                description: "Your payment has been marked as complete. Notifying available drivers.",
            });

        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: "Action Failed",
                description: error.message || "Could not confirm payment or create driving job.",
            });
            setIsPaying(false);
        }
    };

    const handleRatingSubmit = async (rating: number, description: string) => {
        if (!firestore) return;
        setIsSubmittingRating(true);
        const bookingRef = doc(firestore, 'bookings', booking.id);
        try {
            await setDocumentNonBlocking(bookingRef, { rating, ratingDescription: description, updatedAt: new Date() }, { merge: true });
            sendNotification(booking.ownerId, {
                title: 'New Rating Received',
                description: `You received a ${rating}-star rating for your ${booking.equipmentName}.`,
                href: '/owner-bookings'
            });
            toast({
                title: t('toast_rating_submitted'),
                description: t('toast_rating_feedback'),
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: t('toast_rating_failed'),
                description: error.message,
            });
        } finally {
            setIsSubmittingRating(false);
        }
    };

    return (
        <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
                <div className="relative h-40 w-full sm:w-40 sm:h-auto flex-shrink-0 bg-muted">
                    <Image src={booking.equipmentImageUrl || '/placeholder.png'} alt={booking.equipmentName || 'Equipment'} layout="fill" className="object-cover" />
                </div>
                <div className="p-4 flex flex-col flex-grow">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-lg">{booking.equipmentName || 'Equipment'}</h3>
                            {booking.equipmentAttachments && booking.equipmentAttachments.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                    {booking.equipmentAttachments.map(att => <p key={att.name}>+ {att.name}</p>)}
                                </div>
                            )}
                             <p className="text-sm text-muted-foreground">
                                {t('booked_from')} {booking.startDate?.toDate ? format(booking.startDate.toDate(), 'PP p') : ''}
                            </p>
                             <p className="text-sm text-muted-foreground">
                                {t('to')} {booking.endDate?.toDate ? format(booking.endDate.toDate(), 'PP p') : ''}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-right">
                            <Badge className={`${statusColors[booking.status] || 'bg-gray-400'} text-white capitalize`}>{booking.status.replace('_', ' ')}</Badge>
                        </div>
                    </div>
                    
                    {booking.status === 'accepted' && (
                        <div className="mt-4 flex flex-col items-start gap-2">
                            {booking.paymentStatus === 'pending' ? (
                                <Alert className="bg-amber-50 border-amber-200 w-full">
                                    <CreditCard className="h-4 w-4" />
                                    <AlertTitle className="font-semibold text-amber-800">Payment Required</AlertTitle>
                                    <AlertDescription className="text-amber-700 mb-4">
                                       The owner has accepted your request. The total amount including driver charges is Rs. {booking.totalPrice.toFixed(2)}. Please complete the payment to the owner.
                                    </AlertDescription>
                                    <Button onClick={handleConfirmPayment} disabled={isPaying}>
                                        {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Confirm Payment is Done
                                    </Button>
                                </Alert>
                            ) : (
                                <>
                                    {booking.driverId ? (
                                        <DriverDetails driverId={booking.driverId} />
                                    ) : (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>Payment Confirmed & Awaiting Driver</AlertTitle>
                                            <AlertDescription>
                                                We are notifying available drivers. A driver will be appointed soon.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    
                                    {booking.driverId && (
                                        <Button onClick={handleWorkCompleted} disabled={isCompleting}>
                                            {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {isCompleting ? t('generating_otp') : t('mark_as_completed')}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                     {booking.status === 'completion_pending' && booking.completionOtp && (
                        <Alert className="mt-4 bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4" />
                            <AlertTitle className="font-semibold text-blue-800">{t('action_required')}</AlertTitle>
                            <AlertDescription className="text-blue-700">
                                {t('share_otp_with_owner')}<strong className="text-lg font-mono tracking-widest text-blue-900">{booking.completionOtp}</strong>
                            </AlertDescription>
                        </Alert>
                    )}
                     {booking.status === 'completed' && (
                        booking.rating ? (
                             <div className="mt-4 border-t pt-4">
                                <h4 className="font-semibold">{t('your_rating')}</h4>
                                <div className="flex items-center mt-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`h-5 w-5 ${i < booking.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                    ))}
                                </div>
                                {booking.ratingDescription && <p className="text-sm text-muted-foreground mt-1 italic">"{booking.ratingDescription}"</p>}
                            </div>
                        ) : (
                            <RatingForm onSubmit={handleRatingSubmit} isSubmitting={isSubmittingRating} />
                        )
                    )}
                    <div className="flex justify-between items-end mt-4 flex-grow">
                         <p className="font-bold text-lg self-end">{t('total')}: Rs. {booking.totalPrice.toFixed(2)}</p>
                        {booking.status === 'pending' && (
                            <Button variant="destructive" size="sm" onClick={handleCancelBooking} disabled={isCancelling}>
                                {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isCancelling ? t('cancelling') : t('cancel_booking')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
