// Package api serves the page, its hashed assets, and the JSON it reads, from one
// Go 1.22 ServeMux with method patterns. No router library.
package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"__MODULE__/internal/data"
)

type Deps struct {
	Store data.Store
	// Page is the built index.html. Asset returns one file under assets/.
	Page  []byte
	Asset func(name string) ([]byte, string, bool)
	Log   *slog.Logger
}

type server struct{ Deps }

func New(d Deps) http.Handler {
	if d.Log == nil {
		d.Log = slog.Default()
	}
	s := &server{d}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.health)
	mux.HandleFunc("GET /{$}", s.index)
	mux.HandleFunc("GET /assets/{name}", s.asset)
	mux.HandleFunc("GET /v1/summary", s.summary)
	return securityHeaders(mux)
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// The page is never cached, so a deploy is picked up on the next load. Everything it
// points at has a content hash in its name and is cached for a year.
func (s *server) index(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if len(s.Page) == 0 {
		http.Error(w, "page missing: run npm run build in web/ui", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(s.Page)
}

func (s *server) asset(w http.ResponseWriter, r *http.Request) {
	body, ctype, ok := s.Asset(r.PathValue("name"))
	if !ok {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	_, _ = w.Write(body)
}

// ?days= is bounded here, not in the page.
func (s *server) summary(w http.ResponseWriter, r *http.Request) {
	days, err := parseDays(r.URL.Query().Get("days"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	sum, err := s.Store.Summary(r.Context(), days)
	if err != nil {
		s.Log.Error("summary", "err", err)
		writeError(w, http.StatusInternalServerError, "could not load the summary")
		return
	}
	writeJSON(w, http.StatusOK, sum)
}

func parseDays(raw string) (int, error) {
	if raw == "" {
		return 30, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 || n > 90 {
		return 0, errors.New("days must be 1 to 90")
	}
	return n, nil
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'")
		next.ServeHTTP(w, r)
	})
}
