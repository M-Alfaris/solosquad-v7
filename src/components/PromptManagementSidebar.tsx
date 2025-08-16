import { User, Bot, Search, Settings, Cloud } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface PromptManagementSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sidebarItems = [
  { id: "personal", title: "Personal", icon: User },
  { id: "prompts", title: "Prompts", icon: Bot },
  { id: "tools", title: "Tools", icon: Search },
  { id: "triggers", title: "Triggers", icon: Settings },
  { id: "files", title: "Files", icon: Cloud },
];

export function PromptManagementSidebar({ activeSection, onSectionChange }: PromptManagementSidebarProps) {
  return (
    <Sidebar className="w-60 pt-16">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => onSectionChange(item.id)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}