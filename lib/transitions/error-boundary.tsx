import { Component, type ReactNode, type ErrorInfo } from "react";

interface TransitionErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

interface TransitionErrorBoundaryState {
  hasError: boolean;
}

export class TransitionErrorBoundary extends Component<
  TransitionErrorBoundaryProps,
  TransitionErrorBoundaryState
> {
  override state: TransitionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): TransitionErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.warn("[TransitionRouter] Exiting page error:", error, errorInfo);
    this.props.onError();
  }

  override render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
