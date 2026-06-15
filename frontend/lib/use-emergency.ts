"use client";

import { useEffect, useState } from "react";
import { fetchAlerts } from "./api";
import { useProfile } from "./storage";

/**
 * Determines whether there is an active emergency for the user's mapped
 * location. Drives the conditional auth flow: during an active emergency,
 * gated modules become anonymous (Scenario A); otherwise they require
 * sign-in (Scenario B).
 */
export function useActiveEmergency() {
  const { profile, loaded: profileLoaded } = useProfile();
  const [hasEmergency, setHasEmergency] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profileLoaded) return;

    // No mapped location → no emergency context (Scenario B).
    if (!profile?.zipCode) {
      setHasEmergency(false);
      setLoaded(true);
      return;
    }

    let active = true;
    setLoaded(false);
    fetchAlerts(profile.zipCode)
      .then((alerts) => {
        if (active) setHasEmergency(alerts.some((a) => a.is_active));
      })
      .catch(() => {
        if (active) setHasEmergency(false);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [profile?.zipCode, profileLoaded]);

  return { hasEmergency, loaded };
}
