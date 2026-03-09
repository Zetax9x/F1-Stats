"use client";

export default function TeamRadioPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Team Radio</h1>
      <p className="mt-2 text-zinc-400">
        Ascolta le comunicazioni pilota–team per sessione.
      </p>

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold">Integrazione F1TV richiesta</h2>
        <p className="mt-2 text-sm text-zinc-400">
          I team radio non sono più forniti tramite OpenF1. Per ripristinare questa sezione
          serve un&apos;integrazione diretta con F1TV (auth + API proprietarie), che non è ancora
          configurata in questa app.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Nel frattempo puoi continuare a usare le altre sezioni dell&apos;app (Live, Storico,
          Telemetrie) che ora leggono tutti i dati da FastF1.
        </p>
      </section>
    </div>
  );
}
