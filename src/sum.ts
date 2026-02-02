export function sum(a: unknown, b: unknown): number {
    const toNumber = (v: unknown): number => {
      if (typeof v === 'bigint') return Number(v);
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (v instanceof Date) return v.getTime();
      throw new TypeError('Invalid operand');
    };
    const x = toNumber(a);
    const y = toNumber(b);
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw new TypeError('Non‑finite operand');
    return x + y;
  }