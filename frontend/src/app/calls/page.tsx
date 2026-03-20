"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Search, Phone, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, type CallListResponse } from "@/lib/api";
import { formatDate, formatDuration, outcomeColor, sentimentColor } from "@/lib/utils";

export default function CallsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [outcomeFilter, setOutcomeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const params: Record<string, string> = { page: String(page), page_size: "15" };
  if (outcomeFilter) params.outcome = outcomeFilter;
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useQuery<CallListResponse>({
    queryKey: ["calls", params],
    queryFn: () => api.calls.list(params),
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.calls.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const formData = new FormData();
      formData.append("file", file);
      uploadMutation.mutate(formData);
    });
    e.target.value = "";
  };

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-n-900">Call Explorer</h1>
          <p className="mt-1 text-n-500">Browse, upload, and analyze call recordings</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.ogg,.flac,.webm"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="h-4 w-4" />
            {uploadMutation.isPending ? "Uploading..." : "Upload Calls"}
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <select
          value={outcomeFilter}
          onChange={(e) => { setOutcomeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border-n-200 bg-white px-3 py-2 text-sm text-n-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
        >
          <option value="">All Outcomes</option>
          <option value="purchase">Purchase</option>
          <option value="no_purchase">No Purchase</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border-n-200 bg-white px-3 py-2 text-sm text-n-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="uploaded">Uploaded</option>
          <option value="transcribing">Transcribing</option>
          <option value="transcribed">Transcribed</option>
          <option value="analyzing">Analyzing</option>
          <option value="analyzed">Analyzed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-n-200 border-t-brand-600" />
        </div>
      ) : (
        <>
          {data?.calls.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-n-300" />
                <p className="mt-4 text-lg font-medium text-n-500">No calls found</p>
                <p className="mt-1 text-sm text-n-400">Upload audio files to get started</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-n-100">
                  {data?.calls.map((call) => (
                    <Link key={call.id} href={`/calls/${call.id}`} className="block">
                      <div className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-n-50">
                        <Phone className="h-4 w-4 flex-shrink-0 text-n-400" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-n-900">{call.original_filename}</p>
                          <p className="text-xs text-n-500">
                            {formatDate(call.created_at)} &middot; {formatDuration(call.duration_seconds)}
                          </p>
                        </div>
                        <Badge variant={call.status === "analyzed" ? "success" : "secondary"}>
                          {call.status}
                        </Badge>
                        <Badge className={outcomeColor(call.outcome)}>
                          {call.outcome.replace("_", " ")}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-n-500">
                Showing {((page - 1) * (data?.page_size || 15)) + 1}–
                {Math.min(page * (data?.page_size || 15), data?.total || 0)} of {data?.total} calls
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
