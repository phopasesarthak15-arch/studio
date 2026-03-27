
"use client";
import { useMemo, useState, useRef } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useI18n } from "@/context/i18n-provider";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { DrivingJob } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DriverJobCard } from "@/components/agri/driver-job-card";
import { User } from "@/lib/data-types";
import { ShieldAlert, Camera, FileText, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function DriverVerification({ user, currentUserData }: { user: any, currentUserData: User | null }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useI18n();

    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(currentUserData?.profilePictureUrl || null);
    const [licenseImagePreview, setLicenseImagePreview] = useState<string | null>(currentUserData?.driverLicenseImageUrl || null);
    const profileFileInputRef = useRef<HTMLInputElement>(null);
    const licenseFileInputRef = useRef<HTMLInputElement>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'license') => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 750 * 1024) { // 750KB limit
                toast({
                    variant: "destructive",
                    title: "Image too large",
                    description: "Please upload an image smaller than 750KB.",
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'profile') {
                    setProfileImagePreview(reader.result as string);
                } else {
                    setLicenseImagePreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVerify = async () => {
        if (!profileImagePreview || !licenseImagePreview) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please upload both your photo and your driving license.",
            });
            return;
        }

        if (!user || !firestore) return;

        setIsVerifying(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const newRoles = Array.from(new Set([...(currentUserData?.roles || []), 'DRIVER']));

        try {
            await setDocumentNonBlocking(userDocRef, {
                driverStatus: 'PENDING',
                roles: newRoles,
                profilePictureUrl: profileImagePreview,
                driverLicenseImageUrl: licenseImagePreview,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

            toast({
                title: "Verification Submitted!",
                description: "Your application is under review. We will notify you shortly.",
            });
            // The parent component will re-render automatically due to useDoc re-fetching
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: error.message || "Could not update your profile.",
            });
            setIsVerifying(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Become a Verified Driver</CardTitle>
                <CardDescription>Upload your photo and driving license to get access to driving jobs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-2 flex flex-col items-center">
                        <Label>Your Photo (like a passport photo)</Label>
                        <div className="relative">
                            <Avatar className="h-32 w-32">
                                <AvatarImage src={profileImagePreview || undefined} alt="User profile" />
                                <AvatarFallback>
                                    <UserIcon className="h-16 w-16" />
                                </AvatarFallback>
                            </Avatar>
                            <Button size="icon" variant="outline" className="absolute bottom-0 right-0 rounded-full h-10 w-10" onClick={() => profileFileInputRef.current?.click()}>
                                <Camera className="h-5 w-5" />
                                <span className="sr-only">Upload Picture</span>
                            </Button>
                        </div>
                        <input type="file" ref={profileFileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'profile')} />
                    </div>

                    <div className="space-y-2 flex flex-col items-center">
                        <Label>Driving License Photo</Label>
                         <div className="mt-2 flex h-32 w-full max-w-xs flex-col items-center justify-center space-y-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50" onClick={() => licenseFileInputRef.current?.click()}>
                            <input type="file" ref={licenseFileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'license')} />
                            {licenseImagePreview ? <Image src={licenseImagePreview} alt="License Preview" width={160} height={100} className="h-full w-auto rounded-md object-contain" /> : <><FileText className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground text-center">Upload License Photo</p></>}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleVerify} disabled={isVerifying || !profileImagePreview || !licenseImagePreview}>
                    {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isVerifying ? "Submitting..." : "Submit for Verification"}
                </Button>
            </CardFooter>
        </Card>
    );
}


export default function DriverDashboardPage() {
    const { user } = useUser();
    const { t } = useI18n();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: currentUserData, isLoading: isUserDocLoading } = useDoc<User>(userDocRef);

    const isVerifiedDriver = currentUserData?.driverStatus === 'VERIFIED';

    const openJobsQuery = useMemoFirebase(() => {
        if (!user || !firestore || !isVerifiedDriver) return null;
        return query(
            collection(firestore, "driving-jobs"),
            where("status", "==", "open")
        );
    }, [user, firestore, isVerifiedDriver]);
    const { data: openJobs, isLoading: isLoadingOpen } = useCollection<DrivingJob>(openJobsQuery);
    
    const availableJobs = useMemo(() => {
        if (!openJobs || !user) return [];
        const sorted = [...openJobs].sort((a, b) => (b.createdAt?.toDate?.().getTime() || 0) - (a.createdAt?.toDate?.().getTime() || 0));
        return sorted.filter(job => !job.rejectedBy?.includes(user.uid));
    }, [openJobs, user]);


    const acceptedJobsQuery = useMemoFirebase(() => {
        if (!user || !firestore || !isVerifiedDriver) return null;
        return query(
            collection(firestore, "driving-jobs"),
            where("driverId", "==", user.uid),
            where("status", "==", "accepted")
        );
    }, [user, firestore, isVerifiedDriver]);
    const { data: acceptedJobs, isLoading: isLoadingAccepted } = useCollection<DrivingJob>(acceptedJobsQuery);

    const sortedAcceptedJobs = useMemo(() => {
        if (!acceptedJobs) return [];
        return [...acceptedJobs].sort((a, b) => (b.createdAt?.toDate?.().getTime() || 0) - (a.createdAt?.toDate?.().getTime() || 0));
    }, [acceptedJobs]);

    const isLoading = isLoadingOpen || isLoadingAccepted || isUserDocLoading;

    if (isUserDocLoading) {
        return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
    }

    if (currentUserData?.driverStatus === 'PENDING') {
        return (
            <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                <ShieldAlert className="h-4 w-4 !text-yellow-800" />
                <AlertTitle className="text-yellow-900">Verification Pending</AlertTitle>
                <AlertDescription className="text-yellow-800">
                    Your Driving License is under review. You cannot accept jobs yet. We will notify you once the review is complete.
                </AlertDescription>
            </Alert>
        );
    }
    
    if (currentUserData?.driverStatus === 'REJECTED') {
        return (
            <Card>
                <CardHeader>
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Verification Rejected</AlertTitle>
                        <AlertDescription>
                            There was an issue with your submitted documents. Please review and re-submit your details below.
                        </AlertDescription>
                    </Alert>
                </CardHeader>
                <CardContent>
                    <DriverVerification user={user} currentUserData={currentUserData} />
                </CardContent>
            </Card>
        )
    }

    if (currentUserData?.driverStatus !== 'VERIFIED') {
        return <DriverVerification user={user} currentUserData={currentUserData} />
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Available Driving Jobs</CardTitle>
                    <CardDescription>Accept a job to get started.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading && (
                        <>
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </>
                    )}
                    {!isLoading && (!availableJobs || availableJobs.length === 0) && (
                         <Alert>
                            <AlertTitle>No Available Jobs</AlertTitle>
                            <AlertDescription>
                                There are currently no driving jobs available. Check back later!
                            </AlertDescription>
                        </Alert>
                    )}
                    {!isLoading && availableJobs && availableJobs.map(job => (
                        <DriverJobCard key={job.id} job={job} />
                    ))}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Your Accepted Jobs</CardTitle>
                    <CardDescription>Jobs you have accepted.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoading && <Skeleton className="h-24 w-full" /> }
                     {!isLoading && (!sortedAcceptedJobs || sortedAcceptedJobs.length === 0) && (
                         <Alert>
                            <AlertTitle>No Accepted Jobs</AlertTitle>
                            <AlertDescription>
                                Accept a job from the list above to see it here.
                            </AlertDescription>
                        </Alert>
                    )}
                     {!isLoading && sortedAcceptedJobs && sortedAcceptedJobs.map(job => (
                        <DriverJobCard key={job.id} job={job} />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

