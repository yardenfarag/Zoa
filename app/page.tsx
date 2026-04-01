export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-xl rounded-xl border border-gold/20 bg-card p-8 text-card-foreground shadow-sm">
        <h1 className="font-heading text-3xl tracking-tight text-gold">Zoa</h1>
        <p className="mt-3 text-parchment/70">
          Microbiological Archive — explore Bacteria, Parasites, Fungus,
          Amoebas, and Viruses.
        </p>
      </div>
    </div>
  )
}
