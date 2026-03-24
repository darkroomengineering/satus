import { lazy, useState } from "react";
import { Image as DRImage, type ImageProps as DRImageProps } from "~/components/image";
import { useDeviceDetection } from "~/hooks/use-device-detection";
import { useWebGLElement } from "../../hooks/use-webgl-element";
import { WebGLTunnel } from "../tunnel";

const WebGLImage = lazy(() => import("./webgl"));

/**
 * WebGL-enhanced Image component with visibility optimizations.
 *
 * Uses useWebGLElement for unified rect + visibility tracking.
 * Falls back to standard image on non-WebGL devices.
 */
export function Image({ className, ...props }: DRImageProps) {
  const [src, setSrc] = useState<string>();
  const { setRef, rect, isVisible } = useWebGLElement<HTMLDivElement>();
  const { isWebGL } = useDeviceDetection();

  return (
    <div
      className={className}
      style={{
        opacity: src && isWebGL ? 0 : 1,
        position: "relative",
      }}
      ref={setRef}
    >
      <WebGLTunnel>
        <WebGLImage rect={rect} src={src} visible={isVisible} />
      </WebGLTunnel>
      <DRImage
        {...props}
        onLoad={(img: React.SyntheticEvent<HTMLImageElement>) => {
          setSrc(img.currentTarget.currentSrc);
        }}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      />
    </div>
  );
}
