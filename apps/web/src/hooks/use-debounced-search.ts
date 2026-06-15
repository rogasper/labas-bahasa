import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

export function useDebouncedSearch(
  initialValue: string,
  delay = 300,
): [string, React.Dispatch<React.SetStateAction<string>>] {
  const [localSearch, setLocalSearch] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalSearch(initialValue); }, [initialValue]);

  return [localSearch, setLocalSearch];
}

export function useDebouncedNavigate(
  localSearch: string,
  searchText: string,
  navigate: ReturnType<typeof useNavigate>,
  extraParams?: Record<string, string | undefined>,
  delay = 300,
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (localSearch !== searchText) {
        navigate({ search: { search: localSearch || undefined, page: 1, ...extraParams } as any, replace: true });
      }
    }, delay);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [localSearch]);
}
