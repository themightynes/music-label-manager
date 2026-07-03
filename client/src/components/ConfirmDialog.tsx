import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  emoji?: string;
  currentWeek?: number;
  onCancel?: () => void; // Optional separate cancel handler
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  emoji = '⚠️',
  currentWeek,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="glass-panel chromatic-hairline p-6 max-w-md w-full mx-4 relative text-white">
        {/* X button in top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="text-4xl mb-4">{emoji}</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
          <div className="text-sm text-white/70 mb-6">
            {description.split('\n').map((line, index) => (
              <p key={index} className={index > 0 ? 'mt-1' : ''}>
                {line.includes('Week') && currentWeek ? (
                  <>
                    {line.split('Week')[0]}
                    <span className="font-medium font-mono text-neon-lilac">Week {currentWeek}</span>
                    {line.split('Week')[1]?.replace(/\d+/, '')}
                  </>
                ) : (
                  line
                )}
              </p>
            ))}
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 rounded-button border-white/[0.09] bg-white/[0.02] text-white/75 hover:bg-white/[0.06] hover:text-white"
            >
              {cancelText}
            </Button>
            <Button
              variant={variant}
              onClick={onConfirm}
              className={`flex-1 text-white border-0 rounded-button ${
                variant === 'destructive'
                  ? 'bg-negative/90 hover:bg-negative shadow-glow-negative'
                  : 'bg-gradient-to-br from-action-pink to-action-purple shadow-action hover:opacity-95'
              }`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}