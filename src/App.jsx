import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Heart,
  HeartOff,
  Loader2,
  Film,
  Star,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react";

/**
 * Aplicação React — Catálogo de Filmes (OMDb)
 * -------------------------------------------------------------
 * Funcionalidades:
 * 1) Página de busca com resultados (pôster, título, ano, detalhes)
 * 2) Paginação completa (baseada em totalResults da OMDb)
 * 3) Página de detalhes (diretor, elenco, sinopse, avaliação etc.)
 * 4) Lista de favoritos (adicionar/remover) com persistência em localStorage
 * 5) Tratamento de loading e erros (mensagens amigáveis)
 *
 * ⚙️ Como usar a API Key (OMDb)
 * - Crie uma chave gratuita em http://www.omdbapi.com/apikey.aspx
 * - Você pode informar a chave direto na UI (banner no topo) e ela será salva em localStorage, OU
 * - Defina VITE_OMDB_API_KEY em um .env (Vite) e a app tentará ler automaticamente.
 */

// Base da API OMDb
const OMDB_BASE = "https://www.omdbapi.com/";

// Lê possíveis fontes de API key (env/localStorage/UI)
const envKey =
  (import.meta.env && import.meta.env.VITE_OMDB_API_KEY) ||
  (typeof process !== "undefined" && process.env && process.env.OMDB_API_KEY) ||
  "";


// Hook prático para sincronizar estado com localStorage
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

// Utilitário para transformar hash em rota simples
function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, ""); // remove # e /
  if (!hash) return { name: "search", params: {} };
  const parts = hash.split("/");
  if (parts[0] === "detalhes" && parts[1]) return { name: "details", params: { id: parts[1] } };
  if (parts[0] === "favoritos") return { name: "favorites", params: {} };
  return { name: "search", params: {} };
}

// Placeholder quando pôster não disponível
const PosterFallback = () => (
  <div className="flex h-64 w-full items-center justify-center bg-slate-100 text-slate-500">
    <Film className="h-8 w-8" />
  </div>
);

// Componente de banner para definir/alterar a API Key
function ApiKeyBanner({ apiKey, onSave }) {
  const [temp, setTemp] = useState(apiKey || "");
  const inputRef = useRef(null);
  useEffect(() => {
    if (!apiKey && inputRef.current) inputRef.current.focus();
  }, [apiKey]);

  if (apiKey) return null;
  return (
    <div className="sticky top-0 z-50 w-full bg-amber-50 p-3 shadow">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-amber-900">
          Informe sua <span className="font-semibold">OMDb API Key</span> para habilitar as buscas.
          Você pode obter uma gratuitamente em omdbapi.com/apikey.aspx.
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="Cole sua API Key aqui"
            className="w-56 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none ring-amber-300 focus:ring"
          />
          <button
            onClick={() => onSave(temp.trim())}
            className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// Navbar simples
function Navbar({ onNavigate, currentRoute }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Film className="h-6 w-6 text-slate-700" />
          <span className="text-lg font-semibold text-slate-800">CineBusca</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <button
            onClick={() => onNavigate("search")}
            className={`rounded-xl px-3 py-1.5 ${
              currentRoute === "search" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Buscar
          </button>
          <button
            onClick={() => onNavigate("favorites")}
            className={`rounded-xl px-3 py-1.5 ${
              currentRoute === "favorites" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Favoritos
          </button>
        </nav>
      </div>
    </header>
  );
}

// Cartão de filme na lista de resultados/favoritos
function MovieCard({ movie, isFavorite, onToggleFavorite, onDetails }) {
  const poster = movie.Poster && movie.Poster !== "N/A" ? (
    <img src={movie.Poster} alt={`Pôster de ${movie.Title}`} className="h-64 w-full rounded-t-2xl object-cover" />
  ) : (
    <PosterFallback />
  );

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {poster}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold text-slate-800" title={movie.Title}>
            {movie.Title}
          </h3>
          <p className="text-xs text-slate-500">{movie.Year} • {movie.Type?.toUpperCase?.()}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <button
            onClick={onDetails}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Search className="h-4 w-4" /> Detalhes
          </button>
          <button
            onClick={onToggleFavorite}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              isFavorite ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-slate-900 text-white hover:bg-black"
            }`}
            title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            {isFavorite ? <HeartOff className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
            {isFavorite ? "Remover" : "Favoritar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Paginação
function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const goto = (p) => {
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    onChange(p);
  };

  // Gerar um pequeno range ao redor da página atual
  const pages = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  for (let p = from; p <= to; p++) pages.push(p);

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <button
        className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        onClick={() => goto(1)}
        disabled={!canPrev}
        aria-label="Primeira página"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button
        className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        onClick={() => goto(page - 1)}
        disabled={!canPrev}
        aria-label="Anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => goto(p)}
          className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
            p === page ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        onClick={() => goto(page + 1)}
        disabled={!canNext}
        aria-label="Próxima"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        onClick={() => goto(totalPages)}
        disabled={!canNext}
        aria-label="Última página"
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// Página de Busca
function SearchView({ apiKey, favorites, onToggleFavorite, onOpenDetails }) {
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.ceil(total / 10), [total]);

  const doSearch = async (q, p = 1) => {
    if (!q || !apiKey) return;
    setLoading(true);
    setError("");
    try {
      const url = `${OMDB_BASE}?apikey=${encodeURIComponent(apiKey)}&s=${encodeURIComponent(q)}&type=movie&page=${p}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.Response === "False") {
        setResults([]);
        setTotal(0);
        setError(data.Error || "Nenhum resultado encontrado.");
      } else {
        setResults(Array.isArray(data.Search) ? data.Search : []);
        setTotal(Number(data.totalResults || 0));
      }
    } catch (e) {
      setError("Ocorreu um erro na busca. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    doSearch(term, 1);
  };

  useEffect(() => {
    if (term && apiKey) doSearch(term, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-6">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Busque por título (ex.: Matrix, Inception, Cidade de Deus)"
            className="w-full rounded-2xl border border-slate-300 bg-white px-9 py-3 text-sm outline-none ring-slate-300 placeholder:text-slate-400 focus:ring"
          />
        </div>
        <button
          type="submit"
          disabled={!apiKey || !term}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
          title={!apiKey ? "Informe a API Key para habilitar a busca" : "Buscar"}
        >
          <Search className="h-4 w-4" /> Buscar
        </button>
      </form>

      {/* Estado de carregamento */}
      {loading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando…</span>
        </div>
      )}

      {/* Mensagens de erro */}
      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {error}
        </div>
      )}

      {/* Lista de resultados */}
      {!loading && !error && results.length > 0 && (
        <>
          <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
            <p>
              Exibindo <span className="font-semibold">{results.length}</span> de {total} resultado(s)
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {results.map((m) => (
              <MovieCard
                key={m.imdbID}
                movie={m}
                isFavorite={Boolean(favorites[m.imdbID])}
                onToggleFavorite={() => onToggleFavorite(m)}
                onDetails={() => onOpenDetails(m.imdbID)}
              />)
            )}
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="mt-10 text-center text-slate-500">
          <p>Comece buscando por um filme no campo acima.</p>
        </div>
      )}
    </section>
  );
}

// Página de Detalhes
function DetailsView({ apiKey, id, onBack, onToggleFavorite, isFavorite }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const url = `${OMDB_BASE}?apikey=${encodeURIComponent(apiKey)}&i=${encodeURIComponent(id)}&plot=full`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.Response === "False") {
        setError(json.Error || "Não foi possível obter os detalhes.");
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      setError("Ocorreu um erro ao carregar os detalhes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiKey && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, id]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-6">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {loading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando detalhes…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</div>
      )}

      {!loading && !error && data && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px,1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {data.Poster && data.Poster !== "N/A" ? (
              <img src={data.Poster} alt={`Pôster de ${data.Title}`} className="h-full w-full object-cover" />
            ) : (
              <PosterFallback />
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{data.Title}</h1>
                <p className="text-sm text-slate-600">{data.Year} • {data.Rated} • {data.Runtime}</p>
                <p className="text-sm text-slate-600">{data.Genre}</p>
              </div>
              <button
                onClick={() => onToggleFavorite({ imdbID: data.imdbID, Title: data.Title, Year: data.Year, Poster: data.Poster, Type: data.Type })}
                className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  isFavorite ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-slate-900 text-white hover:bg-black"
                }`}
              >
                {isFavorite ? <HeartOff className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                {isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              </button>
            </div>

            <div className="mt-1 inline-flex items-center gap-2 rounded-xl bg-yellow-50 px-2 py-1 text-sm text-yellow-900">
              <Star className="h-4 w-4" /> IMDb: <span className="font-semibold">{data.imdbRating}</span>
            </div>

            <div>
              <h2 className="mb-1 text-sm font-semibold text-slate-700">Sinopse</h2>
              <p className="text-sm leading-relaxed text-slate-700">{data.Plot}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoField label="Direção" value={data.Director} />
              <InfoField label="Roteiro" value={data.Writer} />
              <InfoField label="Elenco" value={data.Actors} />
              <InfoField label="País/Idioma" value={`${data.Country} • ${data.Language}`} />
              <InfoField label="Prêmios" value={data.Awards} />
              <InfoField label="Bilheteria" value={data.BoxOffice} />
            </div>

            <div className="text-xs text-slate-500">ID: {data.imdbID}</div>
          </div>
        </div>
      )}
    </section>
  );
}

function InfoField({ label, value }) {
  if (!value || value === "N/A") return null;
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

// Página de Favoritos
function FavoritesView({ favoritesMap, onToggleFavorite, onOpenDetails }) {
  const list = Object.values(favoritesMap);
  if (list.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-6 text-center text-slate-500">
        Você ainda não adicionou filmes aos favoritos.
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-3 text-sm text-slate-600">Total de favoritos: {list.length}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {list.map((m) => (
          <div key={m.imdbID} className="relative">
            <MovieCard
              movie={m}
              isFavorite={true}
              onToggleFavorite={() => onToggleFavorite(m)}
              onDetails={() => onOpenDetails(m.imdbID)}
            />
            <button
              onClick={() => onToggleFavorite(m)}
              title="Remover"
              className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-white/90 p-2 text-rose-600 shadow hover:bg-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// -----------------------
// App principal (roteamento simples por hash)
// -----------------------
export default function App() {
  // API key, priorizando env e permitindo sobrescrever via localStorage/UI
  const [apiKey, setApiKey] = useLocalStorage("omdbApiKey", envKey || "");

  // Favoritos (map por imdbID)
  const [favorites, setFavorites] = useLocalStorage("omdbFavorites", {});

  const [route, setRoute] = useState(parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (name, params = {}) => {
    if (name === "search") window.location.hash = "/";
    if (name === "favorites") window.location.hash = "/favoritos";
    if (name === "details") window.location.hash = `/detalhes/${params.id}`;
  };

  const toggleFavorite = (movie) => {
    setFavorites((prev) => {
      const next = { ...prev };
      if (next[movie.imdbID]) delete next[movie.imdbID];
      else next[movie.imdbID] = {
        imdbID: movie.imdbID,
        Title: movie.Title,
        Year: movie.Year,
        Poster: movie.Poster,
        Type: movie.Type,
      };
      return next;
    });
  };

  const isFav = (id) => Boolean(favorites[id]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ApiKeyBanner apiKey={apiKey} onSave={setApiKey} />
      <Navbar
        onNavigate={(where) => navigate(where)}
        currentRoute={route.name === "details" ? "search" : route.name}
      />

      {route.name === "search" && (
        <SearchView
          apiKey={apiKey}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onOpenDetails={(id) => navigate("details", { id })}
        />
      )}

      {route.name === "details" && (
        <DetailsView
          apiKey={apiKey}
          id={route.params.id}
          isFavorite={isFav(route.params.id)}
          onBack={() => navigate("search")}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {route.name === "favorites" && (
        <FavoritesView
          favoritesMap={favorites}
          onToggleFavorite={toggleFavorite}
          onOpenDetails={(id) => navigate("details", { id })}
        />
      )}

      <footer className="mx-auto mt-10 max-w-5xl px-4 pb-10 text-center text-xs text-slate-500">
        Construído com React + Tailwind e dados da OMDb. Este projeto é somente para fins educativos.
      </footer>
    </div>
  );
}
