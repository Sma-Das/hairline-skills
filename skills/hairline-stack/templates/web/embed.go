// Package web embeds the built page, so the binary is the whole deploy.
// Run `npm run build` in web/ui before `go build` or `go test`.
package web

import (
	"embed"
	"mime"
	"path"
	"strings"
)

//go:embed all:ui/dist
var dist embed.FS

// Page is the built index.html, or nil when the build is missing.
func Page() []byte {
	body, err := dist.ReadFile("ui/dist/index.html")
	if err != nil {
		return nil
	}
	return body
}

// Asset returns one file from ui/dist/assets, such as index-abc123.js.
func Asset(name string) ([]byte, string, bool) {
	if name == "" || strings.Contains(name, "..") || strings.Contains(name, "/") {
		return nil, "", false
	}
	body, err := dist.ReadFile("ui/dist/assets/" + name)
	if err != nil || len(body) == 0 {
		return nil, "", false
	}
	ext := path.Ext(name)
	ctype := mime.TypeByExtension(ext)
	if ext == ".woff2" {
		ctype = "font/woff2"
	}
	if ctype == "" {
		ctype = "application/octet-stream"
	}
	return body, ctype, true
}
