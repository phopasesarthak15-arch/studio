'use client';

import { collection, getFirestore } from "firebase/firestore";
import { addDocumentNonBlocking } from "./non-blocking-updates";
import { toast } from "@/hooks/use-toast";

interface NotificationPayload {
    title: string;
    description: string;
    href?: string;
}

export const sendNotification = (userId: string, payload: NotificationPayload) => {
    // This function can be called from anywhere, so we need to get the firestore instance.
    // In a component, we'd use the useFirestore hook. Here, we get it directly.
    const firestore = getFirestore();
    if (!firestore || !userId) return;

    const notificationsColRef = collection(firestore, `users/${userId}/notifications`);
    
    addDocumentNonBlocking(notificationsColRef, {
        userId,
        ...payload,
        read: false,
    });

    // Also show a toast for immediate feedback
     toast({
        title: payload.title,
        description: payload.description,
    });
};
