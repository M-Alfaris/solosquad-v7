import { useState, useMemo } from "react";
import { Search, Filter, X, Tag, Calendar, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export interface SearchFilter {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'tag' | 'date' | 'user';
}

export interface EnhancedSearchProps {
  placeholder?: string;
  onSearch: (query: string, filters: SearchFilter[]) => void;
  availableFilters?: {
    tags?: string[];
    users?: string[];
    dateRanges?: { label: string; value: string }[];
  };
  value?: string;
  className?: string;
}

export const EnhancedSearch = ({
  placeholder = "Search...",
  onSearch,
  availableFilters = {},
  value = "",
  className = "",
}: EnhancedSearchProps) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query, activeFilters);
  };

  const addFilter = (filter: SearchFilter) => {
    const exists = activeFilters.find(f => f.id === filter.id);
    if (!exists) {
      const newFilters = [...activeFilters, filter];
      setActiveFilters(newFilters);
      onSearch(searchQuery, newFilters);
    }
  };

  const removeFilter = (filterId: string) => {
    const newFilters = activeFilters.filter(f => f.id !== filterId);
    setActiveFilters(newFilters);
    onSearch(searchQuery, newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchQuery("");
    onSearch("", []);
  };

  const filterOptions = useMemo(() => {
    const options = [];

    if (availableFilters.tags?.length) {
      options.push({
        label: "Tags",
        icon: Tag,
        items: availableFilters.tags.map(tag => ({
          id: `tag-${tag}`,
          label: tag,
          value: tag,
          type: 'tag' as const,
        }))
      });
    }

    if (availableFilters.users?.length) {
      options.push({
        label: "Users",
        icon: User,
        items: availableFilters.users.map(user => ({
          id: `user-${user}`,
          label: user,
          value: user,
          type: 'user' as const,
        }))
      });
    }

    if (availableFilters.dateRanges?.length) {
      options.push({
        label: "Date Range",
        icon: Calendar,
        items: availableFilters.dateRanges.map(range => ({
          id: `date-${range.value}`,
          label: range.label,
          value: range.value,
          type: 'date' as const,
        }))
      });
    }

    return options;
  }, [availableFilters]);

  const hasFilters = activeFilters.length > 0 || searchQuery.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input with Filters */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>

        {/* Filter Button */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`relative ${activeFilters.length > 0 ? 'border-primary' : ''}`}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {activeFilters.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Search Filters</h4>
                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs h-6 px-2"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {filterOptions.map((section, sectionIndex) => (
                  <div key={section.label}>
                    <div className="flex items-center gap-2 mb-2">
                      <section.icon className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">{section.label}</Label>
                    </div>
                    
                    <div className="space-y-2 ml-6">
                      {section.items.map((item) => {
                        const isActive = activeFilters.some(f => f.id === item.id);
                        return (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={item.id}
                              checked={isActive}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  addFilter(item);
                                } else {
                                  removeFilter(item.id);
                                }
                              }}
                            />
                            <Label htmlFor={item.id} className="text-sm font-normal flex-1">
                              {item.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                    
                    {sectionIndex < filterOptions.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}

                {filterOptions.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No filter options available
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-xs">{filter.label}</span>
              <button
                onClick={() => removeFilter(filter.id)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};