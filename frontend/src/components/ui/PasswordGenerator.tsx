import { useState } from 'react';
import { Button } from './Button';

export function PasswordGenerator({ onGenerate }: { onGenerate: (value: string) => void }) {
  const [value, setValue] = useState('');

  const generate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()';
    const password = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setValue(password);
    onGenerate(password);
  };

  return (
    <div className="flex items-center gap-3">
      <input value={value} readOnly placeholder="Generated password" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-white/10 dark:bg-slate-800" />
      <Button type="button" variant="secondary" onClick={generate}>Generate</Button>
    </div>
  );
}
