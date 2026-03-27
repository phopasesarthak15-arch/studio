'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/firebase';
import { RecaptchaVerifier } from 'firebase/auth';

// Add a declaration for the window object to include our custom property.
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

/**
 * A hook to provide a Firebase RecaptchaVerifier instance.
 * It uses a singleton pattern on the window object to avoid issues with
 * React Strict Mode and HMR in development.
 * @param containerId The ID of the DOM element where the reCAPTCHA will be rendered.
 * @returns A RecaptchaVerifier instance or null if not ready.
 */
export function useRecaptcha(containerId: string) {
  const auth = useAuth();
  const [verifier, setVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!auth) return;

    // If the verifier is already on the window, use that instance.
    if (window.recaptchaVerifier) {
      setVerifier(window.recaptchaVerifier);
      // Ensure the container is clean if we're re-using a verifier
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
      window.recaptchaVerifier.render();
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    // Create a new verifier and attach it to the window.
    const newVerifier = new RecaptchaVerifier(auth, container, {
      size: 'invisible',
      callback: () => {
        // This callback is executed when the reCAPTCHA is successfully solved.
      },
    });

    window.recaptchaVerifier = newVerifier;
    setVerifier(newVerifier);

    // It's crucial to render the verifier.
    newVerifier.render().catch((error) => {
        // Catch and log potential rendering errors.
        console.error("reCAPTCHA render error:", error);
    });

  }, [auth, containerId]);

  return verifier;
}
