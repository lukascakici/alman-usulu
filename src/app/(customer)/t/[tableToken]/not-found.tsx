export default function TableNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center space-y-3 max-w-sm">
        <h1 className="text-lg font-semibold text-neutral-900">QR kodu tanınmadı</h1>
        <p className="text-sm text-neutral-600">
          Bu masa için aktif bir oturum bulamadık. Lütfen kasadan yardım isteyin
          veya QR kodu tekrar okutun.
        </p>
      </div>
    </main>
  );
}
