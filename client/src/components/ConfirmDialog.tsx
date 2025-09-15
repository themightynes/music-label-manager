import { Button } from '@/components/ui/button';

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
  currentMonth?: number;
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
  currentMonth
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2C222A] border border-[#4e324c] rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-4xl mb-4">{emoji}</div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <div className="text-sm text-white/70 mb-6">
            {description.split('\n').map((line, index) => (
              <p key={index} className={index > 0 ? 'mt-1' : ''}>
                {line.includes('Month') && currentMonth ? (
                  <>
                    {line.split('Month')[0]}
                    <span className="font-medium text-[#A75A5B]">Month {currentMonth}</span>
                    {line.split('Month')[1]?.replace(/\d+/, '')}
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
              onClick={onClose}
              className="flex-1 bg-[#23121c] border border-[#4e324c] text-white hover:bg-[#2a1923]"
            >
              {cancelText}
            </Button>
            <Button
              variant={variant}
              onClick={onConfirm}
              className={`flex-1 text-white border-0 ${
                variant === 'destructive'
                  ? 'bg-[#A75A5B] hover:bg-[#D99696]'
                  : 'bg-[#4A9B8E] hover:bg-[#5CB3A4]'
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