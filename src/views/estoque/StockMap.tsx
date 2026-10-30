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
  const slabs = itens.slice(0, 4);
  const hardware = itens.slice(4, 10);
  return (
    <svg
      viewBox="0 0 660 360"
      role="img"
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
            className={
              selecionado === item.id ? "cursor-pointer" : "cursor-pointer"
            }
            onClick={() => onSelect(item.id)}
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
        Retalhos e sobras · dados cadastrados
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
            className="cursor-pointer"
            onClick={() => onSelect(item.id)}
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
        <text x="330" y="185" textAnchor="middle" fill="#748097" fontSize="14">
          Nenhum item cadastrado
        </text>
      )}
    </svg>
  );
}

