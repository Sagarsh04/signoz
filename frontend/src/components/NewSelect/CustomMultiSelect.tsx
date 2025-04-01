/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-nested-ternary */
/* eslint-disable react/function-component-definition */
import './styles.scss';

import { SearchOutlined } from '@ant-design/icons';
import { Checkbox, Select, SelectProps } from 'antd';
import cx from 'classnames';
import { isEmpty } from 'lodash-es';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { BaseSelectRef } from 'rc-select';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

export interface OptionData {
	label: string;
	value?: string;
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
	options?: OptionData[];
	type?: 'defined' | 'custom';
}

interface CustomTagProps {
	label: React.ReactNode;
	value: string;
	closable: boolean;
	onClose: () => void;
}

export interface CustomMultiSelectProps
	extends Omit<SelectProps<string[] | string>, 'options'> {
	placeholder?: string;
	className?: string;
	loading?: boolean;
	onSearch?: (value: string) => void;
	options?: OptionData[];
	defaultActiveFirstOption?: boolean;
	dropdownMatchSelectWidth?: boolean | number;
	noDataMessage?: string;
	onClear?: () => void;
	/**
	 * @deprecated Use enableAllSelection instead
	 */
	allowSelectAll?: boolean;
	/**
	 * Controls whether the "ALL" checkbox is displayed at the top of the dropdown.
	 * When checked, it selects all available options across all sections.
	 */
	enableAllSelection?: boolean;
	showAddCustomValue?: boolean;
	getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
	dropdownRender?: (menu: React.ReactElement) => React.ReactElement;
	highlightSearch?: boolean;
	customStatusText?: string;
	popupClassName?: string;
	placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
	placeholder = 'Search...',
	className,
	loading = false,
	onSearch,
	options = [],
	value = [],
	onChange,
	defaultActiveFirstOption = true,
	dropdownMatchSelectWidth = true,
	noDataMessage,
	onClear,
	allowSelectAll = true,
	enableAllSelection,
	showAddCustomValue = true,
	getPopupContainer,
	dropdownRender,
	highlightSearch = true,
	customStatusText,
	popupClassName,
	placement = 'bottomLeft',
	...rest
}) => {
	// ===== State & Refs =====
	const [isOpen, setIsOpen] = useState(false);
	const [searchText, setSearchText] = useState('');
	const selectRef = useRef<BaseSelectRef>(null);
	const [activeIndex, setActiveIndex] = useState<number>(-1);
	const [activeChipIndex, setActiveChipIndex] = useState<number>(-1); // For tracking active chip/tag
	const dropdownRef = useRef<HTMLDivElement>(null);
	const optionRefs = useRef<Record<number, HTMLDivElement | null>>({});

	// Convert single string value to array for consistency
	const selectedValues = useMemo(
		(): string[] =>
			Array.isArray(value) ? value : value ? [value as string] : [],
		[value],
	);

	// Helper function to get all values from options
	const getAllValues = useCallback((optionsList: OptionData[]): string[] => {
		const values: string[] = [];

		optionsList.forEach((option) => {
			if ('options' in option && Array.isArray(option.options)) {
				option.options?.forEach((subOption) => {
					if (subOption.value) values.push(subOption.value);
				});
			} else if (option.value) {
				values.push(option.value);
			}
		});

		return values;
	}, []);

	// ===== Option Filtering & Processing Utilities =====

	/**
	 * Checks if a label exists in the provided options
	 */
	const isLabelPresent = useCallback(
		(options: OptionData[], label: string): boolean =>
			options.some((option) => {
				const lowerLabel = label.toLowerCase();

				// Check in nested options if they exist
				if ('options' in option && Array.isArray(option.options)) {
					return (
						option.options?.some(
							(subOption) => subOption.label.toLowerCase() === lowerLabel,
						) || false
					);
				}

				// Check top-level option
				return option.label.toLowerCase() === lowerLabel;
			}),
		[],
	);

	/**
	 * Filters options based on search text
	 */
	const filterOptionsBySearch = useCallback(
		(options: OptionData[], searchText: string): OptionData[] => {
			if (!searchText.trim()) return options;

			const lowerSearchText = searchText.toLowerCase();

			return options
				.map((option) => {
					if ('options' in option && Array.isArray(option.options)) {
						// Filter nested options
						const filteredSubOptions =
							option.options?.filter((subOption) =>
								subOption.label.toLowerCase().includes(lowerSearchText),
							) || [];

						return filteredSubOptions.length > 0
							? { ...option, options: filteredSubOptions }
							: undefined;
					}

					// Filter top-level options
					return option.label.toLowerCase().includes(lowerSearchText)
						? option
						: undefined;
				})
				.filter(Boolean) as OptionData[];
		},
		[],
	);

	/**
	 * Separates section and non-section options
	 */
	const splitOptions = useCallback((options: OptionData[]): {
		sectionOptions: OptionData[];
		nonSectionOptions: OptionData[];
	} => {
		const sectionOptions: OptionData[] = [];
		const nonSectionOptions: OptionData[] = [];

		options.forEach((option) => {
			if ('options' in option && Array.isArray(option.options)) {
				sectionOptions.push(option);
			} else {
				nonSectionOptions.push(option);
			}
		});

		return { sectionOptions, nonSectionOptions };
	}, []);

	/**
	 * Apply search filtering to options
	 */
	const filteredOptions = useMemo(
		(): OptionData[] => filterOptionsBySearch(options, searchText),
		[options, searchText, filterOptionsBySearch],
	);

	// ===== Event Handlers =====

	/**
	 * Handles search input changes
	 */
	const handleSearch = useCallback(
		(value: string): void => {
			const trimmedValue = value.trim();
			setSearchText(trimmedValue);

			// Ensure dropdown opens when typing
			if (!isOpen) {
				setIsOpen(true);
			}

			if (onSearch) onSearch(trimmedValue);
		},
		[onSearch, isOpen],
	);

	// ===== UI & Rendering Functions =====

	/**
	 * Highlights matched text in search results
	 */
	const highlightMatchedText = useCallback(
		(text: string, searchQuery: string): React.ReactNode => {
			if (!searchQuery || !highlightSearch) return text;

			const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
			return (
				<>
					{parts.map((part, i) => {
						// Create a unique key that doesn't rely on array index
						const uniqueKey = `${text.substring(0, 3)}-${part.substring(0, 3)}-${i}`;

						return part.toLowerCase() === searchQuery.toLowerCase() ? (
							<span key={uniqueKey} className="highlight-text">
								{part}
							</span>
						) : (
							part
						);
					})}
				</>
			);
		},
		[highlightSearch],
	);

	/**
	 * Renders an individual option
	 */
	const renderOptionItem = useCallback(
		(
			option: OptionData,
			isSelected: boolean,
			index?: number,
		): React.ReactElement => {
			const isActive = index === activeIndex;
			const optionId = `option-${index}`;

			const handleItemSelection = (): void => {
				// Special handling for ALL option is done by the caller

				if (!option.value) return;

				const newValues = selectedValues.includes(option.value)
					? selectedValues.filter((v) => v !== option.value)
					: [...selectedValues, option.value];

				if (onChange) {
					onChange(newValues as any, newValues as any);
				}
			};

			return (
				<div
					key={option.value || `option-${index}`}
					id={optionId}
					ref={(el): void => {
						if (index !== undefined) {
							optionRefs.current[index] = el;
						}
					}}
					className={cx('option-item', {
						selected: isSelected,
						active: isActive,
					})}
					onClick={(e): void => {
						e.stopPropagation();
						e.preventDefault();
						handleItemSelection();
					}}
					onKeyDown={(e): void => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.stopPropagation();
							e.preventDefault();
							handleItemSelection();
						}
					}}
					onMouseEnter={(): void => {
						setActiveIndex(index || -1);
						setActiveChipIndex(-1); // Clear chip selection when hovering over options
					}}
					role="option"
					aria-selected={isSelected}
					aria-disabled={option.disabled}
					tabIndex={isActive ? 0 : -1}
				>
					<Checkbox checked={isSelected}>
						<div className="option-content">
							<div>{highlightMatchedText(String(option.label || ''), searchText)}</div>
							{option.type === 'custom' && <div className="option-badge">Custom</div>}
						</div>
					</Checkbox>
				</div>
			);
		},
		[highlightMatchedText, searchText, onChange, activeIndex, selectedValues],
	);

	/**
	 * Helper function to render option with index tracking
	 */
	const renderOptionWithIndex = useCallback(
		(option: OptionData, isSelected: boolean, idx: number) =>
			renderOptionItem(option, isSelected, idx),
		[renderOptionItem],
	);

	// Handle select all functionality
	const handleSelectAll = useCallback((): void => {
		if (!options) return;

		// Use getAllValues to get all values from all options
		const allOptionValues = getAllValues(options);

		// If all options are already selected, deselect all
		const allOptionsSelected =
			allOptionValues.length > 0 &&
			allOptionValues.every((val) => selectedValues.includes(val));

		if (allOptionsSelected) {
			if (onChange) {
				onChange([] as any, [] as any);
			}
		} else if (onChange) {
			// Select all options across sections and non-sections
			onChange(allOptionValues as any, allOptionValues as any);
		}
	}, [options, selectedValues, onChange, getAllValues]);

	// Use allowSelectAll as a fallback for enableAllSelection for backward compatibility
	const shouldEnableAllSelection = enableAllSelection ?? allowSelectAll;

	// Modify keyboard navigation to handle dropdown navigation and chip selection
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLElement>): void => {
			// Get flattened list of all selectable options
			const getFlatOptions = (): OptionData[] => {
				if (!filteredOptions) return [];

				const flatList: OptionData[] = [];
				const allOptionValues = getAllValues(options);
				const hasAll =
					shouldEnableAllSelection && !searchText && allOptionValues.length > 0;

				// Process options
				const { sectionOptions, nonSectionOptions } = splitOptions(filteredOptions);

				// Add all options to flat list
				if (hasAll) {
					flatList.push({
						label: 'ALL',
						value: '__all__', // Special value for the ALL option
						type: 'defined',
					});
				}

				flatList.push(...nonSectionOptions);
				sectionOptions.forEach((section) => {
					if (section.options) {
						flatList.push(...section.options);
					}
				});

				return flatList;
			};

			const flatOptions = getFlatOptions();

			// Get the active input element to check cursor position
			const activeElement = document.activeElement as HTMLInputElement;
			const isInputActive = activeElement?.tagName === 'INPUT';
			const cursorAtStart = isInputActive && activeElement?.selectionStart === 0;
			const hasInputText = isInputActive && !!activeElement?.value;

			// Handle up/down keys to open dropdown from input
			if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isOpen) {
				e.stopPropagation();
				e.preventDefault();
				setIsOpen(true);
				setActiveIndex(0);
				setActiveChipIndex(-1);
				return;
			}

			// Handle chip navigation when active
			if (activeChipIndex >= 0 && selectedValues.length > 0) {
				// Prepare variables for potential use in multiple case blocks
				let newValues: string[] = [];

				switch (e.key) {
					case 'ArrowLeft':
						e.stopPropagation();
						e.preventDefault();
						setActiveChipIndex((prev) =>
							prev <= 0 ? selectedValues.length - 1 : prev - 1,
						);
						break;
					case 'ArrowRight':
						e.stopPropagation();
						e.preventDefault();
						if (activeChipIndex >= selectedValues.length - 1) {
							// Move from last chip to input
							setActiveChipIndex(-1);
							if (selectRef.current) {
								selectRef.current.focus();
							}
						} else {
							setActiveChipIndex((prev) => prev + 1);
						}
						break;
					case 'Backspace':
					case 'Delete':
						// Remove the active chip
						e.stopPropagation();
						e.preventDefault();
						newValues = selectedValues.filter(
							(_, index) => index !== activeChipIndex,
						);
						if (onChange) {
							onChange(newValues as any, newValues as any);
						}
						// If we deleted the last chip, move focus to previous
						if (activeChipIndex >= newValues.length) {
							setActiveChipIndex(newValues.length > 0 ? newValues.length - 1 : -1);
						}
						break;
					case 'Escape':
						// Clear chip selection
						setActiveChipIndex(-1);
						break;
					case 'ArrowDown':
					case 'ArrowUp':
						// Switch from chip to dropdown navigation
						if (isOpen) {
							setActiveChipIndex(-1);
							setActiveIndex(0);
						} else {
							setIsOpen(true);
							setActiveChipIndex(-1);
							setActiveIndex(0);
						}
						break;
					default:
						// If user types a letter when chip is active, focus the input field
						if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
							e.stopPropagation();
							e.preventDefault();
							setActiveChipIndex(-1);
							// Try to focus on the input field
							if (selectRef.current) {
								// Focus select which will in turn focus the input
								selectRef.current.focus();
							}
						}
						break;
				}
				return; // Early return when navigating chips
			}

			// Handle dropdown navigation when open
			if (isOpen) {
				switch (e.key) {
					case 'ArrowDown':
						e.stopPropagation();
						e.preventDefault();
						setActiveIndex((prev) => (prev < flatOptions.length - 1 ? prev + 1 : 0));
						setActiveChipIndex(-1); // Clear chip selection when navigating dropdown
						break;

					case 'ArrowUp':
						e.stopPropagation();
						e.preventDefault();
						setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatOptions.length - 1));
						setActiveChipIndex(-1); // Clear chip selection when navigating dropdown
						break;

					case 'Tab':
						// Tab navigation with Shift key support
						if (e.shiftKey) {
							e.stopPropagation();
							e.preventDefault();
							setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatOptions.length - 1));
						} else {
							e.stopPropagation();
							e.preventDefault();
							setActiveIndex((prev) => (prev < flatOptions.length - 1 ? prev + 1 : 0));
						}
						setActiveChipIndex(-1); // Clear chip selection when navigating dropdown
						break;

					case 'Enter':
						e.stopPropagation();
						e.preventDefault();
						if (activeIndex >= 0 && activeIndex < flatOptions.length) {
							// Select the focused option but keep dropdown open
							const selectedOption = flatOptions[activeIndex];

							// Check if it's the ALL option
							if (selectedOption.value === '__all__') {
								handleSelectAll();
							} else if (selectedOption.value && onChange) {
								const newValues = selectedValues.includes(selectedOption.value)
									? selectedValues.filter((v) => v !== selectedOption.value)
									: [...selectedValues, selectedOption.value];

								onChange(newValues as any, newValues as any);
							}
							// Don't close dropdown, just update selection
						}
						break;

					case 'Escape':
						e.stopPropagation();
						e.preventDefault();
						setIsOpen(false);
						setActiveIndex(-1);
						break;

					case ' ': // Space key
						if (activeIndex >= 0 && activeIndex < flatOptions.length) {
							e.stopPropagation();
							e.preventDefault();
							const selectedOption = flatOptions[activeIndex];

							// Check if it's the ALL option
							if (selectedOption.value === '__all__') {
								handleSelectAll();
							} else if (selectedOption.value && onChange) {
								const newValues = selectedValues.includes(selectedOption.value)
									? selectedValues.filter((v) => v !== selectedOption.value)
									: [...selectedValues, selectedOption.value];

								onChange(newValues as any, newValues as any);
							}
							// Don't close dropdown, just update selection
						}
						break;

					case 'ArrowLeft':
						// If at start of input, move to chips
						if (cursorAtStart && selectedValues.length > 0 && !hasInputText) {
							e.stopPropagation();
							e.preventDefault();
							setActiveChipIndex(selectedValues.length - 1);
							setActiveIndex(-1);
						}
						break;

					case 'ArrowRight':
						// No special handling needed for right arrow in dropdown
						break;

					default:
						break;
				}
			} else {
				// Handle keyboard events when dropdown is closed
				switch (e.key) {
					case 'ArrowDown':
					case 'ArrowUp':
						// Open dropdown when Down is pressed while closed
						e.stopPropagation();
						e.preventDefault();
						setIsOpen(true);
						setActiveIndex(0);
						setActiveChipIndex(-1);
						break;

					case 'ArrowLeft':
						// Start chip navigation if at start of input and no text or empty input
						if ((cursorAtStart || !hasInputText) && selectedValues.length > 0) {
							e.stopPropagation();
							e.preventDefault();
							setActiveChipIndex(selectedValues.length - 1);
							setActiveIndex(-1);
						}
						break;

					case 'ArrowRight':
						// No special handling needed for right arrow when dropdown is closed
						break;

					case 'Tab':
						// When dropdown is closed and Tab is pressed, we should not capture it
						// Let the browser handle the tab navigation
						break;

					case 'Backspace':
						// If at start of input and no text, select last chip
						if (cursorAtStart && !hasInputText && selectedValues.length > 0) {
							e.stopPropagation();
							e.preventDefault();
							setActiveChipIndex(selectedValues.length - 1);
							setActiveIndex(-1);
						}
						break;

					case 'Escape':
						// Clear focus when dropdown is closed
						setActiveChipIndex(-1);
						setActiveIndex(-1);
						break;

					default:
						break;
				}
			}
		},
		[
			isOpen,
			activeIndex,
			activeChipIndex,
			filteredOptions,
			onChange,
			selectedValues,
			splitOptions,
			getAllValues,
			searchText,
			shouldEnableAllSelection,
			handleSelectAll,
			options,
		],
	);

	// Handle dropdown clicks
	const handleDropdownClick = useCallback((e: React.MouseEvent): void => {
		e.stopPropagation();
	}, []);

	// Render a section with the given label and options
	const renderSection = useCallback(
		(
			section: OptionData,
			mapFn: (options: OptionData[]) => React.ReactNode,
		): React.ReactElement | null => {
			if (isEmpty(section.options)) return null;

			return (
				<div className="select-group" key={section.label}>
					<div className="group-label" role="heading" aria-level={2}>
						{section.label}
					</div>
					<div
						className="scrollable-group"
						role="group"
						aria-label={`${section.label} options`}
					>
						{section.options && mapFn(section.options)}
					</div>
				</div>
			);
		},
		[],
	);

	// Custom dropdown render with sections support
	const customDropdownRender = useCallback((): React.ReactElement => {
		// Process options based on current search
		const processedOptions = filteredOptions;

		const { sectionOptions, nonSectionOptions } = splitOptions(processedOptions);

		// Check if we need to add a custom option based on search text
		const isSearchTextNotPresent =
			!isEmpty(searchText) && !isLabelPresent(processedOptions, searchText);

		const allOptionValues = getAllValues(options);
		const allOptionsSelected =
			allOptionValues.length > 0 &&
			allOptionValues.every((val) => selectedValues.includes(val));

		// Determine if ALL option should be shown
		const showAllOption =
			shouldEnableAllSelection && !searchText && allOptionValues.length > 0;

		// Initialize optionIndex based on whether the ALL option is shown
		// If ALL option is shown, it gets index 0, and other options start at index 1
		let optionIndex = showAllOption ? 1 : 0;

		// Helper function to map options with index tracking
		const mapOptions = (options: OptionData[]): React.ReactNode =>
			options.map((option) => {
				const optionValue = option.value || '';
				const result = renderOptionWithIndex(
					option,
					selectedValues.includes(optionValue),
					optionIndex,
				);
				optionIndex += 1;
				return result;
			});

		const hasOptions = nonSectionOptions.length > 0 || sectionOptions.length > 0;

		let footerMessage = 'to Navigate';

		if (loading) {
			footerMessage = 'We are updating the values...';
		} else if (customStatusText) {
			footerMessage = customStatusText;
		} else if (noDataMessage && !hasOptions) {
			footerMessage = noDataMessage;
		}

		const customMenu = (
			<div
				ref={dropdownRef}
				className="custom-multiselect-dropdown"
				onClick={handleDropdownClick}
				onKeyDown={handleKeyDown}
				role="listbox"
				aria-multiselectable="true"
				tabIndex={-1}
			>
				{/* ALL checkbox only when search is empty */}
				{showAllOption && (
					<>
						<div
							className={cx('option-item all-option', {
								selected: allOptionsSelected,
								active: activeIndex === 0,
							})}
							key={`all-option-${allOptionsSelected}`}
							id="option-0"
							onClick={(e): void => {
								e.stopPropagation();
								handleSelectAll();
							}}
							onKeyDown={(e): void => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.stopPropagation();
									e.preventDefault();
									handleSelectAll();
								}
							}}
							onMouseEnter={(): void => {
								setActiveIndex(0);
								setActiveChipIndex(-1); // Clear chip selection when hovering ALL option
							}}
							role="option"
							aria-selected={allOptionsSelected}
							tabIndex={0}
							ref={(el): void => {
								optionRefs.current[0] = el;
							}}
						>
							<Checkbox checked={allOptionsSelected}>
								<div className="option-content">
									<div>ALL</div>
								</div>
							</Checkbox>
						</div>
						<div className="divider" />
					</>
				)}

				{/* Add custom value option when search has content */}
				{showAddCustomValue && searchText && isSearchTextNotPresent && (
					<div
						className="custom-value-option"
						onClick={(e): void => {
							e.stopPropagation();
							e.preventDefault();
							// Add custom value functionality
							if (!searchText || selectedValues.includes(searchText)) return;

							const newValues = [...selectedValues, searchText];
							if (onChange) {
								onChange(newValues as any, newValues as any);
							}
							setSearchText('');
						}}
						onKeyDown={(e): void => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.stopPropagation();
								e.preventDefault();
								if (!searchText || selectedValues.includes(searchText)) return;

								const newValues = [...selectedValues, searchText];
								if (onChange) {
									onChange(newValues as any, newValues as any);
								}
								setSearchText('');
							}
						}}
						role="option"
						aria-selected={selectedValues.includes(searchText)}
						tabIndex={0}
					>
						<Checkbox checked={selectedValues.includes(searchText)}>
							Add &ldquo;{searchText}&rdquo;
						</Checkbox>
					</div>
				)}

				{/* Non-section options when not searching */}
				{nonSectionOptions.length > 0 && (
					<div className="no-section-options">{mapOptions(nonSectionOptions)}</div>
				)}

				{/* Section options when not searching */}
				{sectionOptions.length > 0 &&
					sectionOptions.map((section) => renderSection(section, mapOptions))}

				{/* {loading && (
					<div className="loading-container">
						<Spin size="small" />
					</div>
				)} */}

				{/* Navigation footer */}
				<div className="navigation-footer" role="note">
					{!loading && !customStatusText && hasOptions && (
						<div className="navigation-icons">
							<ChevronUp size={16} />
							<ChevronDown size={16} />
						</div>
					)}
					<div className="navigation-text">{footerMessage}</div>
				</div>
			</div>
		);

		return dropdownRender ? dropdownRender(customMenu) : customMenu;
	}, [
		filteredOptions,
		splitOptions,
		searchText,
		isLabelPresent,
		getAllValues,
		options,
		shouldEnableAllSelection,
		loading,
		customStatusText,
		noDataMessage,
		handleDropdownClick,
		handleKeyDown,
		activeIndex,
		showAddCustomValue,
		selectedValues,
		dropdownRender,
		renderOptionWithIndex,
		handleSelectAll,
		onChange,
		renderSection,
	]);

	// ===== Side Effects =====

	// Clear search when dropdown closes
	useEffect(() => {
		if (!isOpen) {
			setSearchText('');
			setActiveIndex(-1);
			// Don't clear activeChipIndex when dropdown closes to maintain tag focus
		} else {
			// When opening dropdown, clear chip selection
			setActiveChipIndex(-1);
		}
	}, [isOpen]);

	// Auto-scroll active option into view
	useEffect(() => {
		if (isOpen && activeIndex >= 0 && optionRefs.current[activeIndex]) {
			optionRefs.current[activeIndex]?.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
			});
		}
	}, [isOpen, activeIndex]);

	// ===== Final Processing =====

	// Function to handle tag focus visually - we'll create a custom tagRender
	const tagRender = useCallback(
		(props: CustomTagProps): React.ReactElement => {
			const { label, value, closable, onClose } = props;
			const index = selectedValues.indexOf(value);
			const isActive = index === activeChipIndex;

			const handleTagKeyDown = (e: React.KeyboardEvent): void => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.stopPropagation();
					e.preventDefault();
					onClose();
				}
			};

			return (
				<div
					className={cx('ant-select-selection-item', {
						'ant-select-selection-item-active': isActive,
					})}
					style={
						isActive
							? { borderColor: '#40a9ff', backgroundColor: '#e6f7ff' }
							: undefined
					}
				>
					<span className="ant-select-selection-item-content">{label}</span>
					{closable && (
						<span
							className="ant-select-selection-item-remove"
							onClick={onClose}
							onKeyDown={handleTagKeyDown}
							role="button"
							tabIndex={0}
							aria-label="Remove tag"
						>
							×
						</span>
					)}
				</div>
			);
		},
		[selectedValues, activeChipIndex],
	);

	// Apply highlight to matched text in options
	const optionsWithHighlight = useMemo(
		() =>
			options
				?.filter((option) =>
					String(option.label || '')
						.toLowerCase()
						.includes(searchText.toLowerCase()),
				)
				?.map((option) => ({
					...option,
					label: highlightMatchedText(String(option.label || ''), searchText),
				})),
		[options, searchText, highlightMatchedText],
	);

	// ===== Component Rendering =====
	return (
		<Select
			ref={selectRef}
			className={cx('custom-multiselect', className)}
			placeholder={placeholder}
			mode="multiple"
			showSearch
			filterOption={false}
			onSearch={handleSearch}
			value={selectedValues}
			onChange={onChange}
			onDropdownVisibleChange={setIsOpen}
			open={isOpen}
			options={optionsWithHighlight}
			defaultActiveFirstOption={defaultActiveFirstOption}
			popupMatchSelectWidth={dropdownMatchSelectWidth}
			allowClear
			getPopupContainer={getPopupContainer ?? popupContainer}
			suffixIcon={<SearchOutlined />}
			dropdownRender={customDropdownRender}
			menuItemSelectedIcon={null}
			popupClassName={cx('custom-multiselect-dropdown-container', popupClassName)}
			notFoundContent={<div className="empty-message">{noDataMessage}</div>}
			tokenSeparators={[',']}
			onKeyDown={handleKeyDown}
			tagRender={tagRender as any}
			placement={placement}
			listHeight={300}
			{...rest}
		/>
	);
};

CustomMultiSelect.defaultProps = {
	placeholder: 'Search...',
	className: '',
	loading: false,
	onSearch: undefined,
	options: [],
	defaultActiveFirstOption: true,
	dropdownMatchSelectWidth: true,
	noDataMessage: '',
	onClear: undefined,
	allowSelectAll: true,
	enableAllSelection: undefined, // Falls back to allowSelectAll
	showAddCustomValue: true,
	getPopupContainer: undefined,
	dropdownRender: undefined,
	highlightSearch: true,
	customStatusText: undefined,
	popupClassName: undefined,
	placement: 'bottomLeft',
};

export default CustomMultiSelect;
