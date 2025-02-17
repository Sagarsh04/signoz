package metricsexplorer

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/model/metrics_explorer"
)

func ParseFilterKeySuggestions(r *http.Request) (*metrics_explorer.FilterKeyRequest, *model.ApiError) {

	searchText := r.URL.Query().Get("searchText")
	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		limit = 50
	}

	return &metrics_explorer.FilterKeyRequest{Limit: limit, SearchText: searchText}, nil
}

func ParseFilterValueSuggestions(r *http.Request) (*metrics_explorer.FilterValueRequest, *model.ApiError) {
	var filterValueRequest metrics_explorer.FilterValueRequest

	// parse the request body
	if err := json.NewDecoder(r.Body).Decode(&filterValueRequest); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}

	return &filterValueRequest, nil
}

func ParseSummaryListMetricsParams(r *http.Request) (*metrics_explorer.SummaryListMetricsRequest, *model.ApiError) {
	var listMetricsParams *metrics_explorer.SummaryListMetricsRequest

	// parse the request body
	if err := json.NewDecoder(r.Body).Decode(&listMetricsParams); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}

	return listMetricsParams, nil
}

func ParseTreeMapMetricsParams(r *http.Request) (*metrics_explorer.TreeMapMetricsRequest, *model.ApiError) {
	var treeMapMetricParams *metrics_explorer.TreeMapMetricsRequest

	// parse the request body
	if err := json.NewDecoder(r.Body).Decode(&treeMapMetricParams); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("cannot parse the request body: %v", err)}
	}

	return treeMapMetricParams, nil
}

func ParseRelatedMetricsParams(r *http.Request) (*metrics_explorer.RelatedMetricsRequest, *model.ApiError) {
	var relatedMetricParams metrics_explorer.RelatedMetricsRequest
	relatedMetricParams.CurrentMetricName = r.URL.Query().Get("currentMetricName")
	start, err := strconv.ParseInt(r.URL.Query().Get("start"), 10, 64)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("start param should be of type int64: %v", err)}
	}
	end, err := strconv.ParseInt(r.URL.Query().Get("end"), 10, 64)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("end param should be of type int64: %v", err)}
	}
	relatedMetricParams.Start = start
	relatedMetricParams.End = end

	return &relatedMetricParams, nil
}
