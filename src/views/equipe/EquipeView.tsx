import React, { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  RefreshCw,
  UserRoundCheck,
  UserRound,
  UserX,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Perfil = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  papel: string | null;
  ativo: boolean | null;
};

export default function EquipeView() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    const result = await supabase
      .from("profiles")
      .select("id,nome_completo,email,papel,ativo")
      .order("nome_completo");
    if (result.error) {
      setErro(
        "A equipe não pôde ser carregada. Verifique a permissão do administrador da empresa.",
      );
      setPerfis([]);
    } else setPerfis((result.data || []) as Perfil[]);
    setCarregando(false);
  };
  useEffect(() => {
    void carregar();
  }, []);

  const ativos = perfis.filter((perfil) => perfil.ativo).length;
  const inativos = perfis.filter((perfil) => perfil.ativo === false).length;
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return perfis;
    return perfis.filter((perfil) =>
      [perfil.nome_completo, perfil.email, perfil.papel]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo)),
    );
  }, [busca, perfis]);

  return (
    <div className="space-y-5 pb-5">
      <header className="gestio-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <UserRoundCheck className="h-5 w-5 text-cyan-600" />
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Equipe
            </h1>
          </div>
          <p className="gestio-section-subtitle">
            Colaboradores da empresa e situação de acesso.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          disabled={carregando}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
      </header>
      <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
        A presença diária ainda não está registrada no banco. Por isso, esta
        tela mostra apenas o status cadastral real e não inventa presença.
      </div>
      {erro && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <CircleAlert className="h-5 w-5 shrink-0" />
          {erro}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Total cadastrados</span>
            <UserRound className="h-4 w-4 text-cyan-600" />
          </div>
          <b className="mt-2 block text-2xl text-slate-900">{perfis.length}</b>
          <span className="text-xs text-slate-500">Origem: profiles</span>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <span>Ativos</span>
            <CircleCheck className="h-4 w-4" />
          </div>
          <b className="mt-2 block text-2xl text-emerald-800">{ativos}</b>
          <span className="text-xs text-emerald-700">Status cadastral</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Inativos</span>
            <UserX className="h-4 w-4" />
          </div>
          <b className="mt-2 block text-2xl text-slate-700">{inativos}</b>
          <span className="text-xs text-slate-500">Sem presença inventada</span>
        </div>
      </div>
      <section className="card overflow-hidden p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="gestio-section-title">Lista de colaboradores</h2>
            <p className="gestio-section-subtitle">
              Origem: profiles do tenant autenticado.
            </p>
          </div>
          <label className="w-full text-xs font-semibold text-slate-500 sm:w-64">
            Buscar colaborador
            <input
              aria-label="Buscar colaborador"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Nome, e-mail ou perfil"
              className="input-field mt-1"
            />
          </label>
        </div>
        {carregando ? (
          <p className="py-8 text-sm text-slate-500">Carregando equipe...</p>
        ) : !perfis.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Nenhum colaborador disponível para este usuário.
          </div>
        ) : !filtrados.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Nenhum colaborador corresponde à busca.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Perfil</th>
                  <th className="p-3">Setor</th>
                  <th className="p-3">Status cadastral</th>
                  <th className="p-3">Presença</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((perfil) => (
                  <tr key={perfil.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <b>{perfil.nome_completo || "Nome não informado"}</b>
                      <br />
                      <span className="text-xs text-slate-500">
                        {perfil.email || "E-mail não informado"}
                      </span>
                    </td>
                    <td className="p-3">
                      {perfil.papel || "Perfil não informado"}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      Não informado no cadastro
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${perfil.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {perfil.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      Presença não registrada
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

