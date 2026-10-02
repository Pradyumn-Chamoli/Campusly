import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Spinner from "./ui/Spinner";
import EmptyState from "./ui/EmptyState";
import { Button } from "./ui/Button";

// Pass `role` to restrict a route to one user role (e.g. role="ADMIN").
// The backend enforces authorization regardless — this only shapes what
// the UI shows before a request is made.
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-campus-green" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <EmptyState
          icon="🔒"
          title="You don't have access to this page"
          description="This area is restricted to administrators."
          action={
            <Link to="/">
              <Button variant="secondary">Back to home</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return children;
}
