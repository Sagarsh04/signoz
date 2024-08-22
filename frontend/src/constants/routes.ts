const ROUTES = {
	SIGN_UP: '/signup',
	LOGIN: '/login',
	SERVICE_METRICS: '/services/:servicename',
	SERVICE_TOP_LEVEL_OPERATIONS: '/services/:servicename/top-level-operations',
	SERVICE_MAP: '/service-map',
	TRACE: '/trace',
	TRACE_DETAIL: '/trace/:id',
	TRACES_EXPLORER: '/traces-explorer',
	GET_STARTED: '/get-started',
	GET_STARTED_APPLICATION_MONITORING: '/get-started/application-monitoring',
	GET_STARTED_LOGS_MANAGEMENT: '/get-started/logs-management',
	GET_STARTED_INFRASTRUCTURE_MONITORING:
		'/get-started/infrastructure-monitoring',
	GET_STARTED_AWS_MONITORING: '/get-started/aws-monitoring',
	GET_STARTED_AZURE_MONITORING: '/get-started/azure-monitoring',
	USAGE_EXPLORER: '/usage-explorer',
	APPLICATION: '/services',
	ALL_DASHBOARD: '/dashboard',
	DASHBOARD: '/dashboard/:dashboardId',
	DASHBOARD_WIDGET: '/dashboard/:dashboardId/:widgetId',
	EDIT_ALERTS: '/alerts/edit',
	LIST_ALL_ALERT: '/alerts',
	ALERTS_NEW: '/alerts/new',
	ALERT_HISTORY: '/alerts/history',
	ALERT_OVERVIEW: '/alerts/overview',
	ALL_CHANNELS: '/settings/channels',
	CHANNELS_NEW: '/settings/channels/new',
	CHANNELS_EDIT: '/settings/channels/:id',
	ALL_ERROR: '/exceptions',
	ERROR_DETAIL: '/error-detail',
	VERSION: '/status',
	MY_SETTINGS: '/my-settings',
	SETTINGS: '/settings',
	ORG_SETTINGS: '/settings/org-settings',
	API_KEYS: '/settings/access-tokens',
	INGESTION_SETTINGS: '/settings/ingestion-settings',
	SOMETHING_WENT_WRONG: '/something-went-wrong',
	UN_AUTHORIZED: '/un-authorized',
	NOT_FOUND: '/not-found',
	LOGS_BASE: '/logs',
	LOGS: '/logs/logs-explorer',
	OLD_LOGS_EXPLORER: '/logs/old-logs-explorer',
	LOGS_EXPLORER: '/logs/logs-explorer',
	LIVE_LOGS: '/logs/logs-explorer/live',
	LOGS_PIPELINES: '/logs/pipelines',
	HOME_PAGE: '/',
	PASSWORD_RESET: '/password-reset',
	LIST_LICENSES: '/licenses',
	LOGS_INDEX_FIELDS: '/logs-explorer/index-fields',
	TRACE_EXPLORER: '/trace-explorer',
	BILLING: '/billing',
	SUPPORT: '/support',
	LOGS_SAVE_VIEWS: '/logs/saved-views',
	TRACES_SAVE_VIEWS: '/traces/saved-views',
	WORKSPACE_LOCKED: '/workspace-locked',
	SHORTCUTS: '/shortcuts',
	INTEGRATIONS: '/integrations',
} as const;

export default ROUTES;
