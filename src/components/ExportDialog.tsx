import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface ExportOptions {
  format: 'csv' | 'json';
  includeComments: boolean;
  includeMetadata: boolean;
  dateRange: 'all' | 'last_30_days' | 'last_90_days' | 'custom';
}

interface ExportDialogProps {
  data: any[];
  filename?: string;
  children?: React.ReactNode;
}

export const ExportDialog = ({ data, filename = 'export', children }: ExportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    includeComments: true,
    includeMetadata: true,
    dateRange: 'all'
  });

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Filter data based on date range
      let filteredData = [...data];
      
      if (options.dateRange !== 'all') {
        const now = new Date();
        const daysBack = options.dateRange === 'last_30_days' ? 30 : 90;
        const cutoffDate = new Date(now.setDate(now.getDate() - daysBack));
        
        filteredData = data.filter(item => 
          new Date(item.created_at) >= cutoffDate
        );
      }

      // Process data based on options
      const processedData = filteredData.map(item => {
        const processed: any = {
          id: item.id,
          content: item.content,
          created_at: item.created_at,
          platform: item.platform || 'unknown'
        };

        if (options.includeComments && item.comments) {
          processed.total_comments = item.comments.length;
          processed.ai_comments = item.comments.filter((c: any) => c.role === 'ai_agent').length;
          processed.user_comments = item.comments.filter((c: any) => c.role === 'user').length;
        }

        if (options.includeMetadata) {
          processed.updated_at = item.updated_at;
          processed.media_url = item.media_url || 'none';
        }

        return processed;
      });

      // Generate file content
      let fileContent: string;
      let mimeType: string;
      let fileExtension: string;

      if (options.format === 'csv') {
        fileContent = generateCSV(processedData);
        mimeType = 'text/csv';
        fileExtension = 'csv';
      } else {
        fileContent = JSON.stringify(processedData, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
      }

      // Download file
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${processedData.length} items`);
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') ? `"${escaped}"` : escaped;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select
              value={options.format}
              onValueChange={(value: 'csv' | 'json') => 
                setOptions(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Spreadsheet)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    JSON (Data)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select
              value={options.dateRange}
              onValueChange={(value: 'all' | 'last_30_days' | 'last_90_days') => 
                setOptions(prev => ({ ...prev, dateRange: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Include</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="comments"
                checked={options.includeComments}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeComments: !!checked }))
                }
              />
              <Label htmlFor="comments" className="text-sm font-normal">
                Comment statistics
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={options.includeMetadata}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeMetadata: !!checked }))
                }
              />
              <Label htmlFor="metadata" className="text-sm font-normal">
                Additional metadata
              </Label>
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-muted p-3 rounded-lg text-sm">
            <div className="flex justify-between">
              <span>Items to export:</span>
              <span className="font-medium">{data.length}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};