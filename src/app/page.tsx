export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="max-w-md text-center space-y-3">
        <p className="text-xs uppercase tracking-widest text-neutral-500">Alman Usulü</p>
        <h1 className="text-xl font-semibold text-neutral-900">
          Masadaki QR kodu okutarak menüye ulaşın
        </h1>
        <p className="text-sm text-neutral-600">
          Bu adres kafe personeli içindir. Müşteriyseniz lütfen masanızdaki QR
          kodu okutun.
        </p>
      </div>
    </main>
  );
}
