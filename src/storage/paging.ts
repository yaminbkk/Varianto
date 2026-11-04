/**
 * Reads every row of a query whose server caps the rows per response (Supabase returns at most
 * 1000 by default). `fetchPage(from, to)` returns the rows at those inclusive positions.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1)
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}
