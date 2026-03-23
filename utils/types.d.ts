import "react";

// Allow CSS custom properties in React's style prop
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

declare global {
  interface Window {
    THEATRE_PROJECT_ID?: string;
  }
}
