"use client";

import { ParcoursPage } from "@/components/Parcours";
import { ProfileGate } from "@/components/ui";

export default function Page() {
  return (
    <ProfileGate>
      <ParcoursPage />
    </ProfileGate>
  );
}
