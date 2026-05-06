package main

import (
	"fmt"
	"net/url"
)

func main() {
	u, _ := url.Parse("/mcp/messages/123?sessionId=123")
	fmt.Printf("sessionId: '%s'\n", u.Query().Get("sessionId"))
}
