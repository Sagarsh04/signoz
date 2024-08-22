package config

import (
	"context"

	signozconfmap "go.signoz.io/signoz/pkg/confmap"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/version"
	"go.signoz.io/signoz/pkg/web"
)

// This map contains the default values of all config structs
var (
	defaultMap map[string]signozconfmap.Config = map[string]signozconfmap.Config{
		"version":         &version.Config{},
		"instrumentation": &instrumentation.Config{},
		"web":             &web.Config{},
		"cache":           &cache.Config{},
		"auth":            &auth.Config{},
		"database":        &dao.Config{},
	}
)

// Config defines the entire configuration of signoz.
type Config struct {
	Version         version.Config         `mapstructure:"version"`
	Instrumentation instrumentation.Config `mapstructure:"instrumentation"`
	Web             web.Config             `mapstructure:"web"`
	Cache           cache.Config           `mapstructure:"cache"`
	Auth            auth.Config            `mapstructure:"auth"`
	Database        dao.Config             `mapstructure:"database"`
}

func New(ctx context.Context, settings ProviderSettings) (*Config, error) {
	provider, err := NewProvider(settings)
	if err != nil {
		return nil, err
	}

	return provider.Get(ctx)
}
