import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";

interface Props {
  comment: string;
  savingComment: boolean;
  onCommentChange: (value: string) => void;
  onBack: () => void;
  onSave: () => void;
}

const MagnetNoGiftForm = ({ comment, savingComment, onCommentChange, onBack, onSave }: Props) => {
  return (
    <>
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
        <Icon name="AlertTriangle" size={16} className="text-red-500 mt-0.5 shrink-0" />
        <p className="text-sm text-red-700">Укажите причину — она сохранится в истории заказа</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Причина невыдачи магнита</label>
        <Textarea
          autoFocus
          placeholder="Например: клиент отказался, нет подходящей породы, уточнить позже..."
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          className="resize-none"
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="gap-1.5" onClick={onBack}>
          <Icon name="ArrowLeft" size={14} />
          Назад
        </Button>
        <Button
          className="flex-1 bg-red-500 hover:bg-red-600 gap-1.5"
          disabled={!comment.trim() || savingComment}
          onClick={onSave}
        >
          {savingComment
            ? <Icon name="Loader2" size={14} className="animate-spin" />
            : <Icon name="Save" size={14} />
          }
          Сохранить и закрыть
        </Button>
      </div>
    </>
  );
};

export default MagnetNoGiftForm;
