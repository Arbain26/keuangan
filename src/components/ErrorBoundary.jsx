import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1117] text-red-500 p-8">
          <h2 className="text-2xl font-bold mb-4">Terjadi Kesalahan (Crash)</h2>
          <p className="mb-4">Sistem gagal memuat komponen ini.</p>
          <pre className="bg-[#161b22] p-4 text-xs overflow-auto max-w-full rounded border border-red-500/30">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-600"
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
