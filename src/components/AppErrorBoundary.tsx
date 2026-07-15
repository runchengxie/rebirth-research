import {
  Component,
  createRef,
  type ErrorInfo,
  type ReactNode,
} from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

function storyUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("mode");
  return `${url.pathname}${url.search}${url.hash}`;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  private readonly fallbackRef = createRef<HTMLElement>();

  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    window.dispatchEvent(new CustomEvent("rebirth-app-error", {
      detail: {
        message: error.message,
        componentStack: info.componentStack,
      },
    }));
  }

  componentDidUpdate(
    _previousProps: AppErrorBoundaryProps,
    previousState: AppErrorBoundaryState,
  ): void {
    if (!previousState.error && this.state.error) {
      this.fallbackRef.current?.focus();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main
        className="app-error-boundary"
        ref={this.fallbackRef}
        role="alert"
        tabIndex={-1}
      >
        <span>运行时保护</span>
        <h1>这个研究流程没有正常展开</h1>
        <p>
          页面遇到了无法继续处理的错误。你的浏览器存档仍保留在本地，重新载入不会主动清除它。
        </p>
        <details>
          <summary>错误信息</summary>
          <code>{this.state.error.message || "未知错误"}</code>
        </details>
        <div className="app-error-actions">
          <button type="button" onClick={() => window.location.reload()}>
            重新载入
          </button>
          <button type="button" onClick={() => window.location.assign(storyUrl())}>
            返回年度剧情
          </button>
        </div>
      </main>
    );
  }
}
