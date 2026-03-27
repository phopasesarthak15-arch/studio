
"use client";
import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, Clock, Sun, Info, Wrench } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useCollection, sendNotification } from "@/firebase";
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore";
import type { Equipment } from "@/lib/data";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays, addHours, subHours, startOfDay, endOfDay, eachDayOfInterval, setHours } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { hi } from 'date-fns/locale/hi';
// import { mr } from 'date-fns/locale/mr'; // This was causing a build error
import { te } from 'date-fns/locale/te';
// import { pa } from 'date-fns/locale/pa'; // This was also causing a build error
import { gu } from 'date-fns/locale/gu';
import { DateRange } from "react-day-picker";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Tractor } from "lucide-react";
import { useI18n, Language } from "@/context/i18n-provider";
import { useSearchParams } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

const localeMap: Record<Language, Locale> = {
  en: enUS,
  hi: hi,
  mr: enUS, // Fallback to English for Marathi as locale is not available
  te: te,
  pa: enUS, // Fallback to English for Punjabi
  gu: gu
};

export default function BookingPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const { t, language } = useI18n();

    const [bookingType, setBookingType] = useState<'hourly' | 'daily'>('hourly');
    const [hourlyDuration, setHourlyDuration] = useState(1);
    const [hourlyDate, setHourlyDate] = useState<Date | undefined>();
    const [dailyDate, setDailyDate] = useState<DateRange | undefined>(undefined);
    const [startTime, setStartTime] = useState<number | null>(null);
    
    const [selectedAttachments, setSelectedAttachments] = useState<Equipment['attachments']>([]);
    
    const [totalPrice, setTotalPrice] = useState(0);
    const [driverCharges, setDriverCharges] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isSlotUnavailable, setIsSlotUnavailable] = useState(false);
    const [unavailableMessage, setUnavailableMessage] = useState("");

    const beneficiaryId = searchParams.get('beneficiaryId');
    const isSahayakBooking = !!beneficiaryId;
    const dateLocale = localeMap[language];

    const equipmentDocRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'equipment', id) : null, [firestore, id]);
    const { data: equipment, isLoading: isEquipmentLoading } = useDoc<Equipment>(equipmentDocRef);

    const bookingsQuery = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        return query(
            collection(firestore, 'bookings'), 
            where('equipmentId', '==', id),
            where('status', 'in', ['accepted', 'completion_pending', 'pending'])
        );
    }, [firestore, id]);
    const { data: existingBookings, isLoading: areBookingsLoading } = useCollection<any>(bookingsQuery);

    const disabledDates = useMemo(() => {
        if (!existingBookings) return [];
        const dates: Date[] = [];
        existingBookings.forEach(booking => {
            if (booking.startDate?.toDate && booking.endDate?.toDate) {
                dates.push(...eachDayOfInterval({
                    start: startOfDay(booking.startDate.toDate()),
                    end: endOfDay(booking.endDate.toDate())
                }));
            }
        });
        return dates;
    }, [existingBookings]);
    
    const timeSlots = Array.from({ length: 11 }, (_, i) => i + 7); // 7 AM to 5 PM

    const unavailableSlots = useMemo(() => {
        if (!hourlyDate || !existingBookings) return [];
        
        const slots = new Set<number>();
        const selectedDayStart = startOfDay(hourlyDate);

        existingBookings.forEach(booking => {
            const existingStart = booking.startDate.toDate();
            const existingEnd = booking.endDate.toDate();

            if (startOfDay(existingStart).getTime() !== selectedDayStart.getTime()) {
                return;
            }
            
            const bufferStart = subHours(existingStart, 1);
            const bufferEnd = addHours(existingEnd, 1);

            for (let i = bufferStart.getHours(); i < bufferEnd.getHours(); i++) {
                slots.add(i);
            }
        });
        return Array.from(slots);
    }, [hourlyDate, existingBookings]);


    useEffect(() => {
        // Set initial date on client-side only to avoid hydration mismatch
        setHourlyDate(new Date());
    }, []);

    useEffect(() => {
        if (!existingBookings || !startTime) {
            setIsSlotUnavailable(false);
            return;
        }

        let isUnavailable = false;
        let message = "";

        if (bookingType === 'hourly' && hourlyDate && hourlyDuration > 0) {
            const newBookingStart = addHours(startOfDay(hourlyDate), startTime);
            const newBookingEnd = addHours(newBookingStart, hourlyDuration);

            for (const booking of existingBookings) {
                if (booking.startDate?.toDate && booking.endDate?.toDate) {
                    const existingStart = booking.startDate.toDate();
                    const existingEnd = booking.endDate.toDate();
                    
                    const bufferStart = subHours(existingStart, 1);
                    const bufferEnd = addHours(existingEnd, 1);

                    if (newBookingStart < bufferEnd && newBookingEnd > bufferStart) {
                        isUnavailable = true;
                        message = `This equipment is already booked for the selected time. Please select a different time.`;
                        break;
                    }
                }
            }
        } else if (bookingType === 'daily' && dailyDate?.from) {
             const newBookingStart = setHours(new Date(dailyDate.from), 7);
             const newBookingEnd = setHours(dailyDate.to ? new Date(dailyDate.to) : new Date(dailyDate.from), 17);

            for (const booking of existingBookings) {
                if (booking.startDate?.toDate && booking.endDate?.toDate) {
                    const existingStart = booking.startDate.toDate();
                    const existingEnd = booking.endDate.toDate();

                    const bufferStart = subHours(existingStart, 1);
                    const bufferEnd = addHours(existingEnd, 1);

                    if (newBookingStart < bufferEnd && newBookingEnd > bufferStart) {
                        isUnavailable = true;
                        message = `This date range is unavailable due to a conflict with an existing booking. Please select a different range.`;
                        break;
                    }
                }
            }
        }

        setIsSlotUnavailable(isUnavailable);
        setUnavailableMessage(message);

    }, [existingBookings, bookingType, hourlyDate, hourlyDuration, startTime, dailyDate]);

    useEffect(() => {
        if (!equipment) return;
    
        const DRIVER_RATE_PER_DAY = 500;
        let equipmentPrice = 0;
        let calculatedDriverCharges = 0;
        let attachmentsPrice = 0;
        
        let duration = 0;
        if (bookingType === 'hourly') {
            duration = hourlyDuration;
        } else if (bookingType === 'daily' && dailyDate?.from && dailyDate?.to) {
            duration = differenceInCalendarDays(dailyDate.to, dailyDate.from) + 1;
        }

        if (selectedAttachments && selectedAttachments.length > 0 && duration > 0) {
            if (bookingType === 'hourly') {
                attachmentsPrice = selectedAttachments.reduce((sum, att) => sum + ((att.pricePerHour || 0) * duration), 0);
            } else { // daily
                attachmentsPrice = selectedAttachments.reduce((sum, att) => sum + ((att.pricePerDay || 0) * duration), 0);
            }
        }


        if (bookingType === 'hourly' && hourlyDate && hourlyDuration > 0) {
            equipmentPrice = (equipment.pricePerHour || 0) * hourlyDuration;
            // Flat rate for the day if booking hourly
            calculatedDriverCharges = equipmentPrice > 0 ? DRIVER_RATE_PER_DAY : 0;
        } else if (bookingType === 'daily' && dailyDate?.from && dailyDate?.to) {
            const days = differenceInCalendarDays(dailyDate.to, dailyDate.from) + 1;
            if (days > 0) {
                equipmentPrice = (equipment.pricePerDay || 0) * days;
                calculatedDriverCharges = days * DRIVER_RATE_PER_DAY;
            }
        }
        
        setDriverCharges(calculatedDriverCharges);
        setTotalPrice(equipmentPrice + attachmentsPrice + calculatedDriverCharges);

    }, [equipment, bookingType, hourlyDuration, hourlyDate, dailyDate, selectedAttachments]);


    const handleRequestBooking = async () => {
        if (!user || !firestore || !equipment || totalPrice <= 0 || isSlotUnavailable) {
            toast({ variant: "destructive", title: t('toast_missing_info'), description: t('toast_fill_details') });
            return;
        }
        setLoading(true);

        const creatorId = user.uid;
        const farmerId = isSahayakBooking && beneficiaryId ? beneficiaryId : user.uid;
        const ownerId = equipment.ownerId;
        const participants = [...new Set([ownerId, creatorId, farmerId])];

        const newBookingRef = doc(collection(firestore, 'bookings'));

        let bookingData: Omit<any, 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any };
        
        if (bookingType === 'hourly' && hourlyDate && hourlyDuration > 0 && startTime) {
            const startDate = setHours(new Date(hourlyDate), startTime);
            const endDate = addHours(startDate, hourlyDuration);
            bookingData = {
                id: newBookingRef.id,
                equipmentId: id, equipmentName: equipment.name, equipmentImageUrl: equipment.imageUrl, equipmentVillage: equipment.village, ownerId: equipment.ownerId,
                equipmentAttachments: selectedAttachments,
                farmerId: farmerId, createdBy: creatorId, participants, status: 'pending', bookingType: 'hourly',
                startDate, endDate, duration: hourlyDuration, totalPrice, driverCharges, paymentStatus: 'pending',
                createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            };
        } else if (bookingType === 'daily' && dailyDate?.from && dailyDate?.to) {
            const startDate = setHours(new Date(dailyDate.from), 7);
            const endDate = setHours(new Date(dailyDate.to), 17);
            
            const durationInDays = differenceInCalendarDays(dailyDate.to, dailyDate.from) + 1;
            bookingData = {
                id: newBookingRef.id,
                equipmentId: id, equipmentName: equipment.name, equipmentImageUrl: equipment.imageUrl, equipmentVillage: equipment.village, ownerId: equipment.ownerId,
                equipmentAttachments: selectedAttachments,
                farmerId: farmerId, createdBy: creatorId, participants, status: 'pending', bookingType: 'daily',
                startDate, endDate, duration: durationInDays, totalPrice, driverCharges, paymentStatus: 'pending',
                createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            };
        } else {
            toast({ variant: "destructive", title: t('toast_invalid_details') });
            setLoading(false);
            return;
        }

        try {
            await setDocumentNonBlocking(newBookingRef, bookingData);
            sendNotification(equipment.ownerId, {
                title: 'New Booking Request',
                description: `${user?.displayName || 'A user'} has requested to book your ${equipment.name}.`,
                href: '/owner-bookings'
            });
            toast({ title: t('toast_booking_sent'), description: t('toast_owner_notified') });
            router.push('/my-bookings');
        } catch (error: any) {
            // Error is handled globally
        } finally {
            setLoading(false);
        }
    };
    
    if (isEquipmentLoading || areBookingsLoading) return <div className="container mx-auto py-8 max-w-4xl"><Skeleton className="h-96 w-full" /></div>;
    if (!equipment) return (
        <div className="container mx-auto py-8 max-w-4xl text-center">
            <Tractor className="h-24 w-24 mx-auto text-muted-foreground" />
            <h1 className="mt-4 text-3xl font-bold font-headline">{t('equipment_not_found')}</h1>
            <p className="text-muted-foreground">{t('equipment_not_exist')}</p>
            <Button asChild className="mt-6"><Link href="/equipment">{t('back_to_marketplace')}</Link></Button>
        </div>
    );

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <h1 className="text-3xl font-bold font-headline mb-6">{t('request_to_book')}</h1>
            <div className="grid md:grid-cols-[2fr_1fr] gap-8 items-start">
                <div className="space-y-8">
                     <Card className="rounded-[var(--radius)]">
                        <div className="flex flex-col sm:flex-row">
                            <div className="relative h-48 w-full sm:w-1/3 flex-shrink-0"><Image src={equipment.imageUrl} alt={equipment.name} layout="fill" className="object-cover rounded-l-[var(--radius)]" /></div>
                            <div className="p-6">
                                <CardTitle className="font-headline text-2xl">{equipment.name}</CardTitle>
                                <div className="mt-4 space-y-2">
                                    <h4 className="font-semibold">{t('rental_price')}</h4>
                                    {equipment.pricePerHour && <p className="text-sm text-muted-foreground">{t('price_per_hour')}: Rs. {equipment.pricePerHour}</p>}
                                    {equipment.pricePerDay && <p className="text-sm text-muted-foreground">{t('price_per_day')}: Rs. {equipment.pricePerDay}</p>}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="rounded-[var(--radius)] shadow-lg">
                        <CardHeader><CardTitle className="font-headline text-xl">{t('select_booking_type')}</CardTitle></CardHeader>
                        <CardContent className="p-6">
                            <RadioGroup value={bookingType} onValueChange={(v) => setBookingType(v as any)} className="flex gap-8">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="hourly" id="hourly" /><Label htmlFor="hourly">{t('hourly')}</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="daily" id="daily" /><Label htmlFor="daily">{t('daily')}</Label></div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[var(--radius)] shadow-lg">
                        <CardHeader><CardTitle className="font-headline text-xl">{t('select_date_duration')}</CardTitle></CardHeader>
                        <CardContent className="p-6">
                            {bookingType === 'hourly' ? (
                                <div className="space-y-6">
                                     <div className="p-4 border rounded-lg space-y-4">
                                         <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="hourly-date">Start Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn("w-full justify-start text-left font-normal", !hourlyDate && "text-muted-foreground")}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {hourlyDate ? format(hourlyDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={hourlyDate}
                                                            onSelect={setHourlyDate}
                                                            disabled={[{ before: new Date() }]}
                                                            initialFocus
                                                            locale={dateLocale}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                             <div className="space-y-1">
                                                <Label htmlFor="hours">Duration (hours)</Label>
                                                <Input id="hours" type="number" value={hourlyDuration} onChange={(e) => setHourlyDuration(Math.max(1, parseInt(e.target.value) || 1))} min="1" />
                                            </div>
                                         </div>
                                    </div>
                                    {hourlyDate && (
                                        <div className="space-y-4">
                                            <Label className="text-lg font-medium">Select Start Time</Label>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                {timeSlots.map(time => (
                                                    <Button key={time}
                                                        variant={startTime === time ? "default" : "outline"}
                                                        disabled={unavailableSlots.includes(time)}
                                                        onClick={() => setStartTime(time)}
                                                        className="text-base"
                                                    >
                                                        {`${time}:00`}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {!equipment.pricePerHour && <p className="text-sm text-destructive">{t('no_hourly_rate')}</p>}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-center rounded-lg shadow-inner-lg">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dailyDate?.from}
                                            selected={dailyDate}
                                            onSelect={setDailyDate}
                                            numberOfMonths={2}
                                            disabled={[{ before: new Date() }, ...disabledDates]}
                                            className="rounded-md"
                                            locale={dateLocale}
                                        />
                                    </div>
                                    <Alert>
                                        <Clock className="h-4 w-4" />
                                        <AlertTitle>Daily Timings</AlertTitle>
                                        <AlertDescription>
                                            Bookings are from 7:00 AM to 5:00 PM each day.
                                        </AlertDescription>
                                    </Alert>
                                    {!equipment.pricePerDay && <p className="text-sm text-destructive">{t('no_daily_rate')}</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    
                    {equipment.attachments && equipment.attachments.length > 0 && (
                        <Card className="rounded-[var(--radius)] shadow-lg">
                            <CardHeader>
                                <CardTitle className="font-headline text-xl flex items-center gap-2"><Wrench className="h-5 w-5" /> Select Attachments (Optional)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-6">
                                {equipment.attachments.map((att) => (
                                    <div key={att.name} className="flex items-start space-x-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <Checkbox
                                            id={att.name}
                                            className="mt-1"
                                            checked={selectedAttachments?.some(sa => sa.name === att.name)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedAttachments(prev => [...(prev || []), att]);
                                                } else {
                                                    setSelectedAttachments(prev => prev?.filter(a => a.name !== att.name));
                                                }
                                            }}
                                        />
                                        <div className="flex-grow">
                                            <Label htmlFor={att.name} className="font-semibold text-base cursor-pointer">{att.name}</Label>
                                            <div className="text-sm text-muted-foreground">
                                                {att.pricePerHour && <p>Hourly: Rs. {att.pricePerHour}</p>}
                                                {att.pricePerDay && <p>Daily: Rs. {att.pricePerDay}</p>}
                                            </div>
                                        </div>
                                        {att.imageUrl && (
                                            <div className="relative h-16 w-24 flex-shrink-0">
                                                <Image src={att.imageUrl} alt={att.name} layout="fill" className="object-cover rounded-md" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {isSlotUnavailable && (
                        <Alert variant="destructive">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Slot Unavailable</AlertTitle>
                            <AlertDescription>
                                {unavailableMessage}
                            </AlertDescription>
                        </Alert>
                    )}

                     <Alert className="bg-blue-50 border-blue-200 text-blue-800 rounded-[var(--radius)]">
                        <Info className="h-4 w-4 !text-blue-800" />
                        <AlertTitle>Driver Included</AlertTitle>
                        <AlertDescription>
                            A verified driver is included with every booking for your convenience. A charge of Rs. 500 per day will be added to your total.
                        </AlertDescription>
                    </Alert>
                </div>

                <Card className="sticky top-24 rounded-[var(--radius)] shadow-lg">
                    <CardHeader><CardTitle className="font-headline text-xl">{t('booking_summary')}</CardTitle></CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="flex justify-between text-base">
                            <span className="text-muted-foreground">{t('booking_type')}</span>
                            <span className="font-medium capitalize">{bookingType}</span>
                        </div>
                         { hourlyDate && bookingType === 'hourly' && (
                            <div className="flex justify-between text-base">
                                <span className="text-muted-foreground">{t('start_date')}</span>
                                <span className="font-medium">{format(hourlyDate, 'dd/MM/yyyy')}</span>
                            </div>
                         )}
                         { dailyDate?.from && bookingType === 'daily' && (
                            <div className="space-y-1 text-base">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('start_date')}</span>
                                    <span className="font-medium">{format(dailyDate.from, 'dd/MM/yyyy')}</span>
                                </div>
                                {dailyDate.to && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">End Date</span>
                                    <span className="font-medium">{format(dailyDate.to, 'dd/MM/yyyy')}</span>
                                </div>
                                )}
                            </div>
                         )}
                         
                        {selectedAttachments && selectedAttachments.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-2 pt-2">
                                    <h4 className="text-base font-semibold">Selected Attachments</h4>
                                    {selectedAttachments.map(att => {
                                        let price = 0;
                                        let duration = 0;
                                        if (bookingType === 'hourly') {
                                            duration = hourlyDuration;
                                        } else if (bookingType === 'daily' && dailyDate?.from && dailyDate?.to) {
                                            duration = differenceInCalendarDays(dailyDate.to, dailyDate.from) + 1;
                                        }

                                        if (bookingType === 'hourly' && att.pricePerHour) {
                                            price = att.pricePerHour * duration;
                                        } else if (bookingType === 'daily' && att.pricePerDay) {
                                            price = att.pricePerDay * duration;
                                        }

                                        return (
                                            <div key={att.name} className="flex justify-between text-base">
                                            <span className="text-muted-foreground">+ {att.name}</span>
                                            {price > 0 && <span className="font-medium">Rs. {price.toFixed(2)}</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                         
                        <div className="flex justify-between text-base">
                            <span className="text-muted-foreground">Driver Charges</span>
                            <span className="font-medium">Rs. {driverCharges.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>{t('total')}</span>
                            <span>Rs. {totalPrice.toFixed(2)}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="p-6">
                         <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-lg py-6" onClick={handleRequestBooking} disabled={loading || totalPrice <= 0 || isSlotUnavailable || areBookingsLoading}>
                            {(loading || areBookingsLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('request_to_book')}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
