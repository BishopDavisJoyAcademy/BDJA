"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import Link from "next/link";
import { apiPost } from "@/lib/api-client";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    // Log to backend
    apiPost("/api/admin/errors", {
      message: error.message,
      stack: error.stack,
      component: errorInfo.componentStack?.split("\n")[1]?.trim() || "Unknown",
      url: typeof window !== "undefined" ? window.location.href : "server",
      source: "client",
    }).catch(() => {
      // Silent fail — don't break the error boundary
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
          <div className="max-w-lg w-full bg-slate-900/80 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Something went wrong</h1>
                <p className="text-sm text-gray-400">An unexpected error occurred</p>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
              <p className="text-sm text-red-300 font-mono break-all">{this.state.error?.message}</p>
              {this.state.errorInfo && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Technical details</summary>
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-40 font-mono">{this.state.errorInfo.componentStack}</pre>
                </details>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={this.handleReset} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-sm font-medium">
                <RefreshCw className="w-4 h-4" /> Reload Page
              </button>
              <Link href="/" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/50 text-gray-300 border border-slate-600 hover:bg-slate-700 transition-all text-sm font-medium">
                <Home className="w-4 h-4" /> Go Home
              </Link>
            </div>
            <p className="text-xs text-gray-600 mt-4 text-center">This error has been logged to the admin panel.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export class SectionErrorBoundary extends Component<Props & { sectionName: string }, State> {
  constructor(props: Props & { sectionName: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    apiPost("/api/admin/errors", {
      message: `[${this.props.sectionName}] ${error.message}`,
      stack: error.stack,
      component: this.props.sectionName,
      url: typeof window !== "undefined" ? window.location.href : "server",
      source: "client",
    }).catch(() => {});
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-800/50 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Bug className="w-5 h-5 text-red-400" />
            <h3 className="font-semibold text-white">{this.props.sectionName} failed to load</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">{this.state.error?.message}</p>
          <button onClick={this.handleReset} className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-sm font-medium flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
