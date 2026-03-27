
"use client";

import { useState, useEffect, useRef } from "react";
import { useFirestore, useUser, useDoc, useMemoFirebase, sendNotification, setDocumentNonBlocking } from "@/firebase";
import { doc, updateDoc, arrayUnion, serverTimestamp, writeBatch } from "firebase/firestore";
import type { DrivingJob, User } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, User as UserIcon, MapPin, BadgeCheck, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3 text-sm">
        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <div className="flex flex-col">
            <span className="font-semibold">{label}</span>
            <span className="text-muted-foreground">{value}</span>
        </div>
    </div>
);


const UserDetail = ({ userId, label }: { userId: string, label: string }) => {
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: user } = useDoc<User>(userDocRef);

    if (!user) return <DetailRow icon={UserIcon} label={label} value="Loading..." />;

    return (
        <div className="flex items-start gap-3 text-sm">
            <UserIcon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col">
                <span className="font-semibold">{label}</span>
                 <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={user.profilePictureUrl || undefined} />
                        <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">{user.name} ({user.contactPhoneNumber})</span>
                 </div>
            </div>
        </div>
    )
};

const UserAddressDetail = ({ userId, label }: { userId: string, label: string }) => {
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: user } = useDoc<User>(userDocRef);

    if (!user) return <DetailRow icon={MapPin} label={label} value="Loading address..." />;

    return (
        <DetailRow icon={MapPin} label={label} value={user.villageTehsil} />
    )
}

export function DriverJobCard({ job }: { job: DrivingJob }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isAccepting, setIsAccepting] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const watchIdRef = useRef<number | null>(null);

    const handleAcceptJob = async () => {
        if (!firestore || !user) return;
        setIsAccepting(true);

        const jobRef = doc(firestore, "driving-jobs", job.id);
        const bookingRef = doc(firestore, "bookings", job.bookingId);
        const batch = writeBatch(firestore);

        try {
            // This is an atomic operation. Both updates must succeed or both will fail.
            // This prevents race conditions where two drivers might accept the same job.
            batch.update(jobRef, { status: "accepted", driverId: user.uid, updatedAt: serverTimestamp() });
            batch.update(bookingRef, { driverId: user.uid, participants: arrayUnion(user.uid), updatedAt: serverTimestamp() });
            
            await batch.commit();

            sendNotification(job.farmerId, {
                title: 'Driver Assigned',
                description: `A driver has been assigned for your booking of ${job.equipmentName}.`,
                href: '/my-bookings'
            });
            sendNotification(job.ownerId, {
                title: 'Driver Assigned',
                description: `A driver has accepted the job for your equipment: ${job.equipmentName}.`,
                href: '/owner-bookings'
            });

            toast({
                title: "Job Accepted!",
                description: `You have accepted the job for ${job.equipmentName}.`,
            });
        } catch (error: any) {
            console.error("Error accepting job:", error);
            toast({
                variant: "destructive",
                title: "Failed to Accept Job",
                description: error.message || "There was an error, please try again. The job may have already been taken.",
            });
            setIsAccepting(false);
        }
    };
    
    const handleRejectJob = async () => {
        if (!firestore || !user) return;
        setIsRejecting(true);
        const jobRef = doc(firestore, "driving-jobs", job.id);
        try {
            // Using a standard awaited updateDoc call for consistency and robustness
            await updateDoc(jobRef, {
                rejectedBy: arrayUnion(user.uid)
            });
            toast({
                title: "Job Hidden",
                description: "You will not see this job in the available list anymore.",
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Failed to Hide Job",
                description: error.message || "There was an error, please try again.",
            });
            setIsRejecting(false);
        }

    }

    const handleStartTrip = () => {
        if (!navigator.geolocation) {
            toast({ variant: 'destructive', title: 'Location services not supported' });
            return;
        }
        if (!firestore || !user) return;

        const driverDocRef = doc(firestore, 'users', user.uid);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setDocumentNonBlocking(driverDocRef, { latitude, longitude }, { merge: true });
            },
            (error) => {
                console.error("Location watch error:", error);
                toast({ variant: 'destructive', title: 'Location Tracking Error', description: error.message });
                handleStopTrip(); // Stop tracking on error
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
        );
        setIsTracking(true);
        toast({ title: 'Trip Started', description: 'Your location is now being shared.' });
    };

    const handleStopTrip = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
        toast({ title: 'Trip Ended', description: 'Location sharing has stopped.' });
    };

    // Cleanup effect for unmounting
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);


    const isAcceptedByCurrentUser = job.status === 'accepted' && job.driverId === user?.uid;
    const isLoading = isAccepting || isRejecting;

    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline">{job.equipmentName}</CardTitle>
                    {isAcceptedByCurrentUser && (
                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                            <BadgeCheck className="h-5 w-5" />
                            <span>Accepted by You</span>
                        </div>
                    )}
                </div>
                <CardDescription>A new driving job is available.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <DetailRow icon={MapPin} label="Pickup Point (Owner)" value={job.equipmentVillage} />
                <UserAddressDetail userId={job.farmerId} label="Work Point (Farmer)" />
                {isAcceptedByCurrentUser && (
                    <>
                        <hr/>
                        <UserDetail userId={job.ownerId} label="Equipment Owner Contact" />
                        <UserDetail userId={job.farmerId} label="Farmer Contact" />
                    </>
                )}
            </CardContent>

            {job.status === 'open' && (
                <CardFooter className="flex gap-2">
                    <Button className="w-full" onClick={handleAcceptJob} disabled={isLoading}>
                        {isAccepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Accept
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleRejectJob} disabled={isLoading}>
                        {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4"/>}
                        Reject
                    </Button>
                </CardFooter>
            )}

            {isAcceptedByCurrentUser && (
                 <CardFooter className="flex flex-col gap-2">
                    {isTracking ? (
                        <Button className="w-full" variant="destructive" onClick={handleStopTrip}>Stop Trip</Button>
                    ) : (
                        <Button className="w-full" onClick={handleStartTrip}>Start Trip</Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}
