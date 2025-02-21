"use client";

import React, { useState, useEffect, useMemo } from "react";
import Papa, { ParseResult } from "papaparse";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CSVViewerProps {
  blob: Blob;
  searchTerm?: string;
}

export function CSVViewer({ blob, searchTerm = "" }: CSVViewerProps) {
  const [data, setData] = useState<Array<Array<string>>>([]);
  const [headers, setHeaders] = useState<Array<string>>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const parseCSV = async () => {
      try {
        const text = await blob.text();
        Papa.parse(text, {
          complete: (results: ParseResult<string[]>) => {
            if (results.data && results.data.length > 0) {
              const headers = results.data[0];
              const rows = results.data.slice(1);
              setHeaders(headers);
              setData(rows);
            }
            setLoading(false);
          },
          skipEmptyLines: true,
        });
      } catch (err) {
        setError(
          `Error reading file: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        setLoading(false);
      }
    };

    parseCSV();
  }, [blob]);

  const filteredAndSortedData = useMemo(() => {
    let processedData = [...data];

    if (searchTerm) {
      processedData = processedData.filter((row) =>
        row.some((cell) =>
          String(cell).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortColumn !== null) {
      processedData.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return processedData;
  }, [data, searchTerm, sortColumn, sortDirection]);

  if (loading) {
    return (
      <div className="mx-4 my-2">
        <div className="flex items-center justify-center p-8 h-full bg-gray-800/50 rounded-lg backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-gray-400">Loading CSV data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-4 my-2">
        <div className="p-6 text-red-400 bg-red-900/20 rounded-lg border border-red-900/50 shadow-inner backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="mx-4 my-2">
        <div className="p-6 text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-center space-x-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <span>No data found in the CSV file.</span>
          </div>
        </div>
      </div>
    );
  }

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnIndex);
      setSortDirection("asc");
    }
  };

  return (
    <div className="mx-4 my-2">
      <div className="flex flex-col rounded-lg border border-gray-700 bg-gray-800/50 backdrop-blur-sm">
        <ScrollArea className="h-[calc(100vh-10rem)] w-full">
          <div className="min-w-max h-full">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-800/90 backdrop-blur-sm z-10 shadow-sm">
                <TableRow>
                  {headers.map((header, index) => (
                    <TableHead
                      key={index}
                      className="bg-gray-800/90 text-gray-200 cursor-pointer hover:bg-gray-700/80 whitespace-nowrap transition-colors duration-200 first:rounded-tl-lg last:rounded-tr-lg px-4 group"
                      onClick={() => handleSort(index)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{header}</span>
                        <div className="flex flex-col opacity-70 transition-opacity group-hover:opacity-100">
                          <ChevronUp
                            className={`h-3 w-3 transition-colors duration-200 ${
                              sortColumn === index && sortDirection === "asc"
                                ? "text-blue-400"
                                : "text-gray-500 group-hover:text-gray-400"
                            }`}
                          />
                          <ChevronDown
                            className={`h-3 w-3 transition-colors duration-200 ${
                              sortColumn === index && sortDirection === "desc"
                                ? "text-blue-400"
                                : "text-gray-500 group-hover:text-gray-400"
                            }`}
                          />
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className={`border-gray-700 hover:bg-gray-700/30 transition-colors duration-200 ${
                      rowIndex % 2 === 0 ? "bg-gray-800/20" : "bg-transparent"
                    }`}
                  >
                    {row.map((cell, cellIndex) => (
                      <TableCell
                        key={cellIndex}
                        className="text-gray-300 border-gray-700 whitespace-nowrap px-4 py-2"
                      >
                        {cell?.toString() || ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        <div className="sticky bottom-0 p-4 text-sm text-gray-400 border-t border-gray-700 bg-gray-800/90 backdrop-blur-sm rounded-b-lg shadow-md">
          <div className="flex items-center justify-between">
            <span>
              Showing {filteredAndSortedData.length} of {data.length} rows
            </span>
            {searchTerm && (
              <span className="text-blue-400">
                Filtered by: &quot;{searchTerm}&quot;
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
