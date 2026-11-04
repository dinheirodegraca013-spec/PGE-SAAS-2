import { useState } from "react";
import type { Item } from "./EstoqueView";

type Props = {
  itens: Item[];
  selecionado: string;
  onSelect: (id: string) => void;
};

const tone = {
  critico: { fill: "#ffe3e3", stroke: "#e03131" },
  atencao: { fill: "#fff4d6", stroke: "#b97a00" },
  normal: { fill: "#e3f6ec", stroke: "#16a361" },
};

export default function StockMap({ itens, selecionado, onSelect }: Props) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(itens.length / 10));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleItems = itens.slice(currentPage * 10, currentPage * 10 + 10);
  const slabs = visibleItems.slice(0, 4);
  const hardware = visibleItems.slice(4);
  const ativarPorTeclado = (
    event: React.KeyboardEvent<SVGGElement>,
    id: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };
  return (
    <div>
      <svg
        viewBox="0 0 660 360"
        role="group"
        aria-label="Mapa esquemático do estoque"
      >
        <rect
          x="12"
          y="12"
          width="390"
          height="330"
          rx="12"
          fill="none"
          stroke="#e3e5ef"
          strokeDasharray="6 6"
        />
        <text x="28" y="36" fill="#748097" fontSize="13" fontWeight="700">
          Área de materiais
        </text>
        {slabs.map((item, index) => {
          const status =
            Number(item.saldo) <= Number(item.estoque_minimo)
              ? "critico"
              : Number(item.saldo) <= Number(item.estoque_minimo) * 1.5
                ? "atencao"
                : "normal";
          const x = 28 + index * 88;
          const height = 205;
          const y = 72;
          return (
            <g
              key={item.id}
              className="cursor-pointer outline-none"
              role="button"
              tabIndex={0}
              aria-pressed={selecionado === item.id}
              aria-label={`${item.nome}, saldo ${item.saldo} ${item.unidade}, status ${status === "critico" ? "crítico" : status === "atencao" ? "atenção" : "normal"}`}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => ativarPorTeclado(event, item.id)}
            >
              <rect
                x={x}
                y={y}
                width="68"
                height={height}
                rx="9"
                fill={tone[status].fill}
                stroke={tone[status].stroke}
                strokeWidth={selecionado === item.id ? 4 : 2}
              />
              <text
                x={x + 34}
                y={y + 25}
                textAnchor="middle"
                fill="#131c32"
                fontSize="11"
                fontWeight="700"
              >
                {item.nome.slice(0, 12)}
              </text>
              <text
                x={x + 34}
                y={y + 56}
                textAnchor="middle"
                fill="#748097"
                fontSize="12"
              >
                {item.saldo} {item.unidade}
              </text>
              <text
                x={x + 34}
                y={y + 178}
                textAnchor="middle"
                fill={tone[status].stroke}
                fontSize="10"
                fontWeight="700"
              >
                {status === "critico"
                  ? "CRÍTICO"
                  : status === "atencao"
                    ? "ATENÇÃO"
                    : "NORMAL"}
              </text>
            </g>
          );
        })}
        <rect
          x="28"
          y="292"
          width="332"
          height="32"
          rx="8"
          fill="#f5f7fb"
          stroke="#e3e5ef"
        />
        <text x="44" y="313" fill="#748097" fontSize="11">
          Selecione um item para ver detalhes
        </text>
        <rect
          x="420"
          y="12"
          width="228"
          height="330"
          rx="12"
          fill="none"
          stroke="#e3e5ef"
          strokeDasharray="6 6"
        />
        <text x="436" y="36" fill="#748097" fontSize="13" fontWeight="700">
          Armário de ferragens
        </text>
        {hardware.map((item, index) => {
          const status =
            Number(item.saldo) <= Number(item.estoque_minimo)
              ? "critico"
              : Number(item.saldo) <= Number(item.estoque_minimo) * 1.5
                ? "atencao"
                : "normal";
          const y = 58 + index * 43;
          return (
            <g
              key={item.id}
              className="cursor-pointer outline-none"
              role="button"
              tabIndex={0}
              aria-pressed={selecionado === item.id}
              aria-label={`${item.nome}, saldo ${item.saldo} ${item.unidade}, status ${status === "critico" ? "crítico" : status === "atencao" ? "atenção" : "normal"}`}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => ativarPorTeclado(event, item.id)}
            >
              <rect
                x="436"
                y={y}
                width="196"
                height="32"
                rx="8"
                fill={tone[status].fill}
                stroke={tone[status].stroke}
                strokeWidth={selecionado === item.id ? 3 : 1.5}
              />
              <text
                x="448"
                y={y + 20}
                fill="#131c32"
                fontSize="11"
                fontWeight="600"
              >
                {item.nome.slice(0, 22)}
              </text>
              <text
                x="620"
                y={y + 20}
                textAnchor="end"
                fill="#748097"
                fontSize="11"
              >
                {item.saldo} {item.unidade}
              </text>
            </g>
          );
        })}
        {!itens.length && (
          <text
            x="330"
            y="185"
            textAnchor="middle"
            fill="#748097"
            fontSize="14"
          >
            Nenhum item cadastrado
          </text>
        )}
      </svg>
      {pageCount > 1 && (
        <nav
          aria-label="Páginas do mapa de estoque"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"
        >
          <span aria-live="polite" className="text-xs text-slate-500">
            Itens {currentPage * 10 + 1}–
            {Math.min((currentPage + 1) * 10, itens.length)} de {itens.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={currentPage === pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Próxima
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

