import { useLayoutEffect, type PropsWithChildren } from "react";
import { CanvasContext } from "~/webgl/components/canvas";
import { useWebGLStore } from "~/webgl/store";

export function PersistentWebGL({ children }: PropsWithChildren) {
  const { activate, setActive, getWebGLTunnel, getDOMTunnel } = useWebGLStore();

  useLayoutEffect(() => {
    activate();
    setActive(true);
  }, [activate, setActive]);

  const WebGLTunnel = getWebGLTunnel();
  const DOMTunnel = getDOMTunnel();

  return (
    <CanvasContext.Provider value={{ WebGLTunnel, DOMTunnel }}>{children}</CanvasContext.Provider>
  );
}
