import { createFileRoute } from '@tanstack/react-router';

import { FormDesignerPage } from '@/features/forms/designer/FormDesignerPage';

export const Route = createFileRoute('/forms/$code/designer')({
  component: FormDesignerRoute,
});

function FormDesignerRoute() {
  const { code } = Route.useParams();
  return <FormDesignerPage code={code} />;
}
