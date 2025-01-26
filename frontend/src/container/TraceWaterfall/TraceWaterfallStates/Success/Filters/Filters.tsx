import './Filters.styles.scss';

import { Button, Typography } from 'antd';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { TracesAggregatorOperator } from 'types/common/queryBuilder';

import { BASE_FILTER_QUERY } from './constants';

function prepareQuery(filters: TagFilter): Query {
	return {
		...initialQueriesMap.traces,
		builder: {
			...initialQueriesMap.traces.builder,
			queryData: [
				{
					...initialQueriesMap.traces.builder.queryData[0],
					aggregateOperator: TracesAggregatorOperator.NOOP,
					orderBy: [{ columnName: 'timestamp', order: 'asc' }],
					filters: {
						...filters,
						items: [
							...filters.items,
							{
								id: '5ab8e1cf',
								key: {
									key: 'trace_id',
									dataType: DataTypes.String,
									type: '',
									isColumn: true,
									isJSON: false,
									id: 'trace_id--string----true',
								},
								op: '=',
								value: '00000000000000003f3a1f74f0b67f9f',
							},
						],
					},
				},
			],
		},
	};
}

function Filters({
	startTime,
	endTime,
}: {
	startTime: number;
	endTime: number;
}): JSX.Element {
	const [filters, setFilters] = useState<TagFilter>(BASE_FILTER_QUERY.filters);
	const [filteredSpanIds, setFilteredSpanIds] = useState<string[]>([]);
	const handleFilterChange = (value: TagFilter): void => {
		setFilters(value);
	};
	const [currentSearchedIndex, setCurrentSearchedIndex] = useState<number>(0);
	const { search } = useLocation();
	const history = useHistory();

	const { data } = useGetQueryRange(
		{
			query: prepareQuery(filters),
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			start: startTime,
			end: endTime,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination: {
					offset: 0,
					limit: 200,
				},
				selectColumns: [
					{
						key: 'name',
						dataType: 'string',
						type: 'tag',
						isColumn: true,
						isJSON: false,
						id: 'name--string--tag--true',
						isIndexed: false,
					},
				],
			},
		},
		DEFAULT_ENTITY_VERSION,
		{
			queryKey: [filters],
			enabled: filters.items.length > 0,
		},
	);

	useEffect(() => {
		if (data?.payload.data.newResult.data.result[0].list) {
			setFilteredSpanIds(
				data?.payload.data.newResult.data.result[0].list.map(
					(val) => val.data.spanID,
				),
			);
		} else {
			setFilteredSpanIds([]);
			setCurrentSearchedIndex(0);
		}
	}, [data?.payload.data.newResult.data.result]);

	useEffect(() => {
		if (filteredSpanIds.length === 0) return;

		const searchParams = new URLSearchParams(search);
		searchParams.set('spanId', filteredSpanIds[currentSearchedIndex]);
		history.replace({ search: searchParams.toString() });
	}, [currentSearchedIndex, filteredSpanIds, history, search]);

	return (
		<div className="filter-row">
			<QueryBuilderSearchV2
				query={BASE_FILTER_QUERY}
				onChange={handleFilterChange}
			/>
			{filteredSpanIds.length > 0 && (
				<div className="pre-next-toggle">
					<Typography.Text>
						{currentSearchedIndex + 1} / {filteredSpanIds.length}
					</Typography.Text>
					<Button
						icon={<ChevronUp size={14} />}
						disabled={currentSearchedIndex === 0}
						type="text"
						onClick={(): void => {
							setCurrentSearchedIndex((prev) => prev - 1);
						}}
					/>
					<Button
						icon={<ChevronDown size={14} />}
						type="text"
						disabled={currentSearchedIndex === filteredSpanIds.length - 1}
						onClick={(): void => {
							setCurrentSearchedIndex((prev) => prev + 1);
						}}
					/>
				</div>
			)}
		</div>
	);
}

export default Filters;
