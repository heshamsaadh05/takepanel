import { useEffect } from 'react';

export function useDocumentDirection(direction: 'ltr' | 'rtl') {
  useEffect(() => {
    document.documentElement.dir = direction;
  }, [direction]);
}
