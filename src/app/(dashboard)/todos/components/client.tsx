"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { columns, TodoColumn } from "./columns";

interface TodoClientProps {
  data: TodoColumn[];
}

export const TodoClient: React.FC<TodoClientProps> = ({ data }) => {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const staffOptions = useMemo(
    () =>
      Array.from(
        new Set(data.map((t) => t.assignedToStaffName).filter(Boolean))
      ) as string[],
    [data]
  );

  const filteredData = useMemo(
    () =>
      data.filter((todo) => {
        if (statusFilter === "active") {
          if (todo.status === "DONE") return false;
        } else if (statusFilter !== "all" && todo.status !== statusFilter) {
          return false;
        }
        if (priorityFilter !== "all" && todo.priority !== priorityFilter) return false;
        if (assignedToFilter === "unassigned" && todo.assignedToStaffName !== null) return false;
        if (
          assignedToFilter !== "all" &&
          assignedToFilter !== "unassigned" &&
          todo.assignedToStaffName !== assignedToFilter
        )
          return false;
        if (dueDateFrom && todo.dueDate && todo.dueDate < new Date(dueDateFrom).toISOString())
          return false;
        if (
          dueDateTo &&
          todo.dueDate &&
          todo.dueDate > new Date(dueDateTo + "T23:59:59").toISOString()
        )
          return false;
        if (overdueOnly && !todo.isOverdue) return false;
        return true;
      }),
    [data, statusFilter, priorityFilter, assignedToFilter, dueDateFrom, dueDateTo, overdueOnly]
  );

  const activeFilterCount = [
    statusFilter !== "active",
    priorityFilter !== "all",
    assignedToFilter !== "all",
    !!dueDateFrom,
    !!dueDateTo,
    overdueOnly,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setStatusFilter("active");
    setPriorityFilter("all");
    setAssignedToFilter("all");
    setDueDateFrom("");
    setDueDateTo("");
    setOverdueOnly(false);
  };

  const headingTitle =
    statusFilter !== "all" || activeFilterCount > 0
      ? `Todos (${filteredData.length} / ${data.length})`
      : `Todos (${data.length})`;

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={headingTitle} description="Manage your personal task list" />
        <Button onClick={() => router.push("/todos/new")}>
          <Plus className="mr-2 h-4 w-4" /> Add Todo
        </Button>
      </div>
      <Separator />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 py-2">
        {/* Status */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-[140px] text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Assigned To */}
        <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
          <SelectTrigger className="h-8 w-[160px] text-sm">
            <SelectValue placeholder="Assigned To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {staffOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Due Date From */}
        <Input
          type="date"
          value={dueDateFrom}
          onChange={(e) => setDueDateFrom(e.target.value)}
          className="h-8 w-[150px] text-sm"
          placeholder="Due from"
          title="Due date from"
        />

        {/* Due Date To */}
        <Input
          type="date"
          value={dueDateTo}
          onChange={(e) => setDueDateTo(e.target.value)}
          className="h-8 w-[150px] text-sm"
          placeholder="Due to"
          title="Due date to"
        />

        {/* Overdue toggle */}
        <Button
          variant={overdueOnly ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setOverdueOnly((v) => !v)}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Overdue only
        </Button>

        {/* Reset */}
        {activeFilterCount > 0 && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={resetFilters}>
            <X className="h-3.5 w-3.5" />
            Reset
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      <DataTable searchKey="title" columns={columns} data={filteredData} />
    </>
  );
};
