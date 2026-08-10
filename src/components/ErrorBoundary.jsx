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
      const isChunkError = this.state.error?.toString().includes('Failed to fetch dynamically imported module');

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1117] text-red-500 p-8 text-center">
          <h2 className="text-2xl font-bold mb-2 text-white">
            {isChunkError ? 'Versi Baru Aplikasi Tersedia' : 'Terjadi Kesalahan (Crash)'}
          </h2>
          <p className="mb-4 text-gray-300 text-sm">
            {isChunkError 
              ? 'Aplikasi telah diperbarui ke versi terbaru. Silakan muat ulang halaman untuk menggunakan versi baru.'
              : 'Sistem mengalami kesalahan saat memuat komponen ini.'}
          </p>
          {!isChunkError && (
            <pre className="bg-[#161b22] p-4 text-xs overflow-auto max-w-full rounded border border-red-500/30 text-left mb-4">
              {this.state.error?.toString()}
            </pre>
          )}
          <button 
            onClick={() => {
              sessionStorage.clear();
              window.location.reload(true);
            }} 
            className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            Muat Ulang Halaman Versi Terbaru
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
