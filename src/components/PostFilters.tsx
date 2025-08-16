import { Search, Filter, Calendar, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface PostFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  platformFilter: 'all' | 'facebook' | 'instagram';
  onPlatformChange: (platform: 'all' | 'facebook' | 'instagram') => void;
  sortBy: 'newest' | 'oldest' | 'most_comments' | 'most_ai_replies';
  onSortChange: (sort: 'newest' | 'oldest' | 'most_comments' | 'most_ai_replies') => void;
  mediaFilter: 'all' | 'media_only' | 'text_only';
  onMediaFilterChange: (filter: 'all' | 'media_only' | 'text_only') => void;
  dateRange: { from: Date | null; to: Date | null };
  onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
  onClearFilters: () => void;
}

const PostFilters = ({
  searchQuery,
  onSearchChange,
  platformFilter,
  onPlatformChange,
  sortBy,
  onSortChange,
  mediaFilter,
  onMediaFilterChange,
  dateRange,
  onDateRangeChange,
  onClearFilters
}: PostFiltersProps) => {
  const hasActiveFilters = 
    searchQuery !== "" || 
    platformFilter !== 'all' || 
    sortBy !== 'newest' || 
    mediaFilter !== 'all' ||
    dateRange.from || 
    dateRange.to;

  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Platform Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Platform</Label>
          <Select value={platformFilter} onValueChange={onPlatformChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sort By</Label>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="most_comments">Most Comments</SelectItem>
              <SelectItem value="most_ai_replies">Most AI Replies</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Media Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Content Type</Label>
          <Select value={mediaFilter} onValueChange={onMediaFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Content" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Content</SelectItem>
              <SelectItem value="media_only">With Media</SelectItem>
              <SelectItem value="text_only">Text Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange.from || undefined}
                selected={{
                  from: dateRange.from || undefined,
                  to: dateRange.to || undefined,
                }}
                onSelect={(range) => 
                  onDateRangeChange({
                    from: range?.from || null,
                    to: range?.to || null,
                  })
                }
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear Filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium invisible">Actions</Label>
          <Button 
            variant="outline" 
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
            className="w-full"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>
            Filters active: {searchQuery && "Search"} 
            {platformFilter !== 'all' && ` Platform(${platformFilter})`}
            {sortBy !== 'newest' && ` Sort(${sortBy})`}
            {mediaFilter !== 'all' && ` Media(${mediaFilter})`}
            {(dateRange.from || dateRange.to) && " Date Range"}
          </span>
        </div>
      )}
    </div>
  );
};

export default PostFilters;