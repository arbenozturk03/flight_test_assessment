import { useState, useEffect, useRef, useCallback } from 'react';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (v: string) => void;
  debounceMs?: number;
}

export function DebouncedInput({
  value: propValue,
  onValueChange,
  debounceMs = 300,
  ...rest
}: DebouncedInputProps) {
  const [local, setLocal] = useState(propValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  useEffect(() => {
    setLocal(propValue);
  }, [propValue]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setLocal(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onValueChangeRef.current(next);
      }, debounceMs);
    },
    [debounceMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return <input {...rest} value={local} onChange={handleChange} />;
}

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (v: string) => void;
  debounceMs?: number;
}

export function DebouncedTextarea({
  value: propValue,
  onValueChange,
  debounceMs = 300,
  ...rest
}: DebouncedTextareaProps) {
  const [local, setLocal] = useState(propValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  useEffect(() => {
    setLocal(propValue);
  }, [propValue]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setLocal(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onValueChangeRef.current(next);
      }, debounceMs);
    },
    [debounceMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return <textarea {...rest} value={local} onChange={handleChange} />;
}
