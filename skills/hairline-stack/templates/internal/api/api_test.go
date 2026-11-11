package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"__MODULE__/internal/data"
)

func testServer() http.Handler {
	sample := data.NewSample(7)
	sample.Now = func() time.Time { return time.Date(2026, 3, 31, 12, 0, 0, 0, time.UTC) }
	return New(Deps{
		Store: sample,
		Page:  []byte("<!doctype html><title>t</title>"),
		Asset: func(name string) ([]byte, string, bool) {
			if name == "index-abc.js" {
				return []byte("console.log(1)"), "text/javascript", true
			}
			return nil, "", false
		},
	})
}

func get(t *testing.T, h http.Handler, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestCacheHeaders(t *testing.T) {
	h := testServer()
	if got := get(t, h, "/").Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("page cached: %q", got)
	}
	if got := get(t, h, "/assets/index-abc.js").Header().Get("Cache-Control"); !strings.Contains(got, "immutable") {
		t.Fatalf("asset not immutable: %q", got)
	}
	if code := get(t, h, "/assets/missing.js").Code; code != http.StatusNotFound {
		t.Fatalf("missing asset: %d", code)
	}
}

func TestSummary(t *testing.T) {
	h := testServer()
	rec := get(t, h, "/v1/summary?days=14")
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	var sum data.Summary
	if err := json.Unmarshal(rec.Body.Bytes(), &sum); err != nil {
		t.Fatal(err)
	}
	if len(sum.Days) != 14 || sum.From != "2026-03-18" || sum.To != "2026-03-31" {
		t.Fatalf("window %s..%s with %d days", sum.From, sum.To, len(sum.Days))
	}
	var total int64
	for _, d := range sum.Days {
		total += d.Cents
	}
	if total != sum.TotalCents {
		t.Fatalf("total %d, days add to %d", sum.TotalCents, total)
	}
}

func TestSummaryRejectsBadDays(t *testing.T) {
	for _, q := range []string{"0", "91", "x"} {
		if code := get(t, testServer(), "/v1/summary?days="+q).Code; code != http.StatusBadRequest {
			t.Fatalf("days=%s: %d", q, code)
		}
	}
}

func TestWrongMethod(t *testing.T) {
	rec := httptest.NewRecorder()
	testServer().ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/v1/summary", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST: %d", rec.Code)
	}
}
