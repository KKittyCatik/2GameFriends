package bot

import (
	"context"
	"net"
	"net/http"
	"os"

	"golang.org/x/net/proxy"
)

func NewHTTPClient() *http.Client {
	socksAddr := os.Getenv("SOCKS5_PROXY")
	if socksAddr == "" {
		return http.DefaultClient
	}

	dialer, err := proxy.SOCKS5("tcp", socksAddr, nil, proxy.Direct)
	if err != nil {
		panic("failed to create SOCKS5 dialer: " + err.Error())
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return dialer.Dial(network, addr)
		},
	}

	return &http.Client{Transport: transport}
}
