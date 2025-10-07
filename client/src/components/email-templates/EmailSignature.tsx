import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EmailSignatureProps {
  sender: string;
  senderRoleId?: string | null;
}

// Executive profile mapping
const EXECUTIVE_PROFILES: Record<string, { image: string; title: string; initials: string }> = {
  head_ar: {
    image: '/avatars/marcus_rodriguez_exec@0.5x.png',
    title: 'Head of A&R',
    initials: 'MR',
  },
  cmo: {
    image: '/avatars/samara_chen_exec@0.5x.png',
    title: 'Chief Marketing Officer',
    initials: 'SC',
  },
  head_distribution: {
    image: '/avatars/patricia_williams_exec@0.5x.png',
    title: 'Head of Distribution & Operations',
    initials: 'PW',
  },
  cco: {
    image: '/avatars/dante_washingtong_exec@0.5x.png',
    title: 'Chief Creative Officer',
    initials: 'DW',
  },
};

export function EmailSignature({ sender, senderRoleId }: EmailSignatureProps) {
  const profile = senderRoleId ? EXECUTIVE_PROFILES[senderRoleId] : null;

  return (
    <div className="mt-6 pt-4 border-t border-white/10">
      <div className="flex items-center gap-3">
        {profile ? (
          <Avatar className="h-10 w-10 ring-2 ring-brand-purple/50">
            <AvatarImage src={profile.image} alt={sender} />
            <AvatarFallback className="bg-brand-mauve text-white text-sm font-semibold">
              {profile.initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-10 w-10 ring-2 ring-white/20">
            <AvatarFallback className="bg-brand-dark-mid text-white/60 text-sm font-semibold">
              {sender.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          <p className="text-sm font-semibold text-white">{sender}</p>
          {profile && (
            <p className="text-xs text-white/60">{profile.title}</p>
          )}
        </div>
      </div>
    </div>
  );
}
