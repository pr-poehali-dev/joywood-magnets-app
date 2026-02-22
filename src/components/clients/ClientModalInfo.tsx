import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { Registration, formatPhone } from "./types";

interface Props {
  client: Registration;
  editing: boolean;
  editName: string;
  editPhone: string;
  savingEdit: boolean;
  onEditNameChange: (v: string) => void;
  onEditPhoneChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
}

const ClientModalInfo = ({
  client,
  editing,
  editName,
  editPhone,
  savingEdit,
  onEditNameChange,
  onEditPhoneChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
}: Props) => {
  if (editing) {
    return (
      <div className="flex items-end gap-3 flex-wrap bg-slate-50 rounded-lg p-4">
        <div className="space-y-1 flex-1 min-w-[150px]">
          <Label className="text-xs">Имя</Label>
          <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} placeholder="Имя клиента" className="h-8 text-sm" />
        </div>
        <div className="space-y-1 flex-1 min-w-[150px]">
          <Label className="text-xs">Телефон</Label>
          <Input value={editPhone} onChange={(e) => onEditPhoneChange(formatPhone(e.target.value))} placeholder="+7 (___) ___-__-__" className="h-8 text-sm" />
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" className="h-8 gap-1" disabled={savingEdit} onClick={onSaveEdit}>
            {savingEdit ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
            Сохранить
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={onCancelEdit}>Отмена</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 flex-wrap text-sm bg-slate-50 rounded-lg px-4 py-3">
      {client.phone && (
        <div className="flex items-center gap-1.5">
          <Icon name="Phone" size={14} className="text-muted-foreground" />{client.phone}
        </div>
      )}
      {client.ozon_order_code && (
        <div className="flex items-center gap-1.5">
          <Icon name="Package" size={14} className="text-blue-500" />Ozon: <strong>{client.ozon_order_code}</strong>
        </div>
      )}
      {client.total_amount > 0 && (
        <div className="flex items-center gap-1.5">
          <Icon name="Banknote" size={14} className="text-green-600" /><strong>{client.total_amount.toLocaleString("ru-RU")} ₽</strong>
        </div>
      )}
      <div className="flex gap-1.5 ml-auto">
        {client.phone && (
          <a href={`/my-collection?phone=${encodeURIComponent(client.phone)}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 gap-1">
              <Icon name="Eye" size={12} />Коллекция
            </Button>
          </a>
        )}
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={onStartEdit}>
          <Icon name="Pencil" size={12} />Редактировать
        </Button>
        {client.phone && (
          <a href={`https://t.me/+${client.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 gap-1">
              <Icon name="Send" size={12} />Telegram
            </Button>
          </a>
        )}
        {client.phone && (
          <a href={`https://max.ru/+${client.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-purple-500 hover:text-purple-700 hover:bg-purple-50 gap-1">
              <Icon name="MessageCircle" size={12} />Max
            </Button>
          </a>
        )}
      </div>
    </div>
  );
};

export default ClientModalInfo;