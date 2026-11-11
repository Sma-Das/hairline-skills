package data

import (
	"context"
	"testing"
	"time"
)

func TestSampleSeriesConserveDailyTotals(t *testing.T) {
	sample := NewSample(7)
	sample.Now = func() time.Time { return time.Date(2026, 3, 31, 12, 0, 0, 0, time.UTC) }
	sum, err := sample.Summary(context.Background(), 30)
	if err != nil {
		t.Fatal(err)
	}
	if len(sum.Series) != 4 || sum.SourceLabel == "" || sum.UpdatedAt != "2026-03-31T12:00:00Z" {
		t.Fatal("incomplete generated series metadata")
	}
	keys := map[string]bool{}
	for _, series := range sum.Series {
		if keys[series.Key] || len(series.Values) != len(sum.Days) {
			t.Fatal("series keys or dates do not align")
		}
		keys[series.Key] = true
	}
	for i, day := range sum.Days {
		var total int64
		for _, series := range sum.Series {
			if series.Values[i] < 0 {
				t.Fatal("negative sample amount")
			}
			total += series.Values[i]
		}
		if total != day.Cents {
			t.Fatalf("%s: series %d, day %d", day.Day, total, day.Cents)
		}
	}
}

func TestEmptyStoreDoesNotInventProvenance(t *testing.T) {
	sum, err := NewMemory().Summary(context.Background(), 7)
	if err != nil {
		t.Fatal(err)
	}
	if len(sum.Series) != 0 || sum.SourceLabel != "" || sum.UpdatedAt != "" {
		t.Fatal("empty store invented source observations")
	}
}
