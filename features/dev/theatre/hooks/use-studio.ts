import type { ISheet } from "@theatre/core";
import type { IStudio } from "@theatre/studio";
import { useEffect, useState } from "react";
import { useOrchestra } from "../..";

let studioPackage: IStudio;

export function useStudio() {
  const [studio, setStudio] = useState(studioPackage);
  const { studio: hasStudio } = useOrchestra();

  useEffect(() => {
    if (hasStudio && !studioPackage) {
      void import("@theatre/studio").then((pkg) => {
        // CJS interop: studio instance is double-wrapped
        const raw = pkg.default as unknown as Record<string, unknown>;
        const studio = (raw?.default ?? raw) as IStudio;
        studioPackage = studio;
        setStudio(studio);
      });
    }
  }, [hasStudio]);

  return studio;
}

export function useStudioCurrentObject() {
  const studio = useStudio();

  const [currentObjectAddress, setCurrentObjectAddress] = useState<ISheet["address"] | null>(null);

  useEffect(() => {
    if (studio) {
      const unsubscribe = studio.onSelectionChange((v) => {
        const object = v.filter(({ type }) => type === "Theatre_SheetObject_PublicAPI")[0];

        setCurrentObjectAddress(object?.address ?? null);
      });

      return unsubscribe;
    }

    return undefined;
  }, [studio]);

  return currentObjectAddress;
}
