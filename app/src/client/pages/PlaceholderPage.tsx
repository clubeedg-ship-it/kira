import { Sparkles } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '../components/ui';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={<Sparkles className="h-10 w-10" />}
          title="Coming soon"
          description="This route is wired into the app shell and ready for the next task implementation."
        />
      </CardContent>
    </Card>
  );
}
