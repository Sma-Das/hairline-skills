// Command server is the production entrypoint: the page, its assets, and the API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"__MODULE__/internal/api"
	"__MODULE__/internal/data"
	"__MODULE__/web"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}
	page := web.Page()
	if page == nil {
		log.Warn("page missing: run npm run build in web/ui")
	}
	// Swap in the real store here.
	store := data.NewMemory()
	srv := &http.Server{
		Addr:              addr,
		Handler:           api.New(api.Deps{Store: store, Page: page, Asset: web.Asset, Log: log}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shut, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shut)
	}()
	log.Info("listening", "addr", addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Error("serve", "err", err)
		os.Exit(1)
	}
}
