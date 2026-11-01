import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null };

/**
 * Contains a render crash to the page it happened in. Without this, one bad
 * value (for example an invalid date) unmounts the whole tree and the user is
 * left with a blank screen and no navigation.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[engage-next] render error", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="state-card">
        <span className="state-icon error">
          <AlertTriangle size={22} strokeWidth={1.8} />
        </span>
        <div>
          <h3>This page hit a problem</h3>
          <p>{error.message || "Something went wrong while drawing this page."}</p>
        </div>
        <button type="button" className="btn btn-tonal" onClick={this.reset}>
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    );
  }
}
