import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pagination } from "../components/common/Pagination";
import { PageSpinner } from "../components/common/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "../components/common/Table";
import { systemLogService } from "../services/system-log.service";

const PAGE_SIZE = 50;

export function SystemLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["system-logs", { page }],
    queryFn: () => systemLogService.listLogs(page, PAGE_SIZE),
  });

  if (isLoading) return <PageSpinner />;

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">System Logs</h2>
        {meta && (
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {meta.total} {meta.total === 1 ? "entry" : "entries"}
          </p>
        )}
      </div>

      {/* Table */}
      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Date</TableHeader>
              <TableHeader>User</TableHeader>
              <TableHeader>Action</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableEmpty colSpan={3} message="No log entries found." />
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="w-40 shrink-0 text-[var(--color-muted-foreground)]">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="w-36 shrink-0">
                    <span
                      title={log.userId}
                      className="font-mono text-xs text-[var(--color-muted-foreground)]"
                    >
                      {log.userId.slice(0, 8)}…
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-[var(--color-foreground)]">
                      {log.note}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrapper>

      {meta && <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />}
    </div>
  );
}
