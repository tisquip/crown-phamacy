import { useAuth } from "@/context/AuthContext";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userProfile, isLoading } = useAuth();
  const navigate = Route.useNavigate();
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!userProfile || !userProfile.isAdmin) {
    navigate({ to: "/" });
    return null;
  }
  return <Outlet />;
}
