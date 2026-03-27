"use client";

import { useState } from "react";
import { useFirestore, setDocumentNonBlocking, sendNotification } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Booking } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Star } from "lucide-react";
import { useI18n } from "@/context/i18n-provider";

const statusColors: { [key: string]: string } = {
    accepted: "bg-green-500 hover:bg-green-600",
    rejected: "bg-red-500 hover:bg-red-600",
    cancelled: "bg-gray-500 hover:bg-gray-600",
    completion_pending: "bg-purple-500 hover:bg-purple-600",
    completed: "bg-blue-500 hover:bg-blue-600",
};

export function OwnerBookingHistoryCard({ booking }: { booking: Booking }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useI18n();
    const [otp, setOtp] = useState("");
    const [isCompleting, setIsCompleting] = useState(false);

    const handleCompleteBooking = async () => {
        if (!firestore) return;
        if (otp !== booking.completionOtp) {
            toast({
                variant: "destructive",
                title: t('toast_invalid_otp'),
                description: t('toast_invalid_otp_desc'),
            });
            return;
        }

        setIsCompleting(true);
        const bookingRef = doc(firestore, 'bookings', booking.id);
        try {
            await setDocumentNonBlocking(bookingRef, { status: 'completed', updatedAt: new Date() }, { merge: true });
            sendNotification(booking.farmerId, {
                title: 'Booking Completed',
                description: `Your booking for ${booking.equipmentName} is now complete. Please rate your experience.`,
                href: '/my-bookings'
            });
            toast({
                title: t('toast_work_done'),
                description: t('toast_work_done_desc'),
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: t('toast_completion_failed'),
                description: error.message || t('toast_completion_failed_desc'),
            });
            setIsCompleting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                     <div className="flex-grow">
                        <CardTitle className="font-headline text-lg">{booking.equipmentName}</CardTitle>
                        {booking.equipmentAttachments && booking.equipmentAttachments.length > 0 && (
                            <p className="text-sm text-muted-foreground">+ {booking.equipmentAttachments.map(a => a.name).join(', ')}</p>
                        )}
                    </div>
                    <Badge className={`${statusColors[booking.status]} text-white capitalize`}>{booking.status.replace('_', ' ')}</Badge>
                </div>
                <CardDescription>
                    {t('booked_by')} <span className="font-mono text-xs">{booking.farmerId.substring(0, 8)}...</span> | {booking.startDate?.toDate ? format(booking.startDate.toDate(), 'PP') : ''}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {booking.status === 'completion_pending' && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">{t('enter_otp_prompt')}</p>
                        <div className="flex gap-2">
                            <Input 
                                placeholder={t('otp_6_digit')}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                                type="tel"
                                className="font-mono tracking-widest"
                            />
                            <Button onClick={handleCompleteBooking} disabled={isCompleting || otp.length !== 6}>
                                {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('verify_and_complete')}
                            </Button>
                        </div>
                    </div>
                )}
                {booking.status === 'accepted' && (
                     <div className="text-center p-4 bg-muted rounded-md">
                        <p className="font-semibold text-muted-foreground">{t('waiting_for_farmer_completion')}</p>
                    </div>
                )}
                 {booking.status === 'completed' && (
                    <div className="text-center p-4 bg-muted rounded-md">
                        <p className="font-semibold text-green-700">{t('work_done')}</p>
                        {booking.rating ? (
                             <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-center">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`h-5 w-5 ${i < booking.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                    ))}
                                </div>
                                {booking.ratingDescription && <p className="text-sm text-muted-foreground italic">"{booking.ratingDescription}"</p>}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground mt-1">{t('waiting_for_farmer_rating')}</p>
                        )}
                    </div>
                )}
                 {(booking.status === 'rejected' || booking.status === 'cancelled') && (
                     <div className="text-center p-4 bg-muted rounded-md">
                        <p className="font-semibold text-muted-foreground capitalize">{booking.status}</p>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}
