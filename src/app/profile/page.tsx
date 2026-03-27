
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, sendNotification } from "@/firebase";
import { doc, runTransaction } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Camera, User as UserIcon, BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/context/i18n-provider";
import { LocationAutocomplete } from "@/components/agri/location-autocomplete";


export default function ProfilePage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useI18n();
    
    const [isMounted, setIsMounted] = useState(false);
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

    const [name, setName] = useState("");
    const [location, setLocation] = useState<{ address: string; lat: number | null; lng: number | null } | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [farmSize, setFarmSize] = useState("");
    const [farmSizeUnit, setFarmSizeUnit] = useState<"acre" | "guntha" | "hectare">("acre");
    const [gender, setGender] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const availableRoles = [
        { id: 'FARMER', label: t('farmer') },
        { id: 'EQUIPMENT_OWNER', label: t('equipment_owner') },
        { id: 'DRIVER', label: t('driver') },
        { id: 'SAHAYAK', label: t('sahayak_agent') }
    ];

    useEffect(() => {
        if (userData) {
            setName(userData.name || "");
            setLocation({
                address: userData.villageTehsil || "",
                lat: userData.latitude || null,
                lng: userData.longitude || null
            });
            setRoles(userData.roles || []);
            setFarmSize(userData.farmSize?.toString() || "");
            setFarmSizeUnit(userData.farmSizeUnit || 'acre');
            setGender(userData.gender || "");
            setImagePreview(userData.profilePictureUrl || null);
        }
    }, [userData]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) { // 1MB limit
                toast({
                    variant: "destructive",
                    title: t('toast_image_too_large'),
                    description: t('toast_image_size_limit'),
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveChanges = async () => {
        if (!userDocRef || !firestore || !name || !location?.address || roles.length === 0) {
            toast({
                variant: "destructive",
                title: t('toast_missing_info'),
                description: t('toast_fill_details'),
            });
            return;
        }

        if (roles.includes('FARMER') && (!farmSize || Number(farmSize) <= 0)) {
             toast({
                variant: "destructive",
                title: t('toast_invalid_farm_size'),
                description: t('toast_invalid_farm_size_desc'),
            });
            return;
        }

        setLoading(true);
        try {
            const oldRoles = userData?.roles || [];
            const newRoles = roles;
            const rolesAdded = newRoles.filter(r => !oldRoles.includes(r));
            const rolesRemoved = oldRoles.filter(r => !newRoles.includes(r));

            if (rolesAdded.length > 0 || rolesRemoved.length > 0) {
                const statsDocRef = doc(firestore, "publicStats", "userCounts");
                await runTransaction(firestore, async (transaction) => {
                    const statsDoc = await transaction.get(statsDocRef);
                    const currentCounts = statsDoc.data() || { farmers: 0, equipmentOwners: 0, drivers: 0 };

                    const newCounts = { 
                        farmers: currentCounts.farmers || 0,
                        equipmentOwners: currentCounts.equipmentOwners || 0,
                        drivers: currentCounts.drivers || 0
                    };

                    rolesAdded.forEach(role => {
                        if (role === 'FARMER') newCounts.farmers++;
                        if (role === 'EQUIPMENT_OWNER') newCounts.equipmentOwners++;
                        if (role === 'DRIVER') newCounts.drivers++;
                    });
                    rolesRemoved.forEach(role => {
                        if (role === 'FARMER') newCounts.farmers = Math.max(0, newCounts.farmers - 1);
                        if (role === 'EQUIPMENT_OWNER') newCounts.equipmentOwners = Math.max(0, newCounts.equipmentOwners - 1);
                        if (role === 'DRIVER') newCounts.drivers = Math.max(0, newCounts.drivers - 1);
                    });
                    
                    if (statsDoc.exists()) {
                        transaction.update(statsDocRef, newCounts);
                    } else {
                        transaction.set(statsDocRef, newCounts);
                    }
                });
            }


            const isSahayak = roles.includes('SAHAYAK');
            const updatedData: any = {
                name: name,
                villageTehsil: location.address,
                roles: roles,
                farmSize: roles.includes('FARMER') ? Number(farmSize) : null,
                farmSizeUnit: roles.includes('FARMER') ? farmSizeUnit : null,
                latitude: location.lat,
                longitude: location.lng,
                profilePictureUrl: imagePreview,
                gender: gender || null,
                updatedAt: new Date().toISOString(),
            };

            if (isSahayak && userData?.sahayakStatus === 'NONE') {
                updatedData.sahayakStatus = 'PENDING';
                updatedData.commissionRate = 0.05; // Default 5%
            }
            
            setDocumentNonBlocking(userDocRef, updatedData, { merge: true });
            
            if (user) {
              sendNotification(user.uid, {
                  title: 'Profile Updated',
                  description: 'Your profile information has been successfully updated.'
              });
            }

            toast({
                title: t('toast_profile_updated'),
                description: t('toast_profile_updated_desc'),
            });
            router.push("/dashboard");

        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast({
                variant: "destructive",
                title: t('toast_uh_oh'),
                description: error.message || t('toast_could_not_save_profile'),
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isMounted || isUserDocLoading) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-20" />
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </div>
                    </div>
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-3xl">{t('your_profile')}</CardTitle>
                <CardDescription>{t('update_profile_info')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2 flex flex-col items-center">
                    <Label>{t('profile_picture')}</Label>
                    <div className="relative">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={imagePreview || undefined} alt="User profile" />
                            <AvatarFallback>
                                <UserIcon className="h-12 w-12" />
                            </AvatarFallback>
                        </Avatar>
                        <Button size="icon" variant="outline" className="absolute bottom-0 right-0 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()}>
                            <Camera className="h-4 w-4" />
                            <span className="sr-only">{t('upload_picture')}</span>
                        </Button>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg"
                        onChange={handleFileChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">{t('full_name')}</Label>
                    <Input 
                        id="name" 
                        placeholder={t('eg_ramesh_kumar')}
                        value={name}
                        onChange={(e) => setName(e.target.value)} 
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">{t('mobile_number')}</Label>
                    <div className="flex items-center gap-2">
                         <span className="rounded-md border bg-muted px-3 py-2 text-sm">+91</span>
                        <Input 
                            id="phone" 
                            type="tel"
                            value={user?.phoneNumber?.replace('+91', '') || ''}
                            disabled
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location">{t('village_tehsil')}</Label>
                    <LocationAutocomplete
                        initialValue={location?.address || ''}
                        onLocationSelect={setLocation}
                        placeholder={t('eg_rampur_hisar')}
                    />
                    {location?.lat && <p className="text-xs text-muted-foreground">{t('location_captured')}: {location.lat.toFixed(4)}, {location.lng?.toFixed(4)}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="gender">{t('gender_optional')}</Label>
                    <Select onValueChange={setGender} value={gender}>
                        <SelectTrigger id="gender">
                            <SelectValue placeholder={t('select_your_gender')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Male">{t('male')}</SelectItem>
                            <SelectItem value="Female">{t('female')}</SelectItem>
                            <SelectItem value="Other">{t('other')}</SelectItem>
                            <SelectItem value="Prefer not to say">{t('prefer_not_to_say')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-4">
                    <Label>{t('your_roles')}</Label>
                    <div className="grid grid-cols-2 gap-4">
                        {availableRoles.map(role => (
                            <div key={role.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={role.id}
                                    checked={roles.includes(role.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setRoles(prev => [...prev, role.id]);
                                        } else {
                                            setRoles(prev => prev.filter(r => r !== role.id));
                                        }
                                    }}
                                />
                                <Label htmlFor={role.id} className="font-normal">{role.label}</Label>
                            </div>
                        ))}
                    </div>
                </div>

                {userData?.driverStatus === 'VERIFIED' && (
                    <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                        <BadgeCheck className="h-5 w-5" />
                        <p className="text-sm font-semibold">Verified as Driver</p>
                    </div>
                )}

                {roles.includes('FARMER') && (
                    <div className="space-y-2">
                        <Label>{t('farm_size')}</Label>
                        <div className="flex gap-2">
                            <Input
                                id="farm-size"
                                type="number"
                                placeholder={t('eg_10')}
                                value={farmSize}
                                onChange={(e) => setFarmSize(e.target.value)}
                                min="0.1"
                                step="0.1"
                                className="w-2/3"
                            />
                            <Select value={farmSizeUnit} onValueChange={(value) => setFarmSizeUnit(value as any)}>
                                <SelectTrigger className="w-1/3">
                                    <SelectValue placeholder={t('select_unit')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="acre">{t('acre')}</SelectItem>
                                    <SelectItem value="guntha">{t('guntha')}</SelectItem>
                                    <SelectItem value="hectare">{t('hectare')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </CardContent>
             <CardFooter>
                <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                    onClick={handleSaveChanges}
                    disabled={loading}
                >
                    {loading ? t('saving_changes') : t('save_changes')}
                </Button>
            </CardFooter>
        </Card>
    );
}
