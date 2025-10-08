import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { ArrowLeft, Palette, Heart } from 'lucide-react';

/**
 * UXPrototypesPage - Navigation hub for UI/UX prototypes
 *
 * This page provides access to various UI mockups and prototypes
 * for design review before implementing backend functionality.
 *
 * Task: 1.7 - Register MoodSystemPrototype in UXPrototypesPage
 */
export default function UXPrototypesPage() {
  const prototypes = [
    {
      id: 'mood-system',
      title: 'Artist Mood System',
      description: 'Complete mood management interface with history charts, event notifications, recommendations, and analytics',
      path: '/prototypes/mood-system',
      icon: Heart,
      status: 'active',
      tasks: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6']
    }
    // Future prototypes will be added here
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Palette className="w-8 h-8 text-brand-rose" />
              UI/UX Prototypes
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Visual mockups for design review before implementation
            </p>
          </div>
        </div>

        {/* Prototypes Grid */}
        <div className="grid gap-4">
          {prototypes.map(prototype => (
            <Card key={prototype.id} className="bg-sidebar border-white/10 hover:border-white/20 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <prototype.icon className="w-6 h-6 text-brand-gold" />
                  <span className="flex-1">{prototype.title}</span>
                  <Badge variant={prototype.status === 'active' ? 'default' : 'secondary'}>
                    {prototype.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-white/70">{prototype.description}</p>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/50">Tasks:</span>
                  {prototype.tasks.map(task => (
                    <Badge key={task} variant="outline" className="text-xs">
                      {task}
                    </Badge>
                  ))}
                </div>

                <Link href={prototype.path}>
                  <Button className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy-dark">
                    View Prototype
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="bg-brand-burgundy/10 border-brand-burgundy/30">
          <CardContent className="p-4">
            <h4 className="font-semibold text-white mb-2">About Prototypes</h4>
            <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
              <li>All prototypes use dummy/mock data - no backend integration</li>
              <li>Purpose: Validate UI/UX design before implementing functionality</li>
              <li>Feedback welcome via bug reports or team discussion</li>
              <li>Prototypes follow existing component patterns and brand guidelines</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
