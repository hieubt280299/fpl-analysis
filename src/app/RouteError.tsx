import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { EmptyState } from '@/components/ui';

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <EmptyState
        title={title}
        action={
          <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
            Back to home
          </Link>
        }
      >
        {message}
      </EmptyState>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage title="Page not found" message="The page you are looking for does not exist." />
  );
}

/** Rendered by the router when a page throws while rendering or loading. */
export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  console.error(error);
  return (
    <ErrorPage
      title="Something went wrong"
      message="An unexpected error occurred. Reload the page to try again."
    />
  );
}
