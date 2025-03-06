package v2

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"

	logsV3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	logsV4 "go.signoz.io/signoz/pkg/query-service/app/logs/v4"
	metricsV3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	metricsV4 "go.signoz.io/signoz/pkg/query-service/app/metrics/v4"
	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	tracesV4 "go.signoz.io/signoz/pkg/query-service/app/traces/v4"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/querycache"
	"go.uber.org/zap"
)

func prepareLogsQuery(_ context.Context,
	useLogsNewSchema bool,
	start,
	end int64,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
	preferRPM bool,
) (string, error) {
	logsQueryBuilder := logsV3.PrepareLogsQuery
	if useLogsNewSchema {
		logsQueryBuilder = logsV4.PrepareLogsQuery
	}
	query := ""

	if params == nil || builderQuery == nil {
		return query, fmt.Errorf("params and builderQuery cannot be nil")
	}

	// for ts query with limit replace it as it is already formed
	if params.CompositeQuery.PanelType == v3.PanelTypeGraph && builderQuery.Limit > 0 && len(builderQuery.GroupBy) > 0 {
		limitQuery, err := logsQueryBuilder(
			start,
			end,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			v3.QBOptions{GraphLimitQtype: constants.FirstQueryGraphLimit, PreferRPM: preferRPM},
		)
		if err != nil {
			return query, err
		}
		placeholderQuery, err := logsQueryBuilder(
			start,
			end,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			v3.QBOptions{GraphLimitQtype: constants.SecondQueryGraphLimit, PreferRPM: preferRPM},
		)
		if err != nil {
			return query, err
		}
		query = strings.Replace(placeholderQuery, "#LIMIT_PLACEHOLDER", limitQuery, 1)
		return query, err
	}

	query, err := logsQueryBuilder(
		start,
		end,
		params.CompositeQuery.QueryType,
		params.CompositeQuery.PanelType,
		builderQuery,
		v3.QBOptions{PreferRPM: preferRPM},
	)
	if err != nil {
		return query, err
	}
	return query, err
}

// New function to filter series points
func filterSeriesPoints(seriesList []*v3.Series, missStart, missEnd int64, stepInterval int64) ([]*v3.Series, int64, int64) {
	filteredSeries := make([]*v3.Series, 0)
	startTime := missStart
	endTime := missEnd

	stepMs := stepInterval * 1000

	// return empty series if the interval is not complete
	if missStart+stepMs > missEnd {
		return []*v3.Series{}, missStart, missEnd
	}

	// if the end time is not a complete aggregation window, then we will have to adjust the end time
	// to the previous complete aggregation window end
	endCompleteWindow := missEnd%stepMs == 0
	if !endCompleteWindow {
		endTime = missEnd - (missEnd % stepMs)
	}

	// if the start time is not a complete aggregation window, then we will have to adjust the start time
	// to the next complete aggregation window
	if missStart%stepMs != 0 {
		startTime = missStart + stepMs - (missStart % stepMs)
	}

	for _, series := range seriesList {
		// if data for the series is empty, then we will add it to the cache
		if len(series.Points) == 0 {
			filteredSeries = append(filteredSeries, &v3.Series{
				Labels:      series.Labels,
				LabelsArray: series.LabelsArray,
				Points:      make([]v3.Point, 0),
			})
			continue
		}

		// Sort the points based on timestamp
		sort.Slice(series.Points, func(i, j int) bool {
			return series.Points[i].Timestamp < series.Points[j].Timestamp
		})

		points := make([]v3.Point, len(series.Points))
		copy(points, series.Points)

		// Filter the first point that is not a complete aggregation window
		if series.Points[0].Timestamp < missStart {
			// Remove the first point
			points = points[1:]
		}

		// filter the last point if it is not a complete aggregation window
		// adding or condition to handle the end time is equal to a complete window end https://github.com/SigNoz/signoz/pull/7212#issuecomment-2703677190
		if (!endCompleteWindow && series.Points[len(series.Points)-1].Timestamp == missEnd-(missEnd%stepMs)) ||
			(endCompleteWindow && series.Points[len(series.Points)-1].Timestamp == missEnd) {
			// Remove the last point
			points = points[:len(points)-1]
		}

		// making sure that empty range doesn't enter the cache
		if len(points) > 0 {
			filteredSeries = append(filteredSeries, &v3.Series{
				Labels:      series.Labels,
				LabelsArray: series.LabelsArray,
				Points:      points,
			})
		}
	}

	return filteredSeries, startTime, endTime
}

func (q *querier) runBuilderQuery(
	ctx context.Context,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
	cacheKeys map[string]string,
	ch chan channelResult,
	wg *sync.WaitGroup,
) {
	defer wg.Done()
	queryName := builderQuery.QueryName

	var preferRPM bool

	if q.featureLookUp != nil {
		preferRPM = q.featureLookUp.CheckFeature(constants.PreferRPM) == nil
	}

	// making a local clone since we should not update the global params if there is sift by
	start := params.Start
	end := params.End
	if builderQuery.ShiftBy != 0 {
		start = start - builderQuery.ShiftBy*1000
		end = end - builderQuery.ShiftBy*1000
	}

	// TODO: handle other data sources
	if builderQuery.DataSource == v3.DataSourceLogs {
		var query string
		var err error
		if _, ok := cacheKeys[queryName]; !ok || params.NoCache {
			zap.L().Info("skipping cache for logs query", zap.String("queryName", queryName), zap.Int64("start", params.Start), zap.Int64("end", params.End), zap.Int64("step", params.Step), zap.Bool("noCache", params.NoCache), zap.String("cacheKey", cacheKeys[queryName]))
			query, err = prepareLogsQuery(ctx, q.UseLogsNewSchema, start, end, builderQuery, params, preferRPM)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
			series, err := q.execClickHouseQuery(ctx, query)
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
			return
		}
		misses := q.queryCache.FindMissingTimeRangesV2(start, end, builderQuery.StepInterval, cacheKeys[queryName])
		zap.L().Info("cache misses for logs query", zap.Any("misses", misses))
		missedSeries := make([]querycache.CachedSeriesData, 0)
		filteredMissedSeries := make([]querycache.CachedSeriesData, 0)
		for _, miss := range misses {
			query, err = prepareLogsQuery(ctx, q.UseLogsNewSchema, miss.Start, miss.End, builderQuery, params, preferRPM)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
			series, err := q.execClickHouseQuery(ctx, query)
			if err != nil {
				ch <- channelResult{
					Err:    err,
					Name:   queryName,
					Query:  query,
					Series: nil,
				}
				return
			}

			filteredSeries, startTime, endTime := filterSeriesPoints(series, miss.Start, miss.End, builderQuery.StepInterval)

			// making sure that empty range doesn't doesn't enter the cache
			// empty results from filteredSeries means data was filtered out, but empty series means actual empty data
			if len(filteredSeries) > 0 || len(series) == 0 {
				filteredMissedSeries = append(filteredMissedSeries, querycache.CachedSeriesData{
					Data:  filteredSeries,
					Start: startTime,
					End:   endTime,
				})
			}

			// for the actual response
			missedSeries = append(missedSeries, querycache.CachedSeriesData{
				Data:  series,
				Start: miss.Start,
				End:   miss.End,
			})
		}

		filteredMergedSeries := q.queryCache.MergeWithCachedSeriesDataV2(cacheKeys[queryName], filteredMissedSeries)
		q.queryCache.StoreSeriesInCache(cacheKeys[queryName], filteredMergedSeries)

		mergedSeries := q.queryCache.MergeWithCachedSeriesDataV2(cacheKeys[queryName], missedSeries)

		resultSeries := common.GetSeriesFromCachedDataV2(mergedSeries, start, end, builderQuery.StepInterval)

		ch <- channelResult{
			Err:    nil,
			Name:   queryName,
			Series: resultSeries,
		}

		return
	}

	if builderQuery.DataSource == v3.DataSourceTraces {

		tracesQueryBuilder := tracesV3.PrepareTracesQuery
		if q.UseTraceNewSchema {
			tracesQueryBuilder = tracesV4.PrepareTracesQuery
		}

		var query string
		var err error
		// for ts query with group by and limit form two queries
		if params.CompositeQuery.PanelType == v3.PanelTypeGraph && builderQuery.Limit > 0 && len(builderQuery.GroupBy) > 0 {
			limitQuery, err := tracesQueryBuilder(
				start,
				end,
				params.CompositeQuery.PanelType,
				builderQuery,
				v3.QBOptions{GraphLimitQtype: constants.FirstQueryGraphLimit, PreferRPM: preferRPM},
			)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: limitQuery, Series: nil}
				return
			}
			placeholderQuery, err := tracesQueryBuilder(
				start,
				end,
				params.CompositeQuery.PanelType,
				builderQuery,
				v3.QBOptions{GraphLimitQtype: constants.SecondQueryGraphLimit, PreferRPM: preferRPM},
			)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: limitQuery, Series: nil}
				return
			}
			query = strings.Replace(placeholderQuery, "#LIMIT_PLACEHOLDER", limitQuery, 1)
		} else {
			query, err = tracesQueryBuilder(
				start,
				end,
				params.CompositeQuery.PanelType,
				builderQuery,
				v3.QBOptions{PreferRPM: preferRPM},
			)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
		}

		series, err := q.execClickHouseQuery(ctx, query)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	// What is happening here?
	// We are only caching the graph panel queries. A non-existant cache key means that the query is not cached.
	// If the query is not cached, we execute the query and return the result without caching it.
	if _, ok := cacheKeys[queryName]; !ok || params.NoCache {
		zap.L().Info("skipping cache for metrics query", zap.String("queryName", queryName), zap.Int64("start", params.Start), zap.Int64("end", params.End), zap.Int64("step", params.Step), zap.Bool("noCache", params.NoCache), zap.String("cacheKey", cacheKeys[queryName]))
		query, err := metricsV4.PrepareMetricQuery(start, end, params.CompositeQuery.QueryType, params.CompositeQuery.PanelType, builderQuery, metricsV3.Options{PreferRPM: preferRPM})
		if err != nil {
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
			return
		}
		series, err := q.execClickHouseQuery(ctx, query)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	misses := q.queryCache.FindMissingTimeRanges(start, end, builderQuery.StepInterval, cacheKeys[queryName])
	zap.L().Info("cache misses for metrics query", zap.Any("misses", misses))
	missedSeries := make([]querycache.CachedSeriesData, 0)
	for _, miss := range misses {
		query, err := metricsV4.PrepareMetricQuery(
			miss.Start,
			miss.End,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			metricsV3.Options{},
		)
		if err != nil {
			ch <- channelResult{
				Err:    err,
				Name:   queryName,
				Query:  query,
				Series: nil,
			}
			return
		}
		series, err := q.execClickHouseQuery(ctx, query)
		if err != nil {
			ch <- channelResult{
				Err:    err,
				Name:   queryName,
				Query:  query,
				Series: nil,
			}
			return
		}
		missedSeries = append(missedSeries, querycache.CachedSeriesData{
			Data:  series,
			Start: miss.Start,
			End:   miss.End,
		})
	}
	mergedSeries := q.queryCache.MergeWithCachedSeriesData(cacheKeys[queryName], missedSeries)

	resultSeries := common.GetSeriesFromCachedData(mergedSeries, start, end)

	ch <- channelResult{
		Err:    nil,
		Name:   queryName,
		Series: resultSeries,
	}
}
