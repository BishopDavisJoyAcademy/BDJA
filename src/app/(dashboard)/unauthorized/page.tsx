export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
        <p className="text-lg text-gray-600 mb-2">Unauthorized Access</p>
        <p className="text-sm text-gray-500">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}
