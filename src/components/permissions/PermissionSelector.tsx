"use client";

import { useState, useEffect } from "react";
import { usePermissionStore } from "@/stores/permissions";
import { PermissionCategory } from "@/types";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

interface PermissionSelectorProps {
  selectedIds?: string[];
  selected?: string[];
  onChange: (ids: string[]) => void;
}

export function PermissionSelector({ selectedIds, selected, onChange }: PermissionSelectorProps) {
  const resolvedSelected = selected ?? selectedIds ?? [];
  const { allPermissions, categories, isLoading, fetchPermissions } = usePermissionStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (allPermissions.length === 0) fetchPermissions();
  }, []);

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePermission = (id: string) => {
    onChange(
      resolvedSelected.includes(id)
        ? resolvedSelected.filter((sid) => sid !== id)
        : [...resolvedSelected, id]
    );
  };

  const toggleAllInCategory = (catKey: string, permIds: string[]) => {
    const allSelected = permIds.every((id) => resolvedSelected.includes(id));
    if (allSelected) {
      onChange(resolvedSelected.filter((sid) => !permIds.includes(sid)));
    } else {
      onChange(Array.from(new Set([...resolvedSelected, ...permIds])));
    }
  };

  const permissionsByCategory = categories.map((cat) => ({
    ...cat,
    permissions: allPermissions.filter((p) => p.category === cat.key),
  }));

  if (isLoading) return <p className="text-sm text-gray-500">Loading permissions...</p>;

  return (
    <div className="space-y-3">
      {permissionsByCategory.map((cat) => {
        const permIds = cat.permissions.map((p) => p.id);
        const allSelected = permIds.length > 0 && permIds.every((id) => resolvedSelected.includes(id));
        const someSelected = permIds.some((id) => resolvedSelected.includes(id)) && !allSelected;
        const isExpanded = expandedCategories.has(cat.key);

        return (
          <div key={cat.key} className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(cat.key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllInCategory(cat.key, permIds);
                  }}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      allSelected
                        ? "bg-bdja-primary border-bdja-primary"
                        : someSelected
                        ? "bg-bdja-primary/50 border-bdja-primary"
                        : "border-gray-300"
                    }`}
                  >
                    {(allSelected || someSelected) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-medium text-gray-900">{cat.name}</span>
                </label>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {isExpanded && (
              <div className="px-4 py-3 space-y-2 bg-white">
                {cat.permissions.map((perm) => (
                  <label
                    key={perm.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        resolvedSelected.includes(perm.id)
                          ? "bg-bdja-primary border-bdja-primary"
                          : "border-gray-300"
                      }`}
                    >
                      {resolvedSelected.includes(perm.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={resolvedSelected.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{perm.name}</p>
                      {perm.description && (
                        <p className="text-xs text-gray-500">{perm.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
