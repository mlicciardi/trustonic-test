type QueryNoticeProps = {
  loading: boolean;
  errors: string[];
  hasData: boolean;
  loadingLabel: string;
  updatingLabel: string;
};

export function QueryNotice({
  loading,
  errors,
  hasData,
  loadingLabel,
  updatingLabel,
}: QueryNoticeProps) {
  return (
    <>
      {loading && !hasData ? (
        <p className="status" role="status">
          {loadingLabel}
        </p>
      ) : null}
      {loading && hasData ? (
        <p className="status" role="status">
          {updatingLabel}
        </p>
      ) : null}
      {errors.length > 0 ? (
        <div className={hasData ? 'banner warning' : 'banner error'} role={hasData ? 'status' : 'alert'}>
          <p>
            {hasData
              ? 'The server reported errors. The record below is what we can show.'
              : 'This request failed.'}
          </p>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
