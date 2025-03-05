package v2

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestFilterSeriesPoints(t *testing.T) {
	// Define test cases
	testCases := []struct {
		name           string
		seriesList     []*v3.Series
		missStart      int64 // in milliseconds
		missEnd        int64 // in milliseconds
		stepInterval   int64 // in seconds
		expectedPoints []*v3.Series
		expectedStart  int64 // in milliseconds
		expectedEnd    int64 // in milliseconds
	}{
		{
			name:         "Complete aggregation window",
			missStart:    1609459200000, // 01 Jan 2021 00:00:00 UTC
			missEnd:      1609466400000, // 01 Jan 2021 02:00:00 UTC
			stepInterval: 3600,          // 1 hour
			seriesList: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609459200000, Value: 1.0}, // 01 Jan 2021 00:00:00 UTC
						{Timestamp: 1609462800000, Value: 2.0}, // 01 Jan 2021 01:00:00 UTC
						{Timestamp: 1609466400000, Value: 3.0}, // 01 Jan 2021 02:00:00 UTC
					},
				},
			},
			expectedPoints: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609459200000, Value: 1.0},
						{Timestamp: 1609462800000, Value: 2.0},
						{Timestamp: 1609466400000, Value: 3.0},
					},
				},
			},
			expectedStart: 1609459200000,
			expectedEnd:   1609466400000,
		},
		{
			name:         "Filter first point",
			missStart:    1609464600000, // 01 Jan 2021 01:30:00 UTC
			missEnd:      1609470000000, // 01 Jan 2021 03:00:00 UTC
			stepInterval: 3600,          // 1 hour
			seriesList: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609462800000, Value: 2.0}, // 01 Jan 2021 01:00:00 UTC
						{Timestamp: 1609466400000, Value: 3.0}, // 01 Jan 2021 02:00:00 UTC
					},
				},
			},
			expectedPoints: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 3.0},
					},
				},
			},
			expectedStart: 1609466400000,
			expectedEnd:   1609470000000,
		},
		{
			name:         "Filter last point",
			missStart:    1609466400000, // 01 Jan 2021 02:00:00 UTC
			missEnd:      1609471800000, // 01 Jan 2021 03:30:00 UTC
			stepInterval: 3600,          // 1 hour
			seriesList: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 3.0}, // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 3.0}, // 01 Jan 2021 03:00:00 UTC
					},
				},
			},
			expectedPoints: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 3.0},
					},
				},
			},
			expectedStart: 1609466400000,
			expectedEnd:   1609470000000,
		},
		{
			name:         "Incomplete aggregation window",
			missStart:    1609470000000, // 01 Jan 2021 03:00:00 UTC
			missEnd:      1609471800000, // 01 Jan 2021 03:30:00 UTC
			stepInterval: 3600,          // 1 hour
			seriesList: []*v3.Series{
				{
					Points: []v3.Point{},
				},
			},
			expectedPoints: []*v3.Series{},
			expectedStart:  1609470000000,
			expectedEnd:    1609471800000,
		},
		{
			name:         "Filter first point with multiple series",
			missStart:    1609464600000, // 01 Jan 2021 01:30:00 UTC
			missEnd:      1609477200000, // 01 Jan 2021 05:00:00 UTC
			stepInterval: 3600,          // 1 hour
			seriesList: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609462800000, Value: 2.0}, // 01 Jan 2021 01:00:00 UTC
						{Timestamp: 1609466400000, Value: 3.0}, // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 4.0}, // 01 Jan 2021 03:00:00 UTC
						{Timestamp: 1609473600000, Value: 5.0}, // 01 Jan 2021 04:00:00 UTC
					},
				},
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 6.0}, // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 7.0}, // 01 Jan 2021 03:00:00 UTC
						{Timestamp: 1609473600000, Value: 8.0}, // 01 Jan 2021 04:00:00 UTC
					},
				},
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 9.0},  // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 10.0}, // 01 Jan 2021 03:00:00 UTC
						{Timestamp: 1609473600000, Value: 11.0}, // 01 Jan 2021 04:00:00 UTC
					},
				},
			},
			expectedPoints: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 3.0}, // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 4.0}, // 01 Jan 2021 03:00:00 UTC
						{Timestamp: 1609473600000, Value: 5.0}, // 01 Jan 2021 04:00:00 UTC
					},
				},
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 6.0}, // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 7.0}, // 01 Jan 2021 03:00:00 UTC
						{Timestamp: 1609473600000, Value: 8.0}, // 01 Jan 2021 04:00:00 UTC
					},
				},
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 9.0},  // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 10.0}, // 01 Jan 2021 03:00:00 UTC
						{Timestamp: 1609473600000, Value: 11.0}, // 01 Jan 2021 04:00:00 UTC
					},
				},
			},
			expectedStart: 1609466400000,
			expectedEnd:   1609477200000,
		},
		{
			name:         "Filter last point",
			missStart:    1609466400000, // 01 Jan 2021 02:00:00 UTC
			missEnd:      1609475400000, // 01 Jan 2021 04:30:00 UTC
			stepInterval: 3600,          // 1 hour
			seriesList: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 3.0}, // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 4.0}, // 01 Jan 2021 03:00:00 UTC
						{Timestamp: 1609473600000, Value: 5.0}, // 01 Jan 2021 04:00:00 UTC
					},
				},
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 6.0}, // 01 Jan 2021 02:00:00 UTC
					},
				},
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 9.0},  // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 10.0}, // 01 Jan 2021 03:00:00 UTC
					},
				},
			},
			expectedPoints: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 3.0}, // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 4.0}, // 01 Jan 2021 03:00:00 UTC
					},
				},
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 6.0}, // 01 Jan 2021 02:00:00 UTC
					},
				},
				{
					Points: []v3.Point{
						{Timestamp: 1609466400000, Value: 9.0},  // 01 Jan 2021 02:00:00 UTC
						{Timestamp: 1609470000000, Value: 10.0}, // 01 Jan 2021 03:00:00 UTC
					},
				},
			},
			expectedStart: 1609466400000,
			expectedEnd:   1609473600000,
		},
		{
			name:         "half range should return empty result",
			missStart:    1609473600000, // 01 Jan 2021 04:00:00 UTC
			missEnd:      1609475400000, // 01 Jan 2021 04:30:00 UTC
			stepInterval: 3600,          // 1 hour
			seriesList: []*v3.Series{
				{
					Points: []v3.Point{
						{Timestamp: 1609473600000, Value: 1.0}, // 01 Jan 2021 04:00:00 UTC
					},
				},
			},
			expectedPoints: []*v3.Series{},
			expectedStart:  1609473600000,
			expectedEnd:    1609475400000,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			filteredSeries, startTime, endTime := filterSeriesPoints(tc.seriesList, tc.missStart, tc.missEnd, tc.stepInterval)

			if len(tc.expectedPoints) != len(filteredSeries) {
				t.Errorf("Expected %d series, got %d", len(tc.expectedPoints), len(filteredSeries))
				return
			}

			for i := range tc.expectedPoints {
				if len(tc.expectedPoints[i].Points) != len(filteredSeries[i].Points) {
					t.Errorf("Series %d: Expected %d points, got %d\nExpected points: %+v\nGot points: %+v",
						i,
						len(tc.expectedPoints[i].Points),
						len(filteredSeries[i].Points),
						tc.expectedPoints[i].Points,
						filteredSeries[i].Points)
					continue
				}

				for j := range tc.expectedPoints[i].Points {
					if tc.expectedPoints[i].Points[j].Timestamp != filteredSeries[i].Points[j].Timestamp {
						t.Errorf("Series %d Point %d: Expected timestamp %d, got %d", i, j, tc.expectedPoints[i].Points[j].Timestamp, filteredSeries[i].Points[j].Timestamp)
					}
					if tc.expectedPoints[i].Points[j].Value != filteredSeries[i].Points[j].Value {
						t.Errorf("Series %d Point %d: Expected value %f, got %f", i, j, tc.expectedPoints[i].Points[j].Value, filteredSeries[i].Points[j].Value)
					}
				}
			}

			if tc.expectedStart != startTime {
				t.Errorf("Expected start time %d, got %d", tc.expectedStart, startTime)
			}
			if tc.expectedEnd != endTime {
				t.Errorf("Expected end time %d, got %d", tc.expectedEnd, endTime)
			}
		})
	}
}
