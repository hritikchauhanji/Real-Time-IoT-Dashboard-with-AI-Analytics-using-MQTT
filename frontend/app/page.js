import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">🏭 IoT Dashboard</h1>
        <p className="text-xl mb-8">
          Real-time sensor monitoring with AI analytics
        </p>
        <Link
          href="/dashboard"
          className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all inline-block"
        >
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}
