import Navbar from '@/components/Navbar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
