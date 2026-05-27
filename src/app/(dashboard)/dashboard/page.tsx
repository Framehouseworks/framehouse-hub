import { redirect } from 'next/navigation'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const search = typeof params.search === 'string' ? params.search : undefined
  redirect(`/dashboard/library${search ? `?search=${encodeURIComponent(search)}` : ''}`)
}
