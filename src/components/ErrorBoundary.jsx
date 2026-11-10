import { Component } from 'react';

/** Last line of defence: shows a calm message and never renders error details to the visitor. */
export default class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="wrap sec">
        <h1 className="pg">Something went wrong</h1>
        <p className="lede">Please refresh the page. If it keeps happening, please contact us.</p>
        <button className="cta" type="button" onClick={() => window.location.reload()}>Refresh</button>
      </div>
    );
  }
}
