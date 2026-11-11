// Command sample serves the page with generated data, for UI work. It never touches a
// real store. `npm run dev` in web/ui proxies its API.
//
//	go run ./cmd/sample            # 127.0.0.1:8080
//	go run ./cmd/sample -seed 3
package main

import (
	"flag"
	"log/slog"
	"net/http"
	"os"

	"__MODULE__/internal/api"
	"__MODULE__/internal/data"
	"__MODULE__/web"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:8080", "listen address; keep it on loopback")
	seed := flag.Int64("seed", 1, "sample data seed")
	flag.Parse()
	log := slog.New(slog.NewTextHandler(os.Stderr, nil))
	h := api.New(api.Deps{Store: data.NewSample(*seed), Page: web.Page(), Asset: web.Asset, Log: log})
	log.Info("sample data", "url", "http://"+*addr)
	if err := http.ListenAndServe(*addr, h); err != nil {
		log.Error("serve", "err", err)
		os.Exit(1)
	}
}
