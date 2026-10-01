import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderTop: '1px solid #E2E8F0',
        background: '#FFFFFF',
        fontSize: 13,
        color: '#64748B',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div>
        Affichage de <strong style={{ color: '#0B162C' }}>{start}</strong> à <strong style={{ color: '#0B162C' }}>{end}</strong> sur <strong style={{ color: '#0B162C' }}>{total}</strong> résultats
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            background: page <= 1 ? '#F8FAFC' : '#FFFFFF',
            color: page <= 1 ? '#CBD5E1' : '#0B162C',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
          }}
          title="Page précédente"
        >
          <ChevronLeft size={16} />
        </button>

        <span style={{ padding: '0 8px', fontWeight: 600, color: '#0B162C' }}>
          Page {page} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            background: page >= totalPages ? '#F8FAFC' : '#FFFFFF',
            color: page >= totalPages ? '#CBD5E1' : '#0B162C',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
          }}
          title="Page suivante"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
