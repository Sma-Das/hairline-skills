package data

import (
	"context"
	"math"
	"math/rand"
	"sort"
	"time"
)

// Sample generates a stable, invented data set for UI work. The same seed gives the
// same people and amounts, so screenshots and reviews compare like with like.
type Sample struct {
	Seed int64
	Now  func() time.Time
}

func NewSample(seed int64) *Sample { return &Sample{Seed: seed, Now: time.Now} }

var sampleFirst = []string{"Ada", "Rui", "Mina", "Theo", "Lena", "Omar", "Iris", "Jonas", "Priya", "Kai", "Noor", "Elif"}
var sampleLast = []string{"Park", "Okafor", "Solberg", "Laurent", "Novak", "Haddad", "Mendes", "Berg", "Rao", "Tanaka", "Aziz", "Demir"}
var sampleTeams = []string{"Platform", "Data", "Design", "Support"}

func (s *Sample) Summary(_ context.Context, days int) (Summary, error) {
	rng := rand.New(rand.NewSource(s.Seed))
	to := s.Now().UTC()
	from := to.AddDate(0, 0, -(days - 1))
	out := Summary{From: from.Format(time.DateOnly), To: to.Format(time.DateOnly), GeneratedAt: to.Format(time.RFC3339)}

	weights := make([]float64, len(sampleFirst))
	var weightSum float64
	for i := range weights {
		weights[i] = math.Pow(rng.Float64(), 2) + 0.05
		weightSum += weights[i]
	}
	people := make([]Person, len(sampleFirst))
	for i := range people {
		people[i] = Person{Name: sampleFirst[i] + " " + sampleLast[i], Team: sampleTeams[i%len(sampleTeams)]}
		people[i].Email = lower(sampleFirst[i]) + "." + lower(sampleLast[i]) + "@example.com"
	}
	for d := 0; d < days; d++ {
		day := from.AddDate(0, 0, d)
		base := 9000 + 6000*math.Sin(float64(d)/4) + float64(d)*120
		if wd := day.Weekday(); wd == time.Saturday || wd == time.Sunday {
			base *= 0.35
		}
		cents := int64(math.Max(0, base+rng.NormFloat64()*1800))
		requests := cents/9 + int64(rng.Intn(40))
		out.Days = append(out.Days, Day{Day: day.Format(time.DateOnly), Cents: cents, Requests: requests})
		out.TotalCents += cents
		out.Requests += requests
		for i := range people {
			share := weights[i] / weightSum
			people[i].Cents += int64(float64(cents) * share)
			people[i].Requests += int64(float64(requests) * share)
		}
	}
	out.PreviousCents = int64(float64(out.TotalCents) * (0.8 + rng.Float64()*0.3))
	sort.Slice(people, func(a, b int) bool { return people[a].Cents > people[b].Cents })
	out.People = people
	return out, nil
}

func lower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 32
		}
	}
	return string(b)
}
