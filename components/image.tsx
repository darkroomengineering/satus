import cn from "clsx";
import type { ComponentProps } from "react";
import { breakpoints } from "@/styles/config";

export interface ImageProps extends ComponentProps<"img"> {
  /** CSS object-fit property */
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  /** Size on mobile (e.g., "100vw", "50vw") */
  mobileSize?: `${number}vw`;
  /** Size on desktop (e.g., "33vw", "25vw") */
  desktopSize?: `${number}vw`;
  /** Aspect ratio for layout stability */
  aspectRatio?: number;
  /** Preload for LCP images */
  preload?: boolean;
}

export function Image({
  style,
  className,
  loading,
  objectFit = "cover",
  alt = "",
  mobileSize = "100vw",
  desktopSize = "100vw",
  sizes,
  src,
  aspectRatio,
  preload = false,
  ...props
}: ImageProps) {
  const finalLoading = loading ?? (preload ? "eager" : "lazy");
  const finalSizes = sizes || `(max-width: ${breakpoints.dt}px) ${mobileSize}, ${desktopSize}`;

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading={finalLoading}
      sizes={finalSizes}
      style={{
        objectFit,
        display: "block",
        width: "100%",
        height: "auto",
        ...(aspectRatio ? { aspectRatio } : {}),
        ...style,
      }}
      className={cn(className)}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      {...props}
    />
  );
}
