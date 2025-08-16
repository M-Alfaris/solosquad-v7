import { BarChart3, TrendingUp, PieChart, Database, Wifi, Activity, FileX, Calendar, RefreshCw } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface AnalyticsEmptyStatesProps {
  onRefresh?: () => void;
  onConnect?: () => void;
  onSelectDateRange?: () => void;
}

export function NoDataEmptyState({ onConnect, onRefresh }: AnalyticsEmptyStatesProps) {
  return (
    <EmptyState
      icon={Database}
      title="No Data Available"
      description="Connect your Facebook account or sync your data to start seeing analytics insights."
      action={onConnect ? { label: "Connect Facebook", onClick: onConnect } : undefined}
      variant="card"
    />
  );
}

export function NoActivityEmptyState({ onSelectDateRange }: AnalyticsEmptyStatesProps) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No Activity in Selected Period"
      description="There's no activity data for the selected date range. Try expanding your date range or check back later."
      action={onSelectDateRange ? { label: "Change Date Range", onClick: onSelectDateRange } : undefined}
      variant="minimal"
    />
  );
}

export function NoChartsDataEmptyState() {
  return (
    <EmptyState
      icon={BarChart3}
      title="No Chart Data"
      description="Not enough data to generate meaningful charts. Charts will appear once you have sufficient activity."
      variant="minimal"
    />
  );
}

export function NoPlatformDataEmptyState() {
  return (
    <EmptyState
      icon={PieChart}
      title="No Platform Data"
      description="Platform distribution will appear once you have posts from connected social media accounts."
      variant="minimal"
    />
  );
}

export function NoLogsEmptyState({ onRefresh }: AnalyticsEmptyStatesProps) {
  return (
    <EmptyState
      icon={FileX}
      title="No Recent Logs"
      description="No system activity logs found. This usually means your system is running smoothly!"
      action={onRefresh ? { label: "Refresh Logs", onClick: onRefresh } : undefined}
      variant="minimal"
    />
  );
}

export function ConnectionErrorEmptyState({ onRefresh }: AnalyticsEmptyStatesProps) {
  return (
    <EmptyState
      icon={Wifi}
      title="Connection Error"
      description="Unable to fetch analytics data. Please check your connection and try again."
      action={onRefresh ? { label: "Try Again", onClick: onRefresh } : undefined}
      variant="card"
    />
  );
}

export function SystemHealthEmptyState({ onRefresh }: AnalyticsEmptyStatesProps) {
  return (
    <EmptyState
      icon={Activity}
      title="Health Check Unavailable"
      description="Unable to retrieve system health status. This might be temporary."
      action={onRefresh ? { label: "Retry Health Check", onClick: onRefresh } : undefined}
      variant="minimal"
    />
  );
}

export function NoMetricsEmptyState({ onRefresh }: AnalyticsEmptyStatesProps) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No Metrics Available"
      description="Metrics will appear once your Facebook integration is active and data is being processed."
      action={onRefresh ? { label: "Refresh Metrics", onClick: onRefresh } : undefined}
      variant="card"
    />
  );
}