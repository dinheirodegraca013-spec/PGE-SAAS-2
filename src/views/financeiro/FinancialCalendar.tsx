import { useState } from "react";

type Entry = {
  id: string;
  tipo: string;
  descricao: string;
  vencimento: string;
  status: string;
};

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function FinancialCalendar({ entries }: { entries: Entry[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDate(today);
  const pending = entries.filter(
    (entry) => !["quitado", "cancelado"].includes(entry.status),
  );
  const overdue = pending.filter((entry) => entry.vencimento < todayKey);
  const days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() + index);
    const key = localDate(date);
    return {
      date,
      key,
      entries: pending.filter((entry) => entry.vencimento === key),
    };
  });
  const selectedEntries =
    selected === "overdue"
      ? overdue
      : pending.filter((entry) => entry.vencimento === selected);
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-base font-bold text-slate-900">
        Mapa dos próximos 35 dias
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Toque em um dia para consultar os vencimentos.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)]">
        <button
          type="button"
          onClick={() => setSelected(selected === "overdue" ? null : "overdue")}
          aria-pressed={selected === "overdue"}
          className={`rounded-xl border-2 p-3 text-left ${overdue.length ? "border-rose-400 bg-rose-50 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-600"} ${selected === "overdue" ? "ring-2 ring-cyan-600 ring-offset-2" : ""}`}
        >
          <span className="text-xs">Atrasados</span>
          <b className="my-1 block text-2xl">{overdue.length}</b>
          <span className="text-xs">lançamento(s)</span>
        </button>
        <div className="min-w-0">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 sm:text-xs">
            {days.slice(0, 7).map(({ date, key }) => (
              <span key={key}>
                {date.toLocaleDateString("pt-BR", { weekday: "short" })}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map(({ date, key, entries: daily }) => {
              const payable = daily.some((entry) => entry.tipo === "despesa");
              const receivable = daily.some(
                (entry) => entry.tipo === "receita",
              );
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected === key}
                  aria-label={`${date.toLocaleDateString("pt-BR")}: ${daily.length} vencimento(s)`}
                  onClick={() => setSelected(selected === key ? null : key)}
                  className={`min-h-16 rounded-lg border-2 p-1.5 text-left text-xs transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 ${payable ? "bg-amber-50 text-amber-800" : receivable ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"} ${selected === key ? "border-cyan-600" : key === todayKey ? "border-slate-700" : "border-transparent"}`}
                >
                  <b className="block">
                    {String(date.getDate()).padStart(2, "0")}
                  </b>
                  {daily.length > 0 && (
                    <span className="mt-1 block text-[10px]">
                      {daily.length} conta(s)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>🟨 A pagar</span>
        <span>🟩 A receber</span>
        <span>⬜ Sem vencimentos</span>
      </div>
      {selected && (
        <div className="mt-4 border-t border-slate-100 pt-4" aria-live="polite">
          <h3 className="mb-2 text-sm font-bold">
            {selected === "overdue"
              ? "Contas atrasadas"
              : `Vencimentos em ${new Date(`${selected}T12:00:00`).toLocaleDateString("pt-BR")}`}
          </h3>
          {selectedEntries.length ? (
            selectedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-2 text-sm"
              >
                <span>{entry.descricao}</span>
                <span className="text-slate-500">
                  {entry.tipo === "receita" ? "A receber" : "A pagar"} ·{" "}
                  {entry.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Nenhum vencimento neste dia.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

