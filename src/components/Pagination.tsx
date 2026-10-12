import { pageCount } from '../domain/device';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pages = pageCount(total, pageSize);
  const nextDisabled = pages === 0 || page >= pages;

  return (
    <div className="pagination">
      <span>
        {total === 0 ? 'No results' : `Page ${page} of ${pages} · ${total} total`}
      </span>
      <div className="pagination-actions">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <button type="button" disabled={nextDisabled} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
