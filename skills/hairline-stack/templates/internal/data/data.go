// Package data holds the payload types the page reads and the stores that fill them.
// Money is integer cents end to end; the browser formats it.
package data

import (
	"context"
	"sync"
	"time"
)

type Day struct {
	Day      string `json:"day"` // YYYY-MM-DD, UTC
	Cents    int64  `json:"cents"`
	Requests int64  `json:"requests"`
}

type Person struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Team     string `json:"team"`
	Cents    int64  `json:"cents"`
	Requests int64  `json:"requests"`
}

// Summary is one window and the equal window before it.
type Summary struct {
	From          string   `json:"from"`
	To            string   `json:"to"`
	Days          []Day    `json:"days"`
	TotalCents    int64    `json:"total_cents"`
	PreviousCents int64    `json:"previous_cents"`
	Requests      int64    `json:"requests"`
	People        []Person `json:"people"`
	GeneratedAt   string   `json:"generated_at"`
}

type Store interface {
	Summary(ctx context.Context, days int) (Summary, error)
}

// Memory is an empty store. Replace it with a real one (Postgres, an API) in
// cmd/server; the page shows its empty states until then.
type Memory struct {
	mu  sync.RWMutex
	sum Summary
	Now func() time.Time
}

func NewMemory() *Memory { return &Memory{Now: time.Now} }

func (m *Memory) Summary(_ context.Context, days int) (Summary, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	to := m.Now().UTC()
	from := to.AddDate(0, 0, -(days - 1))
	s := m.sum
	s.From, s.To = from.Format(time.DateOnly), to.Format(time.DateOnly)
	if s.Days == nil {
		s.Days = []Day{}
	}
	if s.People == nil {
		s.People = []Person{}
	}
	s.GeneratedAt = to.Format(time.RFC3339)
	return s, nil
}
